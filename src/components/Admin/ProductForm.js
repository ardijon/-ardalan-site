'use client'

import { useState } from 'react'
import {
  InputField,
  SelectField,
  NumberField,
  CheckboxField,
  DateField,
  ArrayField,
  TestimonialFields,
  ScreenshotFields,
} from './fields'
import {
  PLAN_KEYS,
  EMPTY_TESTIMONIAL,
  EMPTY_SCREENSHOT,
  TRANSLATABLE_TEXTS,
  TRANSLATABLE_LISTS,
  emptyProduct,
  normalizeProduct,
  serializeProduct,
  productWarnings,
} from '@/lib/product-shape'

/**
 * The product editor.
 *
 * Covers every field the store renders, which the previous version did not: a
 * product added here used to arrive with no status, tier, audience, short title,
 * value proposition or screenshots, so it defaulted to "available", showed a
 * blank name on the ladder, and opened on a feature list. That gap is why adding
 * the last two products meant hand-editing src/data/products.json.
 *
 * State lives here rather than in the page, and the page passes `key={slug}` so
 * switching products remounts the form with fresh state. That is deliberate: the
 * alternative — a useEffect syncing props into state — reruns on every parent
 * render and would overwrite whatever was half-typed.
 */
const PLAN_LABELS = { starter: 'پلن استارتر', pro: 'پلن حرفه‌ای' }

/** Value at a dotted path, or undefined. Mirrors setNested's addressing. */
function readPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Ask the server for English drafts.
 *
 * One request per batch rather than one per string: the route caps the batch anyway,
 * and the round trip from Iran to a Worker is the slow part, not the translating.
 */
async function requestTranslations(texts) {
  const response = await fetch('/api/admin/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texts }),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || `خطای ${response.status}`)

  return Array.isArray(body.results) ? body.results : []
}

function Section({ title, hint, children, open = true }) {
  return (
    <details open={open} className="rounded-xl border border-[var(--color-border)]">
      <summary className="px-4 py-3 cursor-pointer text-sm font-bold text-[var(--color-primary)]">
        {title}
        {hint && <span className="block mt-0.5 text-[11px] font-normal text-gray-400">{hint}</span>}
      </summary>
      <div className="px-4 pb-4 space-y-4">{children}</div>
    </details>
  )
}

export default function ProductForm({ initial, saving, onSave, onCancel }) {
  const [form, setForm] = useState(() => (initial ? normalizeProduct(initial) : emptyProduct()))
  // The base path currently being translated, or '*' during the bulk pass. One
  // value rather than a set: the requests are awaited, so only one runs at a time.
  const [busyPath, setBusyPath] = useState(null)
  const [translateError, setTranslateError] = useState('')
  const [translateNote, setTranslateNote] = useState('')

  const isEditing = Boolean(initial)
  const isComingSoon = form.status === 'coming_soon'
  const warnings = productWarnings(serializeProduct(form))

  function setNested(obj, path, value) {
    const clone = JSON.parse(JSON.stringify(obj))
    const keys = path.split('.')
    const last = keys.pop()
    const target = keys.reduce((o, k) => o[k], clone)
    target[last] = value
    return clone
  }

  function change(path, value) {
    setForm(prev => setNested(prev, path, value))
  }

  function changeArrayItem(path, index, value) {
    setForm(prev => {
      const clone = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      const last = keys.pop()
      const target = keys.reduce((o, k) => o[k], clone)
      target[last][index] = value
      return clone
    })
  }

  function addArrayItem(path, template = '') {
    setForm(prev => {
      const clone = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      const last = keys.pop()
      const target = keys.reduce((o, k) => o[k], clone)
      if (!Array.isArray(target[last])) target[last] = []
      // Cloned per push: sharing one object reference across rows would make
      // every edit apply to all of them at once.
      target[last].push(typeof template === 'object' ? JSON.parse(JSON.stringify(template)) : template)
      return clone
    })
  }

  function removeArrayItem(path, index) {
    setForm(prev => {
      const clone = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      const last = keys.pop()
      const target = keys.reduce((o, k) => o[k], clone)
      target[last] = (target[last] || []).filter((_, i) => i !== index)
      return clone
    })
  }

  function arrayProps(path, items) {
    return {
      items,
      onItemChange: (i, v) => changeArrayItem(path, i, v),
      onRemove: i => removeArrayItem(path, i),
      onAdd: () => addArrayItem(path),
    }
  }

  function objectListProps(path, items, template) {
    return {
      items,
      onFieldChange: (i, field, v) => change(`${path}.${i}.${field}`, v),
      onRemove: i => removeArrayItem(path, i),
      onAdd: () => addArrayItem(path, template),
      translateProps: (i, base) => pairProps(`${path}.${i}.${base}`),
    }
  }

  // -------------------------------------------------------------- translation

  /**
   * Must not exceed MAX_BATCH in lib/translate.js — the route rejects a larger array
   * outright, so an over-long bulk pass would fail entirely instead of partly.
   * `__tests__/translate.test.js` compares the two numbers.
   */
  const BATCH_SIZE = 20

  async function runTranslation(texts, apply) {
    setTranslateError('')
    setTranslateNote('')

    try {
      const results = []
      // Chunked because the cap is the route's, not the form's: a product with every
      // field filled produces more strings than one request may carry.
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        results.push(...(await requestTranslations(texts.slice(i, i + BATCH_SIZE))))
      }

      const translated = results.map(r => (r && typeof r.text === 'string' ? r.text : ''))
      const filled = apply(translated)

      if (filled === 0) setTranslateError('ترجمه‌ای برنگشت — متن انگلیسی را دستی بنویس')
      else setTranslateNote(`${filled} فیلد پر شد — قبل از ذخیره یک بار بخوانش`)
    } catch (error) {
      // Named rather than swallowed: from inside Iran the request reaching the Worker
      // is the thing most likely to have failed, and that is worth telling apart from
      // Google having changed its endpoint.
      setTranslateError(error?.message || 'سرویس ترجمه در دسترس نیست')
    } finally {
      setBusyPath(null)
    }
  }

  async function translatePair(base) {
    const source = readPath(form, `${base}.fa`)
    if (!nonEmpty(source)) return

    setBusyPath(base)
    await runTranslation([source.trim()], ([text]) => {
      if (!text) return 0
      setForm(prev => setNested(prev, `${base}.en`, text))
      return 1
    })
  }

  async function translateList(base) {
    const source = (readPath(form, `${base}.fa`) || []).map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
    if (source.length === 0) return

    setBusyPath(base)
    await runTranslation(source, texts => {
      const rows = texts.filter(Boolean)
      if (rows.length === 0) return 0
      setForm(prev => setNested(prev, `${base}.en`, rows))
      return rows.length
    })
  }

  /**
   * One pass over everything still untranslated.
   *
   * Only fields whose English is *empty*. A bulk button that overwrote English that
   * had already been corrected by hand would be a button nobody dares press twice,
   * and the per-field button already covers "redo this one".
   */
  async function translateEmpty() {
    const jobs = []

    for (const base of TRANSLATABLE_TEXTS) {
      const fa = readPath(form, `${base}.fa`)
      if (nonEmpty(fa) && !nonEmpty(readPath(form, `${base}.en`))) {
        jobs.push({ path: `${base}.en`, texts: [fa.trim()], list: false })
      }
    }

    for (const base of TRANSLATABLE_LISTS) {
      const fa = (readPath(form, `${base}.fa`) || []).map(s => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
      const en = (readPath(form, `${base}.en`) || []).filter(nonEmpty)
      if (fa.length > 0 && en.length === 0) {
        jobs.push({ path: `${base}.en`, texts: fa, list: true })
      }
    }

    for (const [i, shot] of (form.screenshots || []).entries()) {
      if (nonEmpty(shot?.alt?.fa) && !nonEmpty(shot?.alt?.en)) {
        jobs.push({ path: `screenshots.${i}.alt.en`, texts: [shot.alt.fa.trim()], list: false })
      }
    }

    for (const [i, item] of (form.testimonials || []).entries()) {
      for (const field of ['role', 'quote']) {
        if (nonEmpty(item?.[field]?.fa) && !nonEmpty(item?.[field]?.en)) {
          jobs.push({ path: `testimonials.${i}.${field}.en`, texts: [item[field].fa.trim()], list: false })
        }
      }
    }

    if (jobs.length === 0) {
      setTranslateError('')
      setTranslateNote('همه‌ی فیلدهای انگلیسی که فارسی دارند، پر هستند')
      return
    }

    setBusyPath('*')
    await runTranslation(jobs.flatMap(job => job.texts), translated => {
      let cursor = 0
      let filled = 0
      const updates = []

      for (const job of jobs) {
        const slice = translated.slice(cursor, cursor + job.texts.length)
        cursor += job.texts.length

        if (job.list) {
          const rows = slice.filter(Boolean)
          if (rows.length > 0) { updates.push([job.path, rows]); filled += 1 }
        } else if (slice[0]) {
          updates.push([job.path, slice[0]]); filled += 1
        }
      }

      // One state update for the whole batch: setNested clones the form each call,
      // so applying them inside the updater keeps intermediate clones off React's
      // queue and cannot interleave with a keystroke.
      if (updates.length > 0) {
        setForm(prev => updates.reduce((acc, [path, value]) => setNested(acc, path, value), prev))
      }
      return filled
    })
  }

  /** Translate-button props for a `{fa, en}` pair at `base`. */
  function pairProps(base, { list = false } = {}) {
    const source = readPath(form, `${base}.fa`)
    return {
      onTranslate: () => (list ? translateList(base) : translatePair(base)),
      translating: busyPath === base || busyPath === '*',
      canTranslate: list ? Array.isArray(source) && source.some(nonEmpty) : nonEmpty(source),
    }
  }

  return (
    <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-bold text-[var(--color-primary)]">
          {isEditing ? `ویرایش «${form.title.fa || form.slug}»` : 'محصول جدید'}
        </h2>

        <button
          type="button"
          onClick={translateEmpty}
          disabled={busyPath !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 transition-colors"
        >
          {busyPath === '*' ? 'در حال ترجمه...' : 'ترجمه‌ی فیلدهای انگلیسی خالی'}
        </button>
      </div>

      {/* Machine output, so it is announced as a draft rather than a result. */}
      {translateError && (
        <p className="mb-4 px-3 py-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg">
          {translateError}
        </p>
      )}
      {translateNote && (
        <p className="mb-4 px-3 py-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
          {translateNote}
        </p>
      )}

      <div className="space-y-4">
        <Section title="جایگاه محصول" hint="این‌ها تعیین می‌کنند محصول کجای فروشگاه و با چه ظاهری نمایش داده شود">
          <InputField
            label="Slug (شناسه URL)"
            value={form.slug}
            onChange={v => change('slug', v)}
            dir="ltr"
            placeholder="my-product"
            hint={isEditing ? 'تغییر این مقدار یک محصول جدید نمی‌سازد — آدرس فعلی محصول را می‌شکند' : 'فقط حروف کوچک انگلیسی، عدد و خط تیره'}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="وضعیت"
              value={form.status}
              onChange={v => change('status', v)}
              options={[
                { value: 'available', label: 'موجود — قابل خرید' },
                { value: 'coming_soon', label: 'به‌زودی — لیست انتظار' },
              ]}
              hint={isComingSoon ? 'صفحه‌ی محصول به‌جای فرم خرید، فرم «خبرم کن» نشان می‌دهد' : 'صفحه‌ی محصول جدول پلن‌ها و فرم خرید نشان می‌دهد'}
            />
            <SelectField
              label="نحوه‌ی قیمت‌گذاری"
              value={form.pricingMode}
              onChange={v => change('pricingMode', v)}
              options={[
                { value: 'fixed', label: 'قیمت مشخص' },
                { value: 'contact', label: 'تماس برای قیمت' },
              ]}
              hint={form.pricingMode === 'contact' ? 'هیچ عددی روی سایت و در داده‌ی گوگل نمایش داده نمی‌شود' : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              label="سطح نردبان"
              value={form.tier}
              onChange={v => change('tier', v)}
              min={1}
              hint="۱ برای کوچک‌ترین مخاطب. خالی بماند، آخر فهرست می‌رود"
            />
            <DateField
              label="تاریخ انتشار"
              value={form.releaseAt}
              onChange={v => change('releaseAt', v)}
              hint="خالی = شمارش معکوس نمایش داده نمی‌شود"
            />
          </div>

          <CheckboxField
            label="محصول شاخص"
            checked={form.featured}
            onChange={v => change('featured', v)}
            hint="با حاشیه و سایه‌ی رنگی از بقیه جدا می‌شود. بیش از یکی، یعنی هیچ‌کدام"
          />
        </Section>

        <Section title="متن‌ها" hint="عنوان کوتاه و مخاطب، همان چیزی است که در فهرست فروشگاه و صفحه‌ی اصلی دیده می‌شود">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="عنوان کامل (فارسی)" value={form.title.fa} onChange={v => change('title.fa', v)} />
            <InputField label="عنوان کامل (انگلیسی)" value={form.title.en} onChange={v => change('title.en', v)} dir="ltr" {...pairProps('title')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="عنوان کوتاه (فارسی)"
              value={form.shortTitle.fa}
              onChange={v => change('shortTitle.fa', v)}
              hint="عنوانی که روی کارت محصول می‌نشیند"
            />
            <InputField label="عنوان کوتاه (انگلیسی)" value={form.shortTitle.en} onChange={v => change('shortTitle.en', v)} dir="ltr" {...pairProps('shortTitle')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="مخاطب (فارسی)"
              value={form.audience.fa}
              onChange={v => change('audience.fa', v)}
              placeholder="برای یک نماینده"
              hint="یک عبارت کوتاه: این محصول برای چه کسی است"
            />
            <InputField label="مخاطب (انگلیسی)" value={form.audience.en} onChange={v => change('audience.en', v)} dir="ltr" {...pairProps('audience')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="توضیح کوتاه (فارسی)" value={form.shortDescription.fa} onChange={v => change('shortDescription.fa', v)} multiline />
            <InputField label="توضیح کوتاه (انگلیسی)" value={form.shortDescription.en} onChange={v => change('shortDescription.en', v)} multiline dir="ltr" {...pairProps('shortDescription')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField label="توضیح کامل (فارسی)" value={form.description.fa} onChange={v => change('description.fa', v)} multiline />
            <InputField label="توضیح کامل (انگلیسی)" value={form.description.en} onChange={v => change('description.en', v)} multiline dir="ltr" {...pairProps('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="ارزش پیشنهادی (فارسی)"
              value={form.valueProposition.fa}
              onChange={v => change('valueProposition.fa', v)}
              multiline
              hint="اولین چیزی که بازدیدکننده می‌خواند: این محصول چه مشکلی را حل می‌کند. با یک خط خالی، پاراگراف جدا می‌شود"
            />
            <InputField label="ارزش پیشنهادی (انگلیسی)" value={form.valueProposition.en} onChange={v => change('valueProposition.en', v)} multiline dir="ltr" {...pairProps('valueProposition')} />
          </div>
        </Section>

        <Section title="ویژگی‌ها و تکنولوژی">
          <div className="grid grid-cols-2 gap-4">
            <ArrayField label="ویژگی‌ها (فارسی)" {...arrayProps('features.fa', form.features.fa)} />
            <ArrayField label="ویژگی‌ها (انگلیسی)" {...arrayProps('features.en', form.features.en)} {...pairProps('features', { list: true })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">تکنولوژی‌ها</label>
            <div className="flex flex-wrap gap-2">
              {form.tech.map((t, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-sm">
                  <input
                    type="text"
                    value={t ?? ''}
                    onChange={e => changeArrayItem('tech', i, e.target.value)}
                    dir="ltr"
                    className="bg-transparent outline-none w-20"
                  />
                  <button type="button" onClick={() => removeArrayItem('tech', i)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem('tech')} className="text-xs text-orange-500 hover:text-orange-600">+ افزودن</button>
            </div>
          </div>
        </Section>

        <Section
          title="قیمت"
          hint={isComingSoon
            ? 'برای محصول «به‌زودی»، فقط «قیمت خلاصه» نمایش داده می‌شود — پلن‌ها ذخیره می‌شوند و روز انتشار فعال'
            : 'پلنی که قیمتش خالی بماند ذخیره نمی‌شود'}
        >
          <div className="p-4 rounded-xl border border-[var(--color-border)] space-y-3">
            <h3 className="text-sm font-bold text-[var(--color-primary)]">قیمت خلاصه</h3>
            <p className="text-[11px] text-gray-400">
              جای قیمت را روی کارت و در پنل «به‌زودی» می‌گیرد. برای بازه («۳ تا ۳.۵ میلیون») یا «تماس برای قیمت» همین کافی است.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <NumberField
                label="عدد قیمت (برای گوگل)"
                value={form.priceSummary.price}
                onChange={v => change('priceSummary.price', v)}
                hint={form.pricingMode === 'contact' ? 'در حالت «تماس برای قیمت» ذخیره نمی‌شود' : 'به تومان'}
              />
              <InputField label="نمایش قیمت (فارسی)" value={form.priceSummary.display.fa} onChange={v => change('priceSummary.display.fa', v)} />
              <InputField label="نمایش قیمت (انگلیسی)" value={form.priceSummary.display.en} onChange={v => change('priceSummary.display.en', v)} dir="ltr" {...pairProps('priceSummary.display')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField label="توضیح قیمت (فارسی)" value={form.priceSummary.note.fa} onChange={v => change('priceSummary.note.fa', v)} multiline />
              <InputField label="توضیح قیمت (انگلیسی)" value={form.priceSummary.note.en} onChange={v => change('priceSummary.note.en', v)} multiline dir="ltr" {...pairProps('priceSummary.note')} />
            </div>
          </div>

          {PLAN_KEYS.map(plan => (
            <div key={plan} className="p-4 rounded-xl border border-[var(--color-border)] space-y-3">
              <h3 className="text-sm font-bold text-[var(--color-primary)]">{PLAN_LABELS[plan]}</h3>
              <div className="grid grid-cols-3 gap-3">
                <NumberField
                  label="قیمت (عدد)"
                  value={form.pricing[plan].price}
                  onChange={v => change(`pricing.${plan}.price`, v)}
                  hint="به تومان — مبلغ واریز از این محاسبه می‌شود"
                />
                <InputField label="قیمت نمایشی (فارسی)" value={form.pricing[plan].priceDisplay.fa} onChange={v => change(`pricing.${plan}.priceDisplay.fa`, v)} />
                <InputField label="قیمت نمایشی (انگلیسی)" value={form.pricing[plan].priceDisplay.en} onChange={v => change(`pricing.${plan}.priceDisplay.en`, v)} dir="ltr" {...pairProps(`pricing.${plan}.priceDisplay`)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="دوره (فارسی)" value={form.pricing[plan].period.fa} onChange={v => change(`pricing.${plan}.period.fa`, v)} placeholder="ماهانه" />
                <InputField label="دوره (انگلیسی)" value={form.pricing[plan].period.en} onChange={v => change(`pricing.${plan}.period.en`, v)} dir="ltr" {...pairProps(`pricing.${plan}.period`)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ArrayField label="ویژگی‌ها (فارسی)" {...arrayProps(`pricing.${plan}.features.fa`, form.pricing[plan].features.fa)} />
                <ArrayField label="ویژگی‌ها (انگلیسی)" {...arrayProps(`pricing.${plan}.features.en`, form.pricing[plan].features.en)} {...pairProps(`pricing.${plan}.features`, { list: true })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="متن دکمه (فارسی)" value={form.pricing[plan].cta.fa} onChange={v => change(`pricing.${plan}.cta.fa`, v)} />
                <InputField label="متن دکمه (انگلیسی)" value={form.pricing[plan].cta.en} onChange={v => change(`pricing.${plan}.cta.en`, v)} dir="ltr" {...pairProps(`pricing.${plan}.cta`)} />
              </div>
            </div>
          ))}
        </Section>

        <Section title="رسانه و لینک‌ها" open={false}>
          <InputField
            label="آدرس دمو"
            value={form.demoUrl}
            onChange={v => change('demoUrl', v)}
            dir="ltr"
            placeholder="https://..."
            hint="دموی زنده قوی‌ترین ادعای اثبات‌پذیر صفحه است. خالی بماند، لینکی نمایش داده نمی‌شود"
          />
          <InputField label="لینک GitHub" value={form.github} onChange={v => change('github', v)} dir="ltr" placeholder="https://github.com/..." />
          <ScreenshotFields {...objectListProps('screenshots', form.screenshots, EMPTY_SCREENSHOT)} />
        </Section>

        <Section title="نقل قول مشتری‌ها" open={false}>
          <TestimonialFields {...objectListProps('testimonials', form.testimonials, EMPTY_TESTIMONIAL)} />
        </Section>

        <Section title="نکته حقوقی" hint="اگر محصول محدودیت قانونی دارد، همین صداقت است که اعتماد می‌سازد" open={false}>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="نکته حقوقی (فارسی)" value={form.legalNote.fa} onChange={v => change('legalNote.fa', v)} multiline />
            <InputField label="نکته حقوقی (انگلیسی)" value={form.legalNote.en} onChange={v => change('legalNote.en', v)} multiline dir="ltr" {...pairProps('legalNote')} />
          </div>
        </Section>

        {/* Warnings, not errors: every one of these saves fine and then renders
            as a blank area on the store. Silence would be worse than a list. */}
        {warnings.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-xs font-bold text-amber-800 mb-2">این موارد روی سایت خالی نمایش داده می‌شوند:</p>
            <ul className="space-y-1">
              {warnings.map(warning => (
                <li key={warning} className="text-xs text-amber-700 flex gap-1.5">
                  <span aria-hidden="true">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onSave(serializeProduct(form))}
            disabled={saving || !form.slug.trim()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[var(--color-accent)] rounded-xl hover:bg-[var(--color-accent)]/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'در حال ذخیره...' : 'ذخیره'}
          </button>
          {isEditing && (
            <button
              onClick={onCancel}
              className="px-6 py-2.5 text-sm font-medium text-[var(--color-text)]/60 border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-text)]/5 transition-colors"
            >
              انصراف
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
