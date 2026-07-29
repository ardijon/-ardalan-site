'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const EMPTY_PRODUCT = {
  slug: '',
  title: { fa: '', en: '' },
  shortTitle: { fa: '', en: '' },
  description: { fa: '', en: '' },
  shortDescription: { fa: '', en: '' },
  features: { fa: [''], en: [''] },
  tech: [''],
  pricing: {
    free: { price: 0, priceDisplay: { fa: '', en: '' }, period: { fa: '', en: '' }, features: { fa: [''], en: [''] }, cta: { fa: '', en: '' } },
    starter: { price: 0, priceDisplay: { fa: '', en: '' }, period: { fa: '', en: '' }, features: { fa: [''], en: [''] }, cta: { fa: '', en: '' } },
    pro: { price: 0, priceDisplay: { fa: '', en: '' }, period: { fa: '', en: '' }, features: { fa: [''], en: [''] }, cta: { fa: '', en: '' } },
  },
  demoUrl: '',
  screenshots: [],
  github: '',
}

export default function AdminPage() {
  const [auth, setAuth] = useState(null)
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' })
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  function getAuthHeader() {
    if (!auth) return {}
    return { Authorization: `Basic ${btoa(`${auth.user}:${auth.pass}`)}` }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/products', {
        headers: { Authorization: `Basic ${btoa(`${loginForm.user}:${loginForm.pass}`)}` },
      })
      if (res.status === 401) {
        setMessage('نام کاربری یا رمز عبور اشتباه است')
        setLoading(false)
        return
      }
      const data = await res.json()
      setAuth(loginForm)
      setProducts(data)
    } catch {
      setMessage('خطا در اتصال')
    } finally {
      setLoading(false)
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch('/api/admin/products', { headers: getAuthHeader() })
      const data = await res.json()
      setProducts(data)
    } catch {
      setMessage('خطا در بارگذاری محصولات')
    }
  }

  function setNested(obj, path, value) {
    const clone = JSON.parse(JSON.stringify(obj))
    const keys = path.split('.')
    const last = keys.pop()
    const target = keys.reduce((o, k) => o[k], clone)
    target[last] = value
    return clone
  }

  function handleChange(path, value) {
    setForm(prev => setNested(prev, path, value))
  }

  function handleArrayChange(path, index, value) {
    setForm(prev => {
      const clone = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      const last = keys.pop()
      const target = keys.reduce((o, k) => o[k], clone)
      target[last][index] = value
      return clone
    })
  }

  function addArrayItem(path) {
    setForm(prev => {
      const clone = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      const last = keys.pop()
      const target = keys.reduce((o, k) => o[k], clone)
      target[last].push('')
      return clone
    })
  }

  function removeArrayItem(path, index) {
    setForm(prev => {
      const clone = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      const last = keys.pop()
      const target = keys.reduce((o, k) => o[k], clone)
      target[last] = target[last].filter((_, i) => i !== index)
      return clone
    })
  }

  function handleEdit(product) {
    setEditing(product.slug)
    setForm(JSON.parse(JSON.stringify(product)))
  }

  function handleNew() {
    setEditing(null)
    setForm(JSON.parse(JSON.stringify(EMPTY_PRODUCT)))
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch('/api/admin/products', {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }
      setMessage(editing ? 'محصول ویرایش شد' : 'محصول جدید اضافه شد')
      setEditing(null)
      setForm(EMPTY_PRODUCT)
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
      await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ slug }),
      })
      setMessage('محصول حذف شد')
      await fetchProducts()
    } catch {
      setMessage('خطا در حذف محصول')
    }
  }

  function InputField({ label, value, onChange, multiline }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        {multiline ? (
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none"
          />
        ) : (
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
        )}
      </div>
    )
  }

  function ArrayField({ label, items, path }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex gap-1">
              <input
                type="text"
                value={item}
                onChange={e => handleArrayChange(`${path}`, i, e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => removeArrayItem(path, i)}
                className="px-2 text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem(path)}
            className="text-xs text-orange-500 hover:text-orange-600"
          >
            + افزودن
          </button>
        </div>
      </div>
    )
  }

  if (!auth) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            <h1 className="text-xl font-bold text-[var(--color-primary)] text-center">ورود به پنل مدیریت</h1>
            {message && (
              <div className="px-3 py-2 text-sm rounded-lg bg-red-50 text-red-600 border border-red-200">{message}</div>
            )}
            <input
              type="text"
              placeholder="نام کاربری"
              value={loginForm.user}
              onChange={e => setLoginForm(p => ({ ...p, user: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="password"
              placeholder="رمز عبور"
              value={loginForm.pass}
              onChange={e => setLoginForm(p => ({ ...p, pass: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'در حال بررسی...' : 'ورود'}
            </button>
          </form>
        </main>
        <Footer />
      </>
    )
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-[var(--color-text)]/60">در حال بارگذاری...</div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-primary)]">پنل مدیریت فروشگاه</h1>
              <p className="text-sm text-[var(--color-text)]/50 mt-1">مدیریت محصولات و قیمت‌ها</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleNew}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors"
              >
                + محصول جدید
              </button>
              <button
                onClick={() => { setAuth(null); setProducts([]) }}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text)]/60 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-text)]/5 transition-colors"
              >
                خروج
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-6 px-4 py-3 text-sm rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
              {message}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]/60 mb-3">لیست محصولات</h2>
              {products.map(p => (
                <div
                  key={p.slug}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    editing === p.slug
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/30'
                  }`}
                  onClick={() => handleEdit(p)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[var(--color-primary)]">{p.title.fa}</h3>
                      <p className="text-xs text-[var(--color-text)]/50 mt-0.5">{p.title.en}</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(p.slug) }}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2">
              <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
                <h2 className="text-lg font-bold text-[var(--color-primary)] mb-6">
                  {editing ? 'ویرایش محصول' : 'محصول جدید'}
                </h2>

                <div className="space-y-6">
                  <InputField label="Slug (شناسه URL)" value={form.slug} onChange={v => handleChange('slug', v)} />

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="عنوان فارسی" value={form.title.fa} onChange={v => handleChange('title.fa', v)} />
                    <InputField label="عنوان انگلیسی" value={form.title.en} onChange={v => handleChange('title.en', v)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="توضیح کوتاه فارسی" value={form.shortDescription.fa} onChange={v => handleChange('shortDescription.fa', v)} />
                    <InputField label="توضیح کوتاه انگلیسی" value={form.shortDescription.en} onChange={v => handleChange('shortDescription.en', v)} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputField label="توضیح کامل فارسی" value={form.description.fa} onChange={v => handleChange('description.fa', v)} multiline />
                    <InputField label="توضیح کامل انگلیسی" value={form.description.en} onChange={v => handleChange('description.en', v)} multiline />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">تکنولوژی‌ها</label>
                    <div className="flex flex-wrap gap-2">
                      {form.tech.map((t, i) => (
                        <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                          <input
                            type="text"
                            value={t}
                            onChange={e => handleArrayChange('tech', i, e.target.value)}
                            className="bg-transparent outline-none w-20"
                          />
                          <button onClick={() => removeArrayItem('tech', i)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                        </div>
                      ))}
                      <button onClick={() => addArrayItem('tech')} className="text-xs text-orange-500 hover:text-orange-600">+ افزودن</button>
                    </div>
                  </div>

                  <InputField label="آدرس دمو" value={form.demoUrl} onChange={v => handleChange('demoUrl', v)} />
                  <InputField label="لینک GitHub" value={form.github} onChange={v => handleChange('github', v)} />

                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text)]/60 mb-3">ویژگی‌ها</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <ArrayField label="فارسی" items={form.features.fa} path="features.fa" />
                      <ArrayField label="انگلیسی" items={form.features.en} path="features.en" />
                    </div>
                  </div>

                  {['free', 'starter', 'pro'].map(plan => (
                    <div key={plan} className="p-4 rounded-xl border border-[var(--color-border)] space-y-3">
                      <h3 className="text-sm font-bold text-[var(--color-primary)] capitalize">{plan}</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <InputField label="قیمت (عدد)" value={form.pricing[plan].price} onChange={v => handleChange(`pricing.${plan}.price`, Number(v))} />
                        <InputField label="قیمت نمایشی فارسی" value={form.pricing[plan].priceDisplay.fa} onChange={v => handleChange(`pricing.${plan}.priceDisplay.fa`, v)} />
                        <InputField label="قیمت نمایشی انگلیسی" value={form.pricing[plan].priceDisplay.en} onChange={v => handleChange(`pricing.${plan}.priceDisplay.en`, v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="دوره فارسی" value={form.pricing[plan].period.fa} onChange={v => handleChange(`pricing.${plan}.period.fa`, v)} />
                        <InputField label="دوره انگلیسی" value={form.pricing[plan].period.en} onChange={v => handleChange(`pricing.${plan}.period.en`, v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <ArrayField label="ویژگی‌ها فارسی" items={form.pricing[plan].features.fa} path={`pricing.${plan}.features.fa`} />
                        <ArrayField label="ویژگی‌ها انگلیسی" items={form.pricing[plan].features.en} path={`pricing.${plan}.features.en`} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField label="دکمه فارسی" value={form.pricing[plan].cta.fa} onChange={v => handleChange(`pricing.${plan}.cta.fa`, v)} />
                        <InputField label="دکمه انگلیسی" value={form.pricing[plan].cta.en} onChange={v => handleChange(`pricing.${plan}.cta.en`, v)} />
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving || !form.slug}
                      className="px-6 py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'در حال ذخیره...' : 'ذخیره'}
                    </button>
                    {editing && (
                      <button
                        onClick={handleNew}
                        className="px-6 py-2.5 text-sm font-medium text-[var(--color-text)]/60 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-text)]/5 transition-colors"
                      >
                        انصراف
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
