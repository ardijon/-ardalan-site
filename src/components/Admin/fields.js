'use client'

import { useEffect, useRef, useState } from 'react'
import {
  JALALI_MONTHS,
  JALALI_WEEKDAY_INITIALS,
  formatJalaliLong,
  jalaliMonthLength,
  jalaliParts,
  jalaliToISO,
  jalaliWeekday,
  todayJalali,
  toPersianDigits,
} from '@/lib/jalali'

/**
 * Form primitives for the admin panel.
 *
 * EVERY component here MUST stay at module scope.
 *
 * When they were declared inside the page component, each render produced a new
 * component type, so React unmounted and remounted the whole subtree — which
 * destroyed the <input> DOM node and dropped focus after every keystroke. They
 * live in their own file now so that a new tab cannot accidentally reintroduce
 * that by nesting a field definition inside a component.
 */

/**
 * Fills an English box from its Persian sibling.
 *
 * Per-field and not just one bulk button, because the two are used at different
 * moments: the bulk pass is for a new product, and this is for the box you just
 * rewrote in Persian and now need to redo. It always overwrites — a button on a
 * single field that refused to run because the field had content would be a button
 * that does nothing exactly when you press it.
 */
export function TranslateButton({ onClick, busy, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      title={disabled ? 'ابتدا متن فارسی را بنویس' : 'ترجمه از فارسی'}
      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-orange-600 rounded hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
    >
      {busy ? (
        <span className="w-3 h-3 rounded-full border border-orange-300 border-t-orange-600 animate-spin" aria-hidden="true" />
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 8h8M9 5v3c0 3.5-2 6-4 7" />
          <path d="M10 13c1.5 2 3.5 3 5 3.5" />
          <path d="M14 21l4-10 4 10M15.5 18h5" />
        </svg>
      )}
      {busy ? 'در حال ترجمه' : 'ترجمه'}
    </button>
  )
}

export function InputField({ label, value, onChange, multiline, placeholder, hint, dir, onTranslate, translating, canTranslate = true, disabled }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="block text-xs font-medium text-gray-500">{label}</label>
        {onTranslate && <TranslateButton onClick={onTranslate} busy={translating} disabled={!canTranslate} />}
      </div>
      {multiline ? (
        <textarea
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
          rows={3}
          placeholder={placeholder}
          dir={dir}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none resize-none ${
            disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-200'
          }`}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none ${
            disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-200'
          }`}
        />
      )}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

/**
 * A closed set of values.
 *
 * `status` and `pricingMode` decide which of two completely different renderings
 * a product page gets, and the store treats an unrecognised value as neither. A
 * free-text input for them is how a typo turns a product page blank, so they are
 * a dropdown and cannot be typed at all.
 */
export function SelectField({ label, value, onChange, options, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

export function NumberField({ label, value, onChange, hint, min = 0, step = 1 }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        // Empty rather than 0 when unset: a literal 0 in a price box reads as
        // "free" and gets saved that way.
        value={value === null || value === undefined || value === '' ? '' : value}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        min={min}
        step={step}
        dir="ltr"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

export function CheckboxField({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 accent-orange-500"
      />
      <span>
        <span className="block text-xs font-medium text-gray-600">{label}</span>
        {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
      </span>
    </label>
  )
}

/**
 * A date, stored as an ISO timestamp, picked on a Jalali calendar.
 *
 * `<input type="date">` was the obvious thing and it was wrong twice over: the
 * browser renders it with its own locale and calendar, so a Persian form showed
 * `08/10/2026`, and the only way to enter a release date was to convert it in your
 * head first. Every date the panel *displays* already goes through lib/jalali; this
 * is the one place it was still read and written in Gregorian.
 *
 * There is no text box. A masked Persian-digit field is the other way to do this and
 * it fights the caret on every mid-string edit; the grid is less code and it answers
 * the question you actually have when setting a release date, which is what day of
 * the week it lands on. The value is still an ISO string — nothing downstream (the
 * countdown, the catalogue, serializeProduct) knows this changed.
 */
export function DateField({ label, value, onChange, hint }) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef(null)

  // Any click outside closes it. Without this the popup floats over the fields
  // below and stays there while you type into one of them.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event) {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const parts = jalaliParts(value)

  return (
    <div className="relative" ref={wrapper}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:border-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
        >
          <span className={parts ? 'truncate text-gray-800' : 'truncate text-gray-400'}>
            {parts ? formatJalaliLong(value) : 'انتخاب تاریخ'}
          </span>
          <svg className="shrink-0 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </button>
        {parts && (
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            title="پاک کردن تاریخ"
            aria-label="پاک کردن تاریخ"
            className="shrink-0 px-2 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        )}
      </div>
      {open && (
        <JalaliCalendar
          selected={parts}
          onPick={(jy, jm, jd) => { onChange(jalaliToISO(jy, jm, jd)); setOpen(false) }}
        />
      )}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

/**
 * One Jalali month as a grid.
 *
 * Absolutely positioned on purpose: a picker that expands inline pushes the rest of
 * the form down, which moves the field you were aiming at out from under the cursor.
 *
 * Mounted only while open, so `todayJalali()` — which reads the clock — never runs
 * during a server render and cannot produce a hydration mismatch.
 */
export function JalaliCalendar({ selected, onPick }) {
  const today = todayJalali()
  // Opens on the month already chosen, or on this one. Nothing syncs it afterwards:
  // picking a day closes the popup, so the view cannot go stale while it is visible.
  const [view, setView] = useState({ jy: selected?.jy ?? today.jy, jm: selected?.jm ?? today.jm })

  const days = jalaliMonthLength(view.jy, view.jm)
  // Which column the 1st sits in; the blanks before it are what aligns the grid.
  const offset = jalaliWeekday(view.jy, view.jm, 1)

  function shiftMonth(delta) {
    const absolute = view.jy * 12 + (view.jm - 1) + delta
    setView({ jy: Math.floor(absolute / 12), jm: (absolute % 12) + 1 })
  }

  return (
    <div className="absolute z-30 top-full right-0 mt-1 w-64 p-3 bg-white rounded-xl border border-gray-200 shadow-xl">
      <div className="flex items-center justify-between mb-2">
        {/*
          Chevrons as SVG rather than ‹ › because those two characters are
          bidi-mirrored: in an RTL container the glyph flips and the arrow ends up
          pointing the opposite way to the month it moves to. DOM order puts the
          previous month on the right, which is where it belongs in Persian.
        */}
        <button type="button" onClick={() => shiftMonth(-1)} aria-label="ماه قبل" className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
        <span className="text-xs font-semibold text-gray-700">
          {JALALI_MONTHS[view.jm - 1]} {toPersianDigits(view.jy)}
        </span>
        <button type="button" onClick={() => shiftMonth(1)} aria-label="ماه بعد" className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {JALALI_WEEKDAY_INITIALS.map(initial => (
          <span key={initial} className="py-1 text-[10px] font-medium text-gray-400">{initial}</span>
        ))}
        {Array.from({ length: offset }, (_, i) => <span key={`pad-${i}`} aria-hidden="true" />)}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1
          const isSelected = selected?.jy === view.jy && selected?.jm === view.jm && selected?.jd === day
          const isToday = today.jy === view.jy && today.jm === view.jm && today.jd === day
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(view.jy, view.jm, day)}
              className={`py-1 text-xs rounded transition-colors ${
                isSelected
                  ? 'bg-orange-500 text-white font-bold'
                  : isToday
                    ? 'bg-orange-50 text-orange-600 font-bold'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {toPersianDigits(day)}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => onPick(today.jy, today.jm, today.jd)}
        className="mt-2 w-full py-1 text-[11px] text-orange-500 hover:text-orange-600"
      >
        امروز — {toPersianDigits(`${today.jy}/${today.jm}/${today.jd}`)}
      </button>
    </div>
  )
}

export function ArrayField({ label, items, onItemChange, onRemove, onAdd, onTranslate, translating, canTranslate = true }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="block text-xs font-medium text-gray-500">{label}</label>
        {onTranslate && <TranslateButton onClick={onTranslate} busy={translating} disabled={!canTranslate} />}
      </div>
      <div className="space-y-1">
        {(items || []).map((item, i) => (
          <div key={i} className="flex gap-1">
            <input
              type="text"
              value={item ?? ''}
              onChange={e => onItemChange(i, e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="px-2 text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="text-xs text-orange-500 hover:text-orange-600"
        >
          + افزودن
        </button>
      </div>
    </div>
  )
}

/**
 * Customer quotes — an object list, so ArrayField (flat strings) does not fit.
 *
 * The store drops any entry missing a name or a quote, which means a half-filled
 * row here is invisible rather than broken. English is optional on purpose: the
 * store falls back to the Persian text, and demanding a translation before a real
 * testimonial could go up would mean none ever did.
 */
export function TestimonialFields({ items, onFieldChange, onRemove, onAdd, translateProps }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--color-text)]/60 mb-3">نقل قول مشتری‌ها</h3>
      <div className="space-y-4">
        {(items || []).map((item, i) => (
          <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-primary)]">نقل قول {i + 1}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="px-2 text-red-400 hover:text-red-600"
                aria-label={`حذف نقل قول ${i + 1}`}
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <InputField label="نام مشتری" value={item.name} onChange={v => onFieldChange(i, 'name', v)} />
              <InputField label="سمت / شرکت (فارسی)" value={item.role?.fa} onChange={v => onFieldChange(i, 'role.fa', v)} />
              <NumberField label="امتیاز (۰ تا ۵)" value={item.rating} onChange={v => onFieldChange(i, 'rating', Math.min(5, Math.max(0, Number(v) || 0)))} min={0} />
            </div>

            <InputField label="متن نقل قول (فارسی)" value={item.quote?.fa} onChange={v => onFieldChange(i, 'quote.fa', v)} multiline />

            <details>
              <summary className="text-xs text-[var(--color-text)]/40 cursor-pointer">ترجمه انگلیسی (اختیاری)</summary>
              <div className="mt-3 space-y-3">
                <InputField
                  label="سمت / شرکت (انگلیسی)"
                  value={item.role?.en}
                  onChange={v => onFieldChange(i, 'role.en', v)}
                  dir="ltr"
                  {...(translateProps ? translateProps(i, 'role') : {})}
                />
                <InputField
                  label="متن نقل قول (انگلیسی)"
                  value={item.quote?.en}
                  onChange={v => onFieldChange(i, 'quote.en', v)}
                  multiline
                  dir="ltr"
                  {...(translateProps ? translateProps(i, 'quote') : {})}
                />
              </div>
            </details>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="text-xs text-orange-500 hover:text-orange-600"
        >
          + افزودن نقل قول
        </button>
      </div>
    </div>
  )
}

/**
 * Screenshots — `{ src, alt: { fa, en } }`, the product page's main proof asset.
 *
 * There was no input for these at all, so a product added from the panel could
 * never get a gallery no matter how many images were uploaded to /public.
 *
 * `alt` is not decoration: the gallery renders it as the caption under each
 * image, and it is the only text Google gets for the images on the one page that
 * sells anything.
 */
export function ScreenshotFields({ items, onFieldChange, onRemove, onAdd, translateProps }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--color-text)]/60 mb-3">اسکرین‌شات‌ها</h3>
      <div className="space-y-4">
        {(items || []).map((item, i) => (
          <div key={i} className="p-4 rounded-xl border border-[var(--color-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--color-primary)]">تصویر {i + 1}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="px-2 text-red-400 hover:text-red-600"
                aria-label={`حذف تصویر ${i + 1}`}
              >
                ✕
              </button>
            </div>

            <InputField
              label="مسیر تصویر"
              value={item.src}
              onChange={v => onFieldChange(i, 'src', v)}
              dir="ltr"
              placeholder="/images/my-product/screen-1.webp"
              hint="فایل را در public/images/ بگذار و مسیرش را از /images/ شروع کن"
            />
            <InputField label="توضیح تصویر (فارسی)" value={item.alt?.fa} onChange={v => onFieldChange(i, 'alt.fa', v)} />
            <InputField
              label="توضیح تصویر (انگلیسی)"
              value={item.alt?.en}
              onChange={v => onFieldChange(i, 'alt.en', v)}
              dir="ltr"
              {...(translateProps ? translateProps(i, 'alt') : {})}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="text-xs text-orange-500 hover:text-orange-600"
        >
          + افزودن تصویر
        </button>
      </div>
    </div>
  )
}
