import { NextResponse } from 'next/server'
import { generateOtp, storeOtp, verifyOtp, sendOtpViaTelegram } from '@/lib/otp'
import { recordAudit, auditSummary, AUDIT_ACTORS } from '@/lib/audit'
import {
  checkBasicAuth,
  checkCsrf,
  createSessionToken,
  attachSessionCookie,
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetAttempts,
} from '@/lib/admin-auth'

/**
 * Count a failed attempt, and log it only if it was the last one allowed.
 *
 * Wrapped rather than inlined because all three failure paths — the password check
 * in each handler and the OTP check in PATCH — feed the same limiter, and a block
 * recorded from only two of them is a hole in the first place you would look.
 *
 * What is deliberately *not* here is a row per guess: that would be one KV write
 * per attempt, which hands an attacker a way to exhaust the daily write quota and
 * take the orders collection down through the logging.
 */
async function noteFailedAttempt(ip) {
  if (!(await recordFailedAttempt(ip))) return
  await recordAudit({
    action: 'auth.blocked',
    actor: AUDIT_ACTORS.SYSTEM,
    ip,
    summary: auditSummary.blocked(ip),
  })
}

// POST /api/admin/otp — verify credentials and send the OTP
export async function POST(request) {
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Throttle before authenticating, so this endpoint cannot be used to
  // brute-force the password.
  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json(
      { error: 'تلاش‌های ناموفق بیش از حد. ۱۵ دقیقه بعد دوباره تلاش کنید.' },
      { status: 429 }
    )
  }

  if (!(await checkBasicAuth(request))) {
    await noteFailedAttempt(ip)
    return NextResponse.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, { status: 401 })
  }

  try {
    const otp = generateOtp()
    await storeOtp('admin', otp)

    const sent = await sendOtpViaTelegram(otp)
    if (!sent.ok) {
      return NextResponse.json({ error: otpSendError(sent) }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      // Pointing at the wrong place is worse than saying nothing: on a dev
      // machine with Telegram blocked the code is in the terminal, and an admin
      // told to check Telegram will wait for a message that never arrives.
      message: sent.viaConsole
        ? 'تلگرام در دسترس نیست — کد تایید در ترمینال سرور چاپ شد (فقط در حالت توسعه)'
        : 'کد تایید ارسال شد',
    })
  } catch (error) {
    console.error('[OTP] Send error:', error)
    return NextResponse.json({ error: 'خطا در ارسال کد تایید' }, { status: 500 })
  }
}

/**
 * Turns a send failure into something the admin can act on. The old code showed
 * one generic string for every cause, which made "you never messaged the bot"
 * indistinguishable from "the token is wrong".
 */
function otpSendError(sent) {
  const bot = sent.botUsername ? `@${sent.botUsername}` : 'ربات تلگرام'
  switch (sent.reason) {
    case 'not_configured':
      return 'تنظیمات تلگرام ناقص است: TELEGRAM_BOT_TOKEN یا ADMIN_TELEGRAM_ID تعریف نشده.'
    case 'chat_not_started':
      return `ابتدا در تلگرام ${bot} را باز کنید و /start بزنید. ربات تا قبل از آن اجازه ندارد به شما پیام بدهد.`
    case 'bot_blocked':
      return `شما ${bot} را بلاک کرده‌اید. آن را آنبلاک کنید و دوباره تلاش کنید.`
    case 'bad_token':
      return 'توکن ربات تلگرام معتبر نیست. TELEGRAM_BOT_TOKEN را بررسی کنید.'
    case 'network':
      return 'دسترسی سرور به تلگرام برقرار نشد. اتصال شبکه را بررسی کنید.'
    default:
      return `خطای تلگرام: ${sent.description || 'نامشخص'}`
  }
}

// PATCH /api/admin/otp — verify the OTP and issue the admin session cookie
export async function PATCH(request) {
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const ip = getClientIp(request)
  if (!(await checkRateLimit(ip))) {
    return NextResponse.json(
      { error: 'تلاش‌های ناموفق بیش از حد. ۱۵ دقیقه بعد دوباره تلاش کنید.' },
      { status: 429 }
    )
  }

  if (!(await checkBasicAuth(request))) {
    await noteFailedAttempt(ip)
    return NextResponse.json({ error: 'نام کاربری یا رمز عبور اشتباه است' }, { status: 401 })
  }

  try {
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'کد تایید را وارد کنید' }, { status: 400 })
    }

    const result = await verifyOtp('admin', code.trim())

    if (!result.valid) {
      await noteFailedAttempt(ip)
      const errors = {
        no_otp: 'کد تایید ارسال نشده است',
        expired: 'کد تایید منقضی شده است',
        invalid: 'کد تایید اشتباه است',
        max_attempts: 'تعداد تلاش‌ها بیش از حد مجاز است',
      }
      return NextResponse.json({ error: errors[result.error] || 'کد نامعتبر' }, { status: 401 })
    }

    // OTP passed — this is the only place an admin session is minted.
    const token = await createSessionToken()
    if (!token) {
      return NextResponse.json({ error: 'تنظیمات سرور ناقص است' }, { status: 500 })
    }

    await resetAttempts(ip)

    // The IP is recorded here and nowhere else on an admin action, because this is
    // the one row where it answers a question: a login from an address you do not
    // recognise is the whole reason to keep a log like this.
    await recordAudit({
      action: 'auth.login',
      ip,
      summary: auditSummary.login(),
    })

    return attachSessionCookie(
      NextResponse.json({ success: true, message: 'تایید شد' }),
      token
    )
  } catch (error) {
    console.error('[OTP] Verify error:', error)
    return NextResponse.json({ error: 'خطا در تایید کد' }, { status: 500 })
  }
}
