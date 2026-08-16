# Session Log — ArdalaN

## تاریخ: ۲۶ تیر ۱۴۰۴

### کارهای انجام شده
- انتشار سایت روی Netlify
- GitHub push (branch: main)
- رفع مشکل احراز هویت GitHub (با `gh auth login`)
- اضافه کردن `.freebuff/` به `.gitignore`

### وضعیت
- ریپازیتوری: https://github.com/ardijon/-ardalan-site.git
- سایت لایو: https://ardalanpiri.netlify.app (قبلاً: adorable-pudding-04029c.netlify.app)
- Netlify dashboard: https://app.netlify.com (ورود با modirebours@gmail.com)

### نکات فنی
- Netlify از `netlify.toml` استفاده می‌کنه (Next.js plugin)
- Deploy خودکار از GitHub main branch
- برای تغییرات جدید: commit روی main → push → Netlify خودکار دیپلوی می‌کنه

### دسترسی‌ها
- GitHub CLI (`gh`) نصب و لاگین شده
- Netlify حساب با Gmail: modirebours@gmail.com (GitHub متصل شده)

---

## تاریخ: ۱۵ آگوست ۲۰۲۶

### کارهای انجام شده — راه‌اندازی دموی توانا

#### ۱. انتشار دموی توانا روی Cloudflare Workers
- پروژه `manager-tavana` از `D:\New Projects\Insurance\manager-tavana`
- ریپازیتوری: https://github.com/ardijon/insurance-recruit-template.git
- سایت دمو: https://insurance-recruit-template.ai2ai.workers.dev
- Cloudflare dashboard: https://dash.cloudflare.com (ورود با modirebours@gmail.com)
- Workers Builds: اتصال GitHub → build + deploy خودکار

#### ۲. رفع مشکل demoUrl در فروشگاه ArdalaN
- `demoUrl` از `http://localhost:3005` به `https://insurance-recruit-template.ai2ai.workers.dev` تغییر کرد
- فایل: `src/data/products.json`

#### ۳. رفع خطاهای build در Netlify
| مشکل | راه‌حل | فایل |
|-------|--------|------|
| Node.js version mismatch | `NODE_VERSION` از 18 به 22 تغییر کرد | `netlify.toml` |
| Demo mode disabled in production | چک `NODE_ENV=production` حذف شد | `middleware.ts` |
| `middleware.ts` deprecated | Next.js 16 از `proxy.ts` استفاده می‌کنه | `proxy.ts` |
| database is locked (build) | `ensureSchema()` در demo mode هنگام build skip می‌شه | `lib/db.ts` |
| صفحه اصلی خالی | Hardcoded demo data اضافه شد | `app/page.tsx` |
| Layout دیتابیس نداره | Conditional DB import در demo mode | `app/layout.tsx` |

#### ۴. امنیت
| مشکل | وضعیت | فایل |
|-------|-------|------|
| SESSION_SECRET نبود | ✅ تنظیم شد | `netlify.toml` |
| HSTS header نبود | ✅ اضافه شد | `next.config.ts` |
| rate limiting در demo | ✅ `DEMO_MODE=true` runtime تنظیم شد | Netlify env vars |
| Middleware فایل اشتباه | ✅ `proxy.ts` با export `proxy` | `proxy.ts` |

#### ۵. قابلیت جدید
- دکمه خرید شناور (sticky CTA) به صفحه دمو اضافه شد
- متن: "همین قالب رو برای خودت بساز — ۱۴,۹۰۰,۰۰۰ تومان"
- لینک: `https://ai2apps.sbs/store/tavana`
- فایل: `app/demo/demo-client.tsx`

### معماری دمو ( Hybrid Model )
```
ArdalaN (ai2apps.sbs)
  └── صفحه فروشگاه → دکمه "مشاهده دمو" → لینک به دموی جداگانه

insurance-recruit-template (insurance-recruit-template.ai2ai.workers.dev)
  └── دموی کامل توانا (صفحه اصلی + پنل ادمین + فرم درخواست)
  └── Hardcoded demo data (بدون نیاز به دیتابیس)
  └── DEMO_MODE=true (auth و rate limiting غیرفعال)
```

### نکات فنی مهم
1. **Next.js 16**: فایل middleware به `proxy.ts` تغییر نام داده شده و export باید `proxy` باشه
2. **Cloudflare Workers**: از `@opennextjs/cloudflare` استفاده می‌کنه (نه Pages)
3. **Demo Mode**: `DEMO_MODE=true` در `wrangler.toml` [vars] تنظیم شده
4. **SESSION_SECRET**: باید یک مقدار تصادفی 64+ کاراکتری باشه

### وضعیت فعلی
- ✅ سایت اصلی ArdalaN: https://ai2apps.sbs
- ✅ دموی توانا: https://insurance-recruit-template.ai2ai.workers.dev
- ✅ دکمه خرید شناور روی دمو
- ✅ داده‌های نمونه در صفحه اصلی و دمو
- ✅ بدون فیلترشکن باز میشه

### دسترسی‌ها
- Cloudflare حساب با Gmail: modirebours@gmail.com
- GitHub: لاگین شده
- Workers Builds: اتصال GitHub فعال
