import crypto from 'crypto'
import { getDoc, putDoc, deleteDoc } from '@/lib/storage'

/**
 * Admin login OTP.
 *
 * This used to be a module-level `Map`. On Cloudflare Workers each request may
 * run in a different isolate, so the isolate that ran `storeOtp()` was usually
 * not the isolate that ran `verifyOtp()` — the code was never found and admin
 * login could not succeed in production at all.
 *
 * Codes now live in the storage layer (Cloudflare KV in production, in-memory
 * locally), which is shared across isolates and expires entries natively.
 */

const OTP_EXPIRY_MS = 2 * 60 * 1000 // 2 minutes
const MAX_ATTEMPTS = 5

function otpKey(id) {
  return `otp:${id}`
}

export function generateOtp() {
  return String(crypto.randomInt(100000, 999999))
}

export async function storeOtp(id, otp) {
  await putDoc(
    otpKey(id),
    { otp, createdAt: Date.now(), attempts: 0 },
    // Give storage a little slack past the logical expiry so we can still
    // return a precise "expired" message rather than a vague "no code sent".
    { ttlSeconds: Math.ceil(OTP_EXPIRY_MS / 1000) + 60 }
  )
}

export async function verifyOtp(id, inputOtp) {
  const key = otpKey(id)
  const record = await getDoc(key)
  if (!record) return { valid: false, error: 'no_otp' }

  if (Date.now() - record.createdAt > OTP_EXPIRY_MS) {
    await deleteDoc(key)
    return { valid: false, error: 'expired' }
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await deleteDoc(key)
    return { valid: false, error: 'max_attempts' }
  }

  if (record.otp !== inputOtp) {
    // Persist the attempt count, otherwise the limit above can never be
    // reached and the code could be guessed indefinitely.
    await putDoc(
      key,
      { ...record, attempts: record.attempts + 1 },
      { ttlSeconds: Math.ceil(OTP_EXPIRY_MS / 1000) + 60 }
    )
    return { valid: false, error: 'invalid' }
  }

  // Single use.
  await deleteDoc(key)
  return { valid: true }
}

/**
 * Sends the OTP to the admin's Telegram chat.
 *
 * Returns `{ ok }` plus a `reason` the caller can turn into an actionable
 * message. It used to return bare `res.ok`, which discarded Telegram's
 * `description` field — so a misconfiguration surfaced in the panel as
 * "خطا در ارسال کد تایید" with nothing in the logs to explain it.
 */
export async function sendOtpViaTelegram(otp) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.ADMIN_TELEGRAM_ID

  if (!token || !chatId) {
    console.error('[OTP] TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_ID not set')
    return devFallback(otp) || { ok: false, reason: 'not_configured' }
  }

  const message = `🔐 کد تایید ورود به پنل مدیریت:\n\n${otp}\n\n⏰ اعتبار: ۲ دقیقه`

  let body
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    })
    body = await res.json().catch(() => null)
  } catch (error) {
    // Telegram is unreachable — blocked network, no egress, DNS failure.
    console.error('[OTP] Telegram request failed:', error.message)
    return devFallback(otp) || { ok: false, reason: 'network' }
  }

  // Telegram signals application errors in the payload, not only via HTTP
  // status, so `res.ok` alone was not a reliable success check.
  if (body?.ok) return { ok: true }

  const description = body?.description || 'unknown error'
  console.error('[OTP] Telegram rejected sendMessage:', description)

  // A bot cannot open a conversation — the admin must message it first.
  if (/chat not found/i.test(description)) {
    return { ok: false, reason: 'chat_not_started', botUsername: await getBotUsername(token) }
  }
  if (/unauthorized/i.test(description)) {
    return { ok: false, reason: 'bad_token' }
  }
  if (/blocked/i.test(description)) {
    return { ok: false, reason: 'bot_blocked', botUsername: await getBotUsername(token) }
  }
  return { ok: false, reason: 'telegram_error', description }
}

/**
 * Last resort on a dev machine: print the code to the terminal.
 *
 * api.telegram.org is not reachable from Iran without a VPN, so `next dev` fails
 * the login for a reason that has nothing to do with the app — and the admin
 * panel becomes untestable exactly when it is being worked on. Whoever is running
 * the dev server already has .env.local open, so seeing the code in their own
 * terminal grants them nothing they did not already have.
 *
 * Two deliberate limits. It only covers the cases where no request reached
 * Telegram at all (unreachable, or no token configured) — `chat not found` and a
 * bad token are real misconfigurations that must keep surfacing as errors, since
 * they prove the network is fine. And it is gated on NODE_ENV, which `next build`
 * inlines as the literal 'production' in the Worker bundle, so no environment
 * variable set on the deployed Worker can switch it back on.
 *
 * @returns {{ok: true, viaConsole: true}|null} null in production, so callers can
 *   write `devFallback(otp) || realError`.
 */
function devFallback(otp) {
  if (process.env.NODE_ENV === 'production') return null

  console.warn(
    `\n[OTP] ────────────────────────────────────────\n` +
    `[OTP] Telegram unavailable — dev login code: ${otp}\n` +
    `[OTP] Valid for 2 minutes. Never printed in production.\n` +
    `[OTP] ────────────────────────────────────────\n`
  )
  return { ok: true, viaConsole: true }
}

/**
 * Only called on the misconfiguration path, to name the bot the admin has to
 * open. Best effort — a null username just yields a slightly vaguer message.
 */
async function getBotUsername(token) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const body = await res.json()
    return body?.result?.username ?? null
  } catch {
    return null
  }
}
