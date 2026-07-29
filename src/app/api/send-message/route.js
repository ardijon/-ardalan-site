import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const RATE_WINDOW_MS = 60 * 1000
const RATE_MAX = 3
const MAX_BUCKETS = 50_000
const buckets = new Map()

function pruneBuckets() {
  if (buckets.size <= MAX_BUCKETS) return
  const now = Date.now()
  for (const [k, v] of buckets.entries()) {
    const recent = v.filter(t => now - t < RATE_WINDOW_MS)
    if (recent.length === 0) buckets.delete(k)
    else buckets.set(k, recent)
  }
  if (buckets.size > MAX_BUCKETS) buckets.clear()
}

function ip(request) {
  if (request.ip) return request.ip
  const nf = request.headers.get('x-nf-client-connection-ip')
  if (nf) return nf
  const cf = request.headers.get('cf-connecting-ip')
  if (cf) return cf
  const xff = request.headers.get('x-forwarded-for') || ''
  if (xff) return xff.split(',').pop().trim() || 'unknown'
  const real = request.headers.get('x-real-ip')
  return real || 'unknown'
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

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

function checkRate(key) {
  const now = Date.now()
  const bucket = buckets.get(key) || []
  const recent = bucket.filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) return false
  recent.push(now)
  buckets.set(key, recent)
  return true
}

export async function POST(request) {
  pruneBuckets()
  if (!checkRate(ip(request))) {
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
  const text = `📬 پیام جدید از سایت\n\n👤 نام: ${escapeHtml(name)}\n📞 تلفن: ${escapeHtml(phone)}\n💬 پیام:\n${escapeHtml(message)}`

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
