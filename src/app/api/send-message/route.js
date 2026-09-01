import { NextResponse } from 'next/server'
import { extractClientKey } from '@/lib/request-ip'
import { createRateLimiter } from '@/lib/rate-limit'
import { checkCsrf } from '@/lib/admin-auth'

export const runtime = 'nodejs'

const contactRateLimiter = createRateLimiter({
  namespace: 'contact',
  maxAttempts: 3,
  windowMs: 60 * 1000,
})

function validate({ name, phone, message }) {
  const trimmed = {
    name: String(name || '').trim().slice(0, 100),
    phone: String(phone || '').trim().slice(0, 30),
    message: String(message || '').trim().slice(0, 1500),
  }
  const phoneDigits = trimmed.phone.replace(/\D/g, '')
  if (!trimmed.name) return { ok: false, error: 'نام الزامی است.' }
  if (phoneDigits.length < 8) return { ok: false, error: 'شماره تلفن نامعتبر است.' }
  if (!trimmed.message) return { ok: false, error: 'پیام نمی‌تواند خالی باشد.' }
  return { ok: true, data: trimmed }
}

export async function POST(request) {
  if (!checkCsrf(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  if (!(await contactRateLimiter.check(extractClientKey(request))).allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = validate(payload || {})
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return NextResponse.json({ error: 'Server is not configured to forward messages.' }, { status: 503 })
  }

  const { name, phone, message } = result.data
  // Sent WITHOUT a parse_mode, so Telegram renders raw text and there is nothing
  // to escape — escaping here is what produced literal «Tom &amp; Jerry» in the
  // owner's chat for every message containing & < >.
  const text = `📬 پیام جدید از سایت\n\n👤 نام: ${name}\n📞 تلفن: ${phone}\n💬 پیام:\n${message}`

  let tgRes
  try {
    tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch {
    return NextResponse.json({ error: 'Telegram unreachable' }, { status: 502 })
  }

  if (!tgRes.ok) {
    return NextResponse.json({ error: 'Telegram error' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
