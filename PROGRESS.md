# پروژه سایت شخصی اردلان پیری

## آخرین بروزرسانی: تیر ۱۴۰۴

---

## وضعیت کلی
سایت تک‌صفحه‌ای (Single Page) RTL با Next.js 14 + Tailwind CSS 3 — آماده استقرار.

---

## کارهای انجام شده

### راه‌اندازی پروژه
- Next.js 14 با Tailwind CSS 3
- RTL با فونت Vazirmatn (Google Fonts)
- فایل‌های config: `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`

### پیاده‌سازی کامپوننت‌ها

| کامپوننت | توضیحات |
|----------|---------|
| `Header.js` | هدر شیشه‌ای (glassmorphism)، ثابت در بالا، منوی همبرگری موبایل، دکمه تغییر تم، **نشانگر سکشن فعال با اسکرول** |
| `Hero.js` | تمام‌صفحه با تصویر پروفایل دایره‌ای (جلوه سنجاق به دیوار)، دو دکمه CTA، **پس‌زمینه گره متحرک**، **موس-فالو گرادینت طلایی**، **خطوط تزئینی کنار اسم**، **TrustSeal** |
| `About.js` | متن بیوگرافی + ۳ کارت آمار با **شمارنده انیمیشنی** (easeOutCubic) + **TrustSeal** |
| `Services.js` | ۴ کارت خدمات (توسعه نرم‌افزار، هوش مصنوعی، مشاوره کسب‌وکار، بیمه) |
| `Portfolio.js` | ۶ کارت پروژه با گرادینت‌های رنگی، hover effects، **لایت‌باکس (ProjectModal)** با توضیحات واقعی |
| `Resume.js` | تایم‌لاین عمودی شماره‌گذاری شده (۵ مرحله) |
| `Blog.js` | ۳ کارت پست وبلاگ (placeholder) |
| `Contact.js` | ۴ لینک تماس + فرم تماس با **ripple effect روی دکمه**، **hover rotate آیکون‌ها**، **TrustSeal** |
| `Footer.js` | **۳ ستون**: برند + توضیح، لینک‌های سریع، شبکه‌های اجتماعی (LinkedIn, GitHub, Instagram) با **TrustSeal** |
| `ThemeToggle.js` | دکمه dark/light mode با localStorage |
| `AnimateOnScroll.js` | کامپوننت عمومی برای انیمیشن اسکرول (در حال حاضر استفاده نمی‌شود) |

### کامپوننت‌های جدید (این سشن)
| کامپوننت | توضیحات |
|----------|---------|
| `AnimatedCounter.js` | شمارنده انیمیشنی با easeOutCubic و اعداد فارسی — از ۰ تا مقدار واقعی |
| `GirihDivider.js` | دیوایدر تزئینی بین سکشن‌ها: خط گرادینت + لوزی طلایی |
| `ProjectModal.js` | لایت‌باکس برای نمایش جزئیات پروژه (گرادینت، توضیحات، دکمه بستن با Esc) |
| `TrustSeal.js` | المان signature "اعتماد دیجیتال": مدال دایره‌ای با طرح سپر + گره + تیک |

### قالب‌بندی و تم
- **رنگ‌های اصلی**: سرمه‌ای (`#0F172A`)، طلایی (`#D97706`)، سبز فیروزه‌ای (`#0D9488`)
- **طرح کلی**: "اعتماد دیجیتال" — پل بین اعتماد (بیمه) و نوآوری (تکنولوژی)
- **Dark/Light**: متغیرهای CSS در `:root` / `.dark` با localStorage
- **الگوی پس‌زمینه سکشن‌ها**: About (سطحی) → Services (شفاف) → Portfolio (سطحی) → Resume (شفاف) → Blog (سطحی) → Contact (شفاف)

### بهینه‌سازی کد (Accessibility & Best Practices)
- `color-scheme` روی `:root` و `.dark` (رفع اسکرولبار سفید در dark mode)
- `prefers-reduced-motion` در CSS (احترام به تنظیمات دسترسی)
- `touch-action: manipulation` روی دکمه‌ها و اینپوت‌ها
- `suppressHydrationWarning` روی `<html>`
- `theme-color` meta tag + اسکریپت inline برای تغییر خودکار تم
- `aria-hidden="true"` روی تمام SVG‌های تزئینی
- کارت‌های نمونه کار: `<button type="button">` (دسترسی‌پذیر)
- فرم تماس: `label` (sr-only)، `name`، `autocomplete`، `inputMode`، `spellCheck`
- لوگوی هدر: `href="#"` → `"/"`
- `onSubmit` جلوگیری از رفرش صفحه
- `scroll-mt-20` روی همه سکشن‌ها (برای هدر sticky)

---

## ساختار فایل‌ها

```
src/
├── app/
│   ├── globals.css          # متغیرهای CSS, dark/light, RTL, ripple keyframe
│   ├── layout.js            # RootLayout, font, metadata, theme-color, suppressHydrationWarning
│   └── page.js              # ترکیب همه کامپوننت‌ها + GirihDivider بین سکشن‌ها
└── components/
    ├── Header.js            # هدر + نویگیشن + active section + ThemeToggle
    ├── Hero.js              # Hero + TrustSeal + mouse gradient + animated girih + decorative name
    ├── About.js             # بیوگرافی + AnimatedCounter + TrustSeal
    ├── Services.js          # کارت‌های خدمات
    ├── Portfolio.js         # پروژه‌ها + ProjectModal
    ├── Resume.js            # تایم‌لاین
    ├── Blog.js              # پست‌های وبلاگ
    ├── Contact.js           # تماس + فرم + ripple button + TrustSeal
    ├── Footer.js            # فوتر ۳ ستونه + TrustSeal + social links
    ├── AnimateOnScroll.js   # کامپوننت انیمیشن عمومی (استفاده نمی‌شه)
    ├── ThemeToggle.js       # دکمه dark/light
    ├── AnimatedCounter.js   # شمارنده انیمیشنی
    ├── GirihDivider.js      # دیوایدر تزئینی
    ├── ProjectModal.js      # لایت‌باکس پروژه
    └── TrustSeal.js         # مُهر اعتماد دیجیتال
```

---

## نکات فنی

### انیمیشن‌ها
- هر سکشن از IntersectionObserver اختصاصی خودش استفاده می‌کند (قابل refactor به AnimateOnScroll)
- انیمیشن‌ها فقط روی `opacity` و `transform` (compositor-friendly)
- `prefers-reduced-motion` تمام انیمیشن‌ها را غیرفعال می‌کند
- `@keyframes ripple` برای افکت دکمه فرم تماس
- `animate-[spin_120s_linear_infinite]` برای چرخش آهسته پس‌زمینه گره هیرو

### متغیرهای CSS
```css
:root {
  --color-bg: #F8F6F3;
  --color-text: #1A1A2E;
  --color-primary: #0F172A;
  --color-accent: #D97706;
  --color-tech: #0D9488;
  --color-surface: #ffffff;
  --color-card: #ffffff;
  --color-border: rgba(26, 26, 46, 0.08);
}
```

### دستورات
```bash
npm run dev          # توسعه
npm run build        # بیلد پروژه
npm start            # اجرای بیلد شده
```

---

## کارهای باقی‌مانده

### متون و محتوا
- [ ] ایمیل واقعی (جایگزین "به‌زودی...")
- [ ] لینک اینستاگرام واقعی (جایگزین "به‌زودی...")
- [ ] لینک لینکدین و گیت‌هاب واقعی
- [ ] پروژه‌های واقعی در نمونه کارها
- [ ] پست‌های وبلاگ واقعی

### بخش‌های جدید
- [ ] بخش نظرات مشتریان (Testimonials)
- [ ] پس‌زمینه متحرک اختصاصی برای هر سکشن

### فنی
- [ ] استقرار روی Vercel یا سرور شخصی
- [ ] Backend برای فرم تماس (API route)
- [ ] استفاده از `AnimateOnScroll` برای حذف کد تکراری IntersectionObserver
