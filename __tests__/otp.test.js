import { generateOtp, storeOtp, verifyOtp, sendOtpViaTelegram } from '@/lib/otp'

// storeOtp/verifyOtp became async when OTP codes moved out of a module-level
// Map into the storage layer (Cloudflare KV in production, in-memory locally).
// The behaviour asserted here is unchanged — only the calls are awaited.

describe('OTP', () => {
  describe('generateOtp', () => {
    it('should generate 6-digit OTP', () => {
      const otp = generateOtp()
      expect(otp).toMatch(/^\d{6}$/)
    })

    it('should generate different OTPs', () => {
      const otp1 = generateOtp()
      const otp2 = generateOtp()
      expect(otp1).not.toBe(otp2)
    })
  })

  describe('storeOtp and verifyOtp', () => {
    it('should verify correct OTP', async () => {
      await storeOtp('test-user', '123456')
      const result = await verifyOtp('test-user', '123456')
      expect(result.valid).toBe(true)
    })

    it('should reject wrong OTP', async () => {
      await storeOtp('test-user2', '123456')
      const result = await verifyOtp('test-user2', '000000')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid')
    })

    it('should reject when no OTP stored', async () => {
      const result = await verifyOtp('nonexistent', '123456')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('no_otp')
    })

    it('should reject after max attempts', async () => {
      await storeOtp('test-user3', '123456')
      for (let i = 0; i < 5; i++) {
        await verifyOtp('test-user3', '000000')
      }
      const result = await verifyOtp('test-user3', '123456')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('max_attempts')
    })

    it('should count failed attempts durably', async () => {
      // Regression guard: attempts used to be incremented on an object held in
      // a Map, so the counter was only kept by reference. Now each failure has
      // to be written back to storage, or the max-attempts limit above can
      // never be reached.
      await storeOtp('test-user5', '123456')
      await verifyOtp('test-user5', '000000')
      await verifyOtp('test-user5', '000000')
      const result = await verifyOtp('test-user5', '000000')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('invalid')

      // Two more failures reach the limit of 5.
      await verifyOtp('test-user5', '000000')
      await verifyOtp('test-user5', '000000')
      const limited = await verifyOtp('test-user5', '123456')
      expect(limited.error).toBe('max_attempts')
    })

    it('should delete OTP after successful verification', async () => {
      await storeOtp('test-user4', '123456')
      await verifyOtp('test-user4', '123456')
      const result = await verifyOtp('test-user4', '123456')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('no_otp')
    })
  })

  /**
   * api.telegram.org is not reachable from Iran without a VPN, so on a local
   * `next dev` the login used to fail with a network error and the panel could
   * not be opened at all. The fallback prints the code to the terminal instead.
   *
   * The assertion that matters here is the negative one: it must be impossible in
   * production, where printing a login code to a log would be a real hole.
   */
  describe('sendOtpViaTelegram — dev fallback', () => {
    const ORIGINAL_ENV = { ...process.env }

    beforeEach(() => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token'
      process.env.ADMIN_TELEGRAM_ID = '999'
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      process.env = { ...ORIGINAL_ENV }
      jest.restoreAllMocks()
    })

    it('falls back to the console when Telegram is unreachable in dev', async () => {
      process.env.NODE_ENV = 'development'
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      const sent = await sendOtpViaTelegram('424242')
      expect(sent).toEqual({ ok: true, viaConsole: true })
      // The code has to actually be somewhere the admin can read it.
      expect(console.warn.mock.calls.flat().join('')).toContain('424242')
    })

    it('never prints the code in production', async () => {
      process.env.NODE_ENV = 'production'
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

      const sent = await sendOtpViaTelegram('424242')
      expect(sent).toEqual({ ok: false, reason: 'network' })
      expect(console.warn.mock.calls.flat().join('')).not.toContain('424242')
    })

    it('covers a missing bot token in dev, but still fails in production', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN
      global.fetch = jest.fn()

      process.env.NODE_ENV = 'development'
      expect(await sendOtpViaTelegram('111111')).toEqual({ ok: true, viaConsole: true })

      process.env.NODE_ENV = 'production'
      expect(await sendOtpViaTelegram('111111')).toEqual({ ok: false, reason: 'not_configured' })

      // Neither path should have tried to call Telegram without a token.
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not swallow a misconfiguration that Telegram answered', async () => {
      // A reachable Telegram rejecting the send is a real problem to fix, so it
      // must keep surfacing as an error even in dev — the network is fine here.
      process.env.NODE_ENV = 'development'
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, description: 'Unauthorized' }),
      })

      const sent = await sendOtpViaTelegram('424242')
      expect(sent.ok).toBe(false)
      expect(sent.reason).toBe('bad_token')
    })

    it('reports a real success as a real success', async () => {
      process.env.NODE_ENV = 'development'
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })

      const sent = await sendOtpViaTelegram('424242')
      expect(sent).toEqual({ ok: true })
      // No viaConsole flag: the panel would otherwise tell the admin to look in a
      // terminal when the message is sitting in their Telegram.
      expect(sent.viaConsole).toBeUndefined()
    })
  })
})
