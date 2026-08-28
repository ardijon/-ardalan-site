import { NextResponse } from 'next/server'
import { checkSession } from '@/lib/admin-auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { extractClientKey } from '@/lib/request-ip'

const paymentInfoRateLimiter = createRateLimiter({
  namespace: 'payment-info',
  maxAttempts: 30,
  windowMs: 5 * 60 * 1000,
})

/**
 * Payment info for the purchase form.
 *
 * Rate limited to prevent scraping. Admin session bypasses rate limit.
 * The purchase form can also pass a short-lived token from the product page load.
 */
export async function GET(request) {
  // Admin session bypasses rate limit
  const isAdmin = await checkSession(request)

  if (!isAdmin) {
    const ip = extractClientKey(request)
    const rateLimitResult = await paymentInfoRateLimiter.check(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌ها بیش از حد مجاز است' },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
      )
    }
  }

  return NextResponse.json({
    bankName: process.env.BANK_NAME || '',
    cardNumber: process.env.CARD_NUMBER || '',
    accountHolder: process.env.ACCOUNT_HOLDER || '',
  })
}
