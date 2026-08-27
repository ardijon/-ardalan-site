/**
 * Best-effort admin notifications over Telegram.
 *
 * Four places in the app talk to Telegram, with two genuinely different failure
 * policies. `lib/otp.js` and `api/send-message` must report a failed send — the
 * login and the contact form have nothing else to deliver. Everything else is a
 * ping about something that already succeeded and was already persisted, where a
 * missing bot token must not turn into an error the visitor sees.
 *
 * This module owns the second policy only. It never throws and never returns a
 * reason to act on: the caller has already done the work that mattered.
 *
 * Messages are sent as HTML, so every interpolated value has to go through
 * `escapeHtml`. That is not cosmetic — without a parse mode, escaping would leak
 * literal `&amp;` into the message text instead.
 */

const API_BASE = 'https://api.telegram.org'

export function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

/**
 * @param {string[]|string} message  Lines are joined with newlines. Values coming
 *   from a visitor must already be escaped by the caller.
 * @param {string} [label]  Prefixes the console line when a send fails, so a
 *   silent notification can still be traced to the route that wanted it.
 * @returns {Promise<boolean>} whether Telegram accepted it — for logging, not for
 *   deciding the response status.
 */
export async function notifyAdmin(message, label = 'telegram') {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.warn(`[${label}] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — notification skipped`)
    return false
  }

  const text = Array.isArray(message) ? message.join('\n') : String(message)

  try {
    const res = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        // The order and lead pings carry no links worth previewing, and a preview
        // card pushes the amount off the notification.
        disable_web_page_preview: true,
      }),
    })

    if (!res.ok) {
      // Telegram answers 200 with ok:false for most real problems, so the body is
      // where the reason is. A wrong chat_id looks like success otherwise.
      const body = await res.text().catch(() => '')
      console.error(`[${label}] Telegram rejected sendMessage:`, res.status, body.slice(0, 300))
      return false
    }
    return true
  } catch (error) {
    console.error(`[${label}] Telegram unreachable:`, error)
    return false
  }
}
