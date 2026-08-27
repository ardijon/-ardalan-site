import { notifyAdmin, isTelegramConfigured } from '@/lib/telegram'

/**
 * The point of these is the failure paths, not the happy one.
 *
 * notifyAdmin is called after an order has already been saved, so anything it
 * throws would turn a successful purchase into a 500 telling the buyer to try
 * again — and a second attempt means a second order row at a different unique
 * amount. "Never throws" is the contract, so it is what gets asserted.
 */

const ORIGINAL_ENV = { ...process.env }

let fetchMock

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token'
  process.env.TELEGRAM_CHAT_ID = '12345'
  fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"ok":true}' })
  global.fetch = fetchMock
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  jest.restoreAllMocks()
})

describe('isTelegramConfigured', () => {
  it('needs both the token and the chat id', () => {
    expect(isTelegramConfigured()).toBe(true)

    delete process.env.TELEGRAM_CHAT_ID
    expect(isTelegramConfigured()).toBe(false)
  })
})

describe('notifyAdmin', () => {
  it('sends the joined lines as HTML with previews off', async () => {
    const ok = await notifyAdmin(['🛒 <b>سفارش جدید</b>', '', '💰 14,900,523 تومان'], 'orders')

    expect(ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage')
    expect(init.method).toBe('POST')

    const payload = JSON.parse(init.body)
    expect(payload.chat_id).toBe('12345')
    expect(payload.text).toBe('🛒 <b>سفارش جدید</b>\n\n💰 14,900,523 تومان')
    // Without a parse mode, the escapeHtml the callers apply would show up as
    // literal &amp; in the message instead of doing anything.
    expect(payload.parse_mode).toBe('HTML')
    expect(payload.disable_web_page_preview).toBe(true)
  })

  it('accepts a plain string as well as lines', async () => {
    await notifyAdmin('یک خط')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toBe('یک خط')
  })

  it('does not call out when the bot is not configured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN

    expect(await notifyAdmin(['x'])).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns false instead of throwing when the network fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(notifyAdmin(['x'])).resolves.toBe(false)
  })

  it('returns false instead of throwing when Telegram rejects the call', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"ok":false,"description":"chat not found"}',
    })

    await expect(notifyAdmin(['x'])).resolves.toBe(false)
  })

  it('survives a response whose body cannot be read', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => { throw new Error('stream closed') },
    })

    await expect(notifyAdmin(['x'])).resolves.toBe(false)
  })

  it('keeps the bot token out of the message body', async () => {
    // The token is a secret that lives in the URL. A log line or an error path
    // that echoed the body must never be able to leak it.
    await notifyAdmin(['x'])
    expect(fetchMock.mock.calls[0][1].body).not.toContain('test-token')
  })
})
