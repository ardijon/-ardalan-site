'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminShell from '@/components/Admin/AdminShell'

// One tab per chunk: the old page eagerly imported all five tabs plus the site
// chrome before login, so every visitor to /admin downloaded the product
// editor, order tables and export logic just to type a username. ssr:false —
// the panel is auth-gated and reads no SSR data.
const Dashboard = dynamic(() => import('@/components/Admin/Dashboard'), { ssr: false, loading: () => <TabFallback /> })
const Leads = dynamic(() => import('@/components/Admin/Leads'), { ssr: false, loading: () => <TabFallback /> })
const Customers = dynamic(() => import('@/components/Admin/Customers'), { ssr: false, loading: () => <TabFallback /> })
const OrderManagement = dynamic(() => import('@/components/Admin/OrderManagement'), { ssr: false, loading: () => <TabFallback /> })
const ProductForm = dynamic(() => import('@/components/Admin/ProductForm'), { ssr: false })

function TabFallback() {
  return (
    <div className="p-8 text-center text-sm text-text-soft-40" role="status" aria-live="polite">
      در حال بارگذاری…
    </div>
  )
}

// The API rejects anything else, and it does so with a generic message. Checking
// here means the reason arrives before the round trip. Lowercase only — the
// server validates the same way, and mixed-case slugs make two distinct URLs.
const SLUG_PATTERN = /^[a-z0-9-]+$/

const STATUS_BADGES = {
  available: { label: 'موجود', className: 'bg-green-50 text-green-600 border-green-200' },
  coming_soon: { label: 'به‌زودی', className: 'bg-amber-50 text-amber-600 border-amber-200' },
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' })
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  // Bumped to force ProductForm to remount when the `editing` slug alone does not
  // change — clicking "محصول جدید" twice, for instance, has to clear the form.
  const [formNonce, setFormNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  // Opens on the dashboard: the first question on logging in is "is there anything
  // waiting for me", not "let me edit a product".
  const [activeTab, setActiveTab] = useState('dashboard')
  // Only for the rail badge. Whichever of the two tabs loads first reports it, so
  // the badge costs no request of its own.
  const [orderStats, setOrderStats] = useState({})
  // Same idea for the leads badge, reported by the leads tab itself. The dashboard
  // does not fetch leads, so this badge only appears after the tab is opened once —
  // acceptable, because a waitlist is not time-critical the way a new receipt is.
  const [leadStats, setLeadStats] = useState({})

  useEffect(() => {
    setMounted(true)
  }, [])

  function basicHeader() {
    // btoa throws on any non-Latin1 character — a Persian password broke login
    // with «خطا در اتصال» and nothing in the logs. UTF-8 bytes must be encoded,
    // which is what the server's UTF-8 decoding of Basic auth expects anyway.
    const bytes = new TextEncoder().encode(`${loginForm.user}:${loginForm.pass}`)
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    return { Authorization: `Basic ${btoa(bin)}` }
  }

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products', { credentials: 'same-origin' })
      if (!res.ok) {
        if (res.status === 401) setAuthed(false)
        setMessage('خطا در بارگذاری محصولات')
        return
      }
      const data = await res.json()
      // Guard: on an error payload this used to receive an object and then
      // crash on products.map(...)
      setProducts(Array.isArray(data) ? data : [])
    } catch {
      setMessage('خطا در بارگذاری محصولات')
    }
  }, [])

  // Restore an existing session cookie so a refresh does not force a full
  // user + pass + OTP re-login.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin/session', { credentials: 'same-origin' })
        if (!cancelled && res.ok) {
          const data = await res.json()
          if (data.authenticated) {
            setAuthed(true)
            await fetchProducts()
          }
        }
      } catch {
        // no existing session — show the login form
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })()
    return () => { cancelled = true }
  }, [fetchProducts])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      // This single call both validates the credentials and sends the OTP.
      const res = await fetch('/api/admin/otp', {
        method: 'POST',
        headers: basicHeader(),
        credentials: 'same-origin',
      })

      // Previously only status 401 was treated as failure, so a 429 or 500
      // advanced the user to the OTP step as if the password had been correct.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'ورود ناموفق بود')
        return
      }

      const data = await res.json().catch(() => ({}))
      setOtpStep(true)
      // The server's own wording, not a hardcoded "sent to Telegram": when
      // Telegram is unreachable in dev the code goes to the terminal instead, and
      // only the server knows which happened.
      setMessage(data.message || 'کد تایید ارسال شد')
    } catch {
      setMessage('خطا در اتصال')
    } finally {
      setLoading(false)
    }
  }

  async function resendOtp() {
    setMessage('')
    try {
      const res = await fetch('/api/admin/otp', {
        method: 'POST',
        headers: basicHeader(),
        credentials: 'same-origin',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || 'خطا در ارسال کد تایید')
      } else {
        setMessage(data.message || 'کد تایید ارسال شد')
      }
    } catch {
      setMessage('خطا در ارسال کد تایید')
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setOtpLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/otp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...basicHeader() },
        credentials: 'same-origin',
        body: JSON.stringify({ code: otpCode }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'کد تایید نادرست است')
        return
      }

      // The server has now set the session cookie; the password is no longer
      // needed client-side, so drop it from memory.
      setLoginForm(p => ({ ...p, pass: '' }))
      setOtpCode('')
      setOtpStep(false)
      setMessage('')
      setAuthed(true)
      await fetchProducts()
    } catch {
      setMessage('خطا در تایید کد')
    } finally {
      setOtpLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/session', { method: 'DELETE', credentials: 'same-origin' })
    } catch {
      // fall through — clear local state regardless
    }
    setAuthed(false)
    setProducts([])
    setLoginForm({ user: '', pass: '' })
    handleNew()
    setMessage('')
  }

  function handleEdit(product) {
    setEditing(product.slug)
    setMessage('')
  }

  function handleNew() {
    setEditing(null)
    // The nonce, not `editing`, is what actually clears a half-filled new form:
    // `editing` is already null in that case, so the key would not change.
    setFormNonce(n => n + 1)
    setMessage('')
  }

  async function handleSave(payload) {
    if (!SLUG_PATTERN.test(payload.slug)) {
      setMessage('خطا: Slug فقط می‌تواند شامل حروف انگلیسی، عدد و خط تیره باشد')
      return
    }

    setSaving(true)
    setMessage('')
    try {
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'ذخیره ناموفق بود')
      }
      setMessage(editing ? 'محصول ویرایش شد' : 'محصول جدید اضافه شد')
      // Stay on the product that was just created rather than clearing the form:
      // the warning list is still on screen, so whatever is missing can be filled
      // in without hunting for the product in the list again.
      setEditing(payload.slug)
      await fetchProducts()
    } catch (e) {
      setMessage('خطا: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(slug) {
    if (!confirm('مطمئنید می‌خواهید این محصول را حذف کنید؟')) return
    try {
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ slug }),
      })
      // This used to report success unconditionally, even on a failed delete.
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'حذف ناموفق بود')
      }
      if (editing === slug) handleNew()
      setMessage('محصول حذف شد')
      await fetchProducts()
    } catch (e) {
      setMessage('خطا در حذف محصول: ' + e.message)
    }
  }

  if (!mounted || checkingSession) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-text-soft-60">در حال بارگذاری...</div>
        </main>
        <Footer />
      </>
    )
  }

  if (!authed) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="w-full max-w-sm mx-auto px-5">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-soft-10 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-[var(--color-primary)]">ورود به پنل مدیریت</h1>
              <p className="mt-2 text-sm text-text-soft-50">فقط مدیران سیستم</p>
            </div>

            {!otpStep ? (
              <form onSubmit={handleLogin} className="space-y-4 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                {message && (
                  <div role="alert" className="px-4 py-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">
                    {message}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-text-soft-50 mb-2">نام کاربری</label>
                  <input
                    type="text"
                    placeholder="نام کاربری"
                    value={loginForm.user}
                    onChange={e => setLoginForm(p => ({ ...p, user: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-text-soft-40 focus:outline-none focus:ring-2 focus:ring-accent-soft-50 focus:border-[var(--color-accent)] transition-all"
                    dir="ltr"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-soft-50 mb-2">رمز عبور</label>
                  <input
                    type="password"
                    placeholder="رمز عبور"
                    value={loginForm.pass}
                    onChange={e => setLoginForm(p => ({ ...p, pass: e.target.value }))}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-text-soft-40 focus:outline-none focus:ring-2 focus:ring-accent-soft-50 focus:border-[var(--color-accent)] transition-all"
                    dir="ltr"
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !loginForm.user || !loginForm.pass}
                  className="w-full py-3 px-6 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-accent-soft-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-accent-soft-20"
                >
                  {loading ? 'در حال بررسی...' : 'ورود'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
                {message && (
                  <div role="status" aria-live="polite" className={`px-4 py-3 text-sm rounded-xl border ${
                    message.includes('ارسال شد') || message.includes('تایید شد')
                      ? 'bg-green-50 text-green-600 border-green-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-soft-10 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-text-soft-60">کد ۶ رقمی به تلگرام شما ارسال شد</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-soft-50 mb-2">کد تایید</label>
                  <input
                    type="text"
                    placeholder="۶ رقمی"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-text-soft-40 focus:outline-none focus:ring-2 focus:ring-accent-soft-50 focus:border-[var(--color-accent)] transition-all text-center font-mono text-lg tracking-[0.5em]"
                    dir="ltr"
                    autoFocus
                    inputMode="numeric"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full py-3 px-6 text-sm font-bold text-white bg-[var(--color-accent)] rounded-xl hover:bg-accent-soft-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-accent-soft-20"
                >
                  {otpLoading ? 'در حال تایید...' : 'تایید'}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setOtpStep(false); setMessage(''); setOtpCode('') }}
                    className="flex-1 py-2 text-sm font-medium text-text-soft-60 border border-[var(--color-border)] rounded-xl hover:bg-text-soft-5 transition-colors"
                  >
                    بازگشت
                  </button>
                  <button
                    type="button"
                    onClick={resendOtp}
                    className="flex-1 py-2 text-sm font-medium text-[var(--color-accent)] border border-accent-soft-30 rounded-xl hover:bg-accent-soft-5 transition-colors"
                  >
                    ارسال مجدد
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-text-soft-30">
              اطلاعات ورود از متغیرهای محیطی خوانده می‌شود
            </p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    // No Header/Footer and no max-w wrapper here on purpose: the panel is an app,
    // not a page of the site. AdminShell owns the viewport instead, so the content
    // gets the full width a table wants and the full height a list wants.
    <AdminShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      counts={{ orders: orderStats.receiptUploaded || 0, leads: leadStats.pending || 0 }}
      onLogout={handleLogout}
      actions={
        activeTab === 'products' && (
          <button
            onClick={handleNew}
            className="h-9 px-3 text-xs font-medium text-white bg-[var(--color-accent)] rounded-lg hover:bg-accent-soft-90 transition-colors shrink-0"
          >
            + محصول جدید
          </button>
        )
      }
    >
      {message && (
        <div role="status" aria-live="polite" className="mb-3 px-4 py-2.5 text-sm rounded-xl bg-orange-50 text-orange-700 border border-orange-200">
          {message}
        </div>
      )}

      {activeTab === 'dashboard' && (
        <Dashboard
          auth={authed}
          products={products}
          onStats={setOrderStats}
          onGoToOrders={() => setActiveTab('orders')}
        />
      )}

      {activeTab === 'orders' && <OrderManagement auth={authed} onStats={setOrderStats} />}

      {activeTab === 'leads' && (
        // products is passed so the filter chips can show real product names
        // instead of slugs — the catalogue is already loaded for the products tab.
        <Leads auth={authed} products={products} onStats={setLeadStats} />
      )}

      {activeTab === 'customers' && <Customers auth={authed} products={products} />}

      {activeTab === 'products' && (
        // 4/8 rather than thirds: the form is the working surface and the list is
        // only for picking what to work on, so on a wide monitor the extra pixels
        // belong to the form's paired fa/en fields.
        <div className="grid xl:grid-cols-12 gap-4">
          <div className="xl:col-span-4 space-y-2">
            {/* Sorted by tier so the list reads in the same order as the store
                ladder — an untiered product sorts last there too. */}
            {[...products]
              .sort((a, b) => (a.tier ?? 99) - (b.tier ?? 99))
              .map(p => {
                const badge = STATUS_BADGES[p.status] || STATUS_BADGES.available
                return (
                  <div
                    key={p.slug}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      editing === p.slug
                        ? 'border-[var(--color-accent)] bg-accent-soft-5'
                        : 'border-[var(--color-border)] hover:border-accent-soft-30'
                    }`}
                    onClick={() => handleEdit(p)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[var(--color-primary)] truncate">{p.title?.fa || p.slug}</h3>
                        <p className="text-xs text-text-soft-50 mt-0.5 truncate" dir="ltr">{p.title?.en}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded border ${badge.className}`}>{badge.label}</span>
                          {p.featured && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded border bg-accent-soft-10 text-[var(--color-accent)] border-accent-soft-30">شاخص</span>
                          )}
                          {p.tier != null && (
                            <span className="text-[10px] text-text-soft-40">سطح {p.tier}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(p.slug) }}
                        className="text-red-400 hover:text-red-600 text-xs shrink-0"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="xl:col-span-8">
            {/* Remounted on key change instead of syncing props into state:
                a useEffect doing that reruns on every parent render and would
                overwrite whatever was half-typed. */}
            <ProductForm
              key={`${editing || 'new'}-${formNonce}`}
              initial={editing ? products.find(p => p.slug === editing) : null}
              saving={saving}
              onSave={handleSave}
              onCancel={handleNew}
            />
          </div>
        </div>
      )}
    </AdminShell>
  )
}
