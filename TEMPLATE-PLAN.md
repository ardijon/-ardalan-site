# ArdalaN Template Engine — Plan

## هدف
تبدیل سایت شخصی به **موتور سازنده سایت تک‌صفحه‌ای** که با تغییر چند فایل config، برای هر کسب‌وکاری آماده بشه.

---

## ۱. معماری پوشه‌ها

```
src/
├── config/                    # ★ قلب سیستم — فقط اینجا رو تغییر بده
│   ├── index.js              #   لودر همه configها
│   ├── site.js               #   نام، برند، بیو، دامنه
│   ├── theme.js              #   پالت رنگی، فونت، تم
│   ├── sections.js           #   ترتیب سکشن‌ها + variant انتخابی
│   ├── hero.js               #   محتوای Hero
│   ├── about.js              #   بیو + آمار
│   ├── services.js           #   خدمات (قابل تنظیم برای هر صنف)
│   ├── portfolio.js          #   نمونه‌کارها
│   ├── resume.js             #   رزومه / تایم‌لاین
│   ├── blog.js               #   مقالات وبلاگ
│   ├── contact.js            #   اطلاعات تماس
│   └── seo.js                #   SEO, OG, Schema
│
├── components/
│   ├── variants/             # ★ تمپلت‌های مختلف برای هر سکشن
│   │   ├── HeroVariantA.js   #   طرح فعلی (عکس + متن + CTA)
│   │   ├── HeroVariantB.js   #   طرح تمام‌صفحه با video bg
│   │   ├── HeroVariantC.js   #   طرح مینیمال (فقط متن)
│   │   ├── ServicesVariantA.js  # کارت‌های ۲×۲
│   │   ├── ServicesVariantB.js  # لیست خطی
│   │   ├── PortfolioVariantA.js # گرید با modal
│   │   ├── PortfolioVariantB.js # اسلایدر
│   │   └── ...
│   │
│   ├── layout/               #   هدر، فوتر، wrapper
│   ├── core/                 #   کامپوننت‌های مشترک (button, card, etc.)
│   └── sections/             #   انتخاب‌کننده variant بر اساس config
│
├── themes/                   # ★ پالت‌های رنگی آماده
│   ├── default.js            #   فعلی (سرمه‌ای‌طلایی)
│   ├── minimal.js            #   سیاه‌وسفید
│   ├── creative.js           #   رنگ‌های جسورانه
│   └── corporate.js          #   آبی شرکتی
│
├── lib/
│   ├── configLoader.js       #   لودر داینامیک config
│   └── ...
│
└── app/
    ├── page.js               #   رندر داینامیک سکشن‌ها از config
    └── layout.js             #   تم + فونت از config
```

---

## ۲. جریان کار (Data Flow)

```
config/site.js ──→ layout/Header (نام، لوگو)
config/theme.js ──→ globals.css (متغیرهای CSS)
config/sections.js ──→ page.js (ترتیب سکشن‌ها)
config/hero.js ──→ variants/HeroVariant{A,B,C} (محتوای سکشن)
config/services.js ──→ variants/ServicesVariant{A,B}
...
```

**page.js:**
```js
import config from '@/config'
import SectionRenderer from '@/components/sections/SectionRenderer'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {config.sections.map(section => (
          <SectionRenderer key={section.name} {...section} />
        ))}
      </main>
      <Footer />
    </>
  )
}
```

---

## ۳. ساختار Config فایل‌ها

### site.js
```js
export default {
  brand: 'Ardalan',              // نام برند
  title: 'اردلان | خدمات فناوری و بیمه',
  description: 'توسعه‌دهنده نرم‌افزار | متخصص هوش مصنوعی',
  url: 'https://ardalanpiri.netlify.app',
  locale: 'fa',                  // زبان پیش‌فرض
  direction: 'rtl',
}
```

### sections.js
```js
export default [
  { name: 'hero',     variant: 'A', active: true },
  { name: 'about',    variant: 'A', active: true },
  { name: 'services', variant: 'A', active: true, items: [...] },
  { name: 'portfolio', variant: 'A', active: true },
  { name: 'resume',   variant: 'A', active: true },
  { name: 'blog',     variant: 'A', active: true },
  { name: 'contact',  variant: 'A', active: true },
  { name: 'testimonials', variant: 'A', active: false },  // optional
]
```

### theme.js
```js
export default {
  palette: 'default',           // اسم پالت از src/themes/
  font: 'Vazirmatn',
  borderRadius: 'xl',           // rounded-xl
  glassEffect: true,             // هدر شیشه‌ای
}
```

---

## ۴. معماری Variant ها

هر سکشن چند variant داره. page.js نمیدونه کدوم variant رندر میشه — فقط `SectionRenderer` بر اساس اسم variant انتخاب می‌کنه:

```js
// components/sections/HeroRenderer.js
import HeroVariantA from '@/components/variants/HeroVariantA'
import HeroVariantB from '@/components/variants/HeroVariantB'

const registry = {
  'A': HeroVariantA,
  'B': HeroVariantB,
}

export default function HeroRenderer(props) {
  const Component = registry[props.variant] || HeroVariantA
  return <Component {...props} />
}
```

---

## ۵. Business Types (پیش‌تنظیمات صنفی)

فایل‌هایی که مشخص می‌کنن برای هر صنف چه سکشن‌هایی با چه variantهایی فعال باشه:

```
src/
└── presets/
    ├── developer.js     # توسعه‌دهنده نرم‌افزار
    ├── consultant.js    # مشاور کسب‌وکار
    ├── doctor.js        # پزشک
    ├── photographer.js  # عکاس
    ├── freelancer.js    # فریلنسر عمومی
    └── agency.js        # آژانس دیجیتال
```

### مثال developer.js
```js
export default {
  name: 'توسعه‌دهنده نرم‌افزار',
  sections: [
    { name: 'hero',     variant: 'A' },
    { name: 'about',    variant: 'A', stats: ['experience', 'projects', 'clients'] },
    { name: 'services', variant: 'A' },
    { name: 'portfolio', variant: 'A' },
    { name: 'resume',   variant: 'A' },
    { name: 'blog',     variant: 'A' },
    { name: 'contact',  variant: 'A' },
  ],
  theme: 'default',
}
```

---

## ۶. تمپلت‌های رنگی

| نام | کاربرد | رنگ اصلی | رنگ دوم |
|-----|--------|---------|---------|
| default | فناوری، بیمه | سرمه‌ای #0F172A | طلایی #D97706 |
| minimal | شخصی، هنری | مشکی #111 | سفید #fff |
| creative | استارتاپ، مدرن | بنفش #7C3AED | صورتی #EC4899 |
| corporate | شرکتی | آبی #2563EB | طوسی #475569 |
| nature | سلامت، طبیعت | سبز #059669 | کرم #FDE68A |

---

## ۷. استراتژی انتشار

1. **برنچ جدید** `template-plan` از `main` جدا میشه
2. همه تغییرات توی برنچ انجام میشه
3. بعد از تست کامل، merge به `main`
4. برای مشتری جدید: clone، عوض کردن `config/`، تغییر دامنه، deploy

---

## ۸. قیمت‌گذاری نهایی

| بسته | شامل | قیمت (تومان) |
|------|------|-------------|
| **پایه** | config شخصی‌سازی شده + تحویل Next.js پروژه | ۳-۵ میلیون |
| **حرفه‌ای** | config + انتخاب تمپلت + راه‌اندازی Netlify + دامنه | ۸-۱۲ میلیون |
| **VIP** | همه موارد + صفحه ادمین داخلی + پشتیبانی ۳ ماهه | ۲۰-۳۰ میلیون |

---

## ۹. گام‌های اجرایی

- [ ] ایجاد ساختار `src/config/` و فایل‌های اولیه
- [ ] ایجاد `SectionRenderer` و سیستم variant
- [ ] انتقال محتوای فعلی به config فایل‌ها
- [ ] ایجاد ۲-۳ تمپلت رنگی
- [ ] ایجاد ۲ variant برای Hero
- [ ] ایجاد business type presets
- [ ] ریفکتور page.js به رندر داینامیک
- [ ] تست کامل با سایت فعلی
- [ ] مستندسازی برای استفاده (README)
- [ ] آموزش Git workflow برای پروژه‌های جدید
