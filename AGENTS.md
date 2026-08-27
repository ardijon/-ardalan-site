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

---

## تاریخ: ۲۰ آگوست ۲۰۲۶

### کارهای انجام شده — بازبینی و رفع باگ‌های پنل مدیریت + حذف Netlify

> **توجه:** بخش‌های قدیمی‌تر این فایل که به Netlify اشاره می‌کنند تاریخی هستند.
> پروژه کاملاً روی **Cloudflare Workers** است و `netlify.toml` حذف شده.

#### ۰. حذف کامل Netlify
| مورد | اقدام |
|------|-------|
| `netlify.toml` | حذف شد |
| `NODE_VERSION=20` (از netlify.toml) | جایگزین: فایل `.node-version` با مقدار `22` |
| دستور build و پوشه انتشار | از قبل در `wrangler.toml` بود |
| متغیرهای محیطی پنل Netlify | در `wrangler.toml` مستند شد (`wrangler secret put`) |
| هدر `x-nf-client-connection-ip` | حذف شد — **باگ امنیتی** (توضیح در بخش ۳) |
| اشاره‌های Netlify در مستندات | به Cloudflare Workers به‌روز شد |

#### ۱. باگ‌هایی که پنل را می‌شکستند
| باگ | علت | فایل |
|-----|------|------|
| آمار سفارش‌ها همیشه `{}` | `getOrderStats()` بدون `await` | `api/admin/orders/route.js` |
| دیپلوی همیشه ۴۰۰ | `getOrderById()` بدون `await` → همیشه truthy | `api/admin/deploy/route.js` |
| تب سفارشات در حلقه بی‌نهایت | `useCallback` ناپایدار در deps افکت | `components/Admin/OrderManagement.js` |
| از دست رفتن focus در هر کلید | `InputField`/`ArrayField` داخل بدنه‌ی رندر | `app/admin/page.js` |
| `getDeploymentStatus` بدون await | خواندن `.deployment` از Promise | `lib/deployer.js` |

#### ۲. امنیت
| باگ | وضعیت | فایل |
|-----|-------|------|
| OTP تشریفاتی بود (با Basic Auth می‌شد دورش زد) | ✅ نشست فقط بعد از تایید OTP صادر می‌شود | `lib/admin-auth.js` |
| رمز در هر درخواست ارسال می‌شد | ✅ کوکی نشست امضاشده‌ی HMAC (۸ ساعت) | `lib/admin-auth.js` |
| مقایسه‌ی رمز با `===` (نشت زمانی) | ✅ مقایسه‌ی constant-time با HMAC | `lib/admin-auth.js` |
| بدون محدودیت حمله‌ی حدس رمز | ✅ ۵ تلاش / ۱۵ دقیقه (تست شد: ۴۰۱×۵ سپس ۴۲۹) | `lib/admin-auth.js` |
| ۴ نسخه کپی‌شده از checkAuth/checkCsrf | ✅ یک `guardAdminRoute` مشترک | `lib/admin-auth.js` |
| slug بدون اعتبارسنجی (خطر path traversal) | ✅ الگوی `^[a-z0-9-]+$` | `api/admin/products/route.js` |

#### ۳. باگ امنیتی به‌جامانده از Netlify
`lib/request-ip.js` هدر `x-nf-client-connection-ip` را **با اولویت بالاتر از**
`cf-connecting-ip` می‌خواند. بعد از مهاجرت به Cloudflare هیچ‌کس آن هدر را ست
نمی‌کرد، پس هر کسی می‌توانست خودش بفرستد و در هر درخواست یک سطل rate-limit تازه
بگیرد — یعنی محدودیت حدس رمز عملاً بی‌اثر می‌شد.
اکنون `cf-connecting-ip` (که فقط لبه‌ی Cloudflare ست می‌کند و قابل جعل نیست)
مرجع است و در صورت وجود، هیچ fallback دیگری بررسی نمی‌شود.

#### ۴. پایداری داده روی Workers
Workers فایل‌سیستم قابل‌نوشتن ندارد و هر درخواست ممکن است در isolate دیگری اجرا
شود. سه چیز در محیط واقعی خراب بود:
1. `storeOtp` کد را در حافظه‌ی یک isolate می‌نوشت و `verifyOtp` در isolate دیگر
   آن را پیدا نمی‌کرد → **ورود به پنل هرگز موفق نمی‌شد**
2. سفارش‌ها و ویرایش محصولات روی `src/data/*.json` نوشته می‌شد و از بین می‌رفت
3. `products.js` با `import` ساخت‌زمان کار می‌کرد → ویرایش‌های ادمین تا rebuild
   بعدی روی سایت دیده نمی‌شد

راه‌حل: `src/lib/storage.js` با دو درایور —
**Cloudflare KV** در محیط واقعی و **فایل** در حالت لوکال.
`orders.js`، `otp.js` و مسیر محصولات از این لایه استفاده می‌کنند.
مرز سرور/کلاینت: `lib/products.js` داده‌ی ساخت‌زمان (امن برای کلاینت) و
`lib/products-server.js` داده‌ی زنده (فقط سرور).

**⚠️ اقدام دستی لازم — تا انجام نشود سفارش‌ها در محیط واقعی ذخیره نمی‌شوند:**
```
npx wrangler kv namespace create SITE_KV
npx wrangler kv namespace create SITE_KV --preview
```
سپس بخش `[[kv_namespaces]]` در `wrangler.toml` را از حالت کامنت دربیاورید و
id‌ها را بگذارید.

#### ۵. دیپلوی (`lib/deployer.js`)
- `child_process` و `fs` از سطح ماژول به import داینامیک منتقل شدند؛ قبلاً کل
  مسیر `/api/admin/deploy` روی Workers هنگام بارگذاری می‌شکست
- شکست build دیگر سفارش را `rejected` نمی‌کند. رد کردن یک تصمیم مالی است، نه
  نتیجه‌ی build — سفارش `approved` می‌ماند تا ادمین بتواند دوباره تلاش کند
- پیش‌نیازها قبل از هر تغییر وضعیت بررسی می‌شوند و پیام خطای روشن برمی‌گردد

#### ۶. باگ داده‌خور در تست‌ها (`jest.setup.js`, `lib/storage.js`) 🔴

هر سه فایل `__tests__/orders.test.js`، `admin.test.js` و `receipt.test.js` در
`beforeEach` دستور `writeFileSync(path.join(process.cwd(),'src/data/orders.json'),'[]')`
را اجرا می‌کردند — یعنی **هر اجرای `npm test` سفارش‌های واقعی سایت را پاک می‌کرد**.
این باگ از قبل موجود بود و در همین نشست هم عمل کرد.

راه‌حل:
- `lib/storage.js` مسیر داده را از `process.env.DATA_DIR` می‌خواند (پیش‌فرض `src/data`)
- `jest.setup.js` (جدید، در `setupFiles` کانفیگ Jest) آن را به
  `.jest-data/worker-<n>/` می‌برد — یک پوشه به‌ازای هر worker، پس اجرای موازی هم امن است
- `fileWrite` قبل از نوشتن پوشه را `mkdir -p` می‌کند
- `.jest-data/` به `.gitignore` اضافه شد

اثبات: هش `src/data/orders.json` قبل و بعد از `npx jest` یکسان ماند و
`.jest-data/worker-1/orders.json` ساخته و استفاده شد.

بازیابی: ۱۰ سفارش commit‌شده از `git show HEAD:src/data/orders.json` با ۱ سفارش
جدید روی دیسک ادغام شد (۱۱ سفارش، بدون تکرار، مرتب بر اساس `createdAt`).
نسخهٔ پشتیبان در `src/data/orders.backup-committed.json`. همه دادهٔ آزمایشی بود.

#### ۷. خطای ورود به پنل: «خطا در ارسال کد تایید» (`lib/otp.js`, `api/admin/otp/route.js`)

**علت واقعی:** تلگرام پاسخ می‌داد
`{"ok":false,"error_code":400,"description":"Bad Request: chat not found"}`.
ربات‌های تلگرام اجازه ندارند خودشان گفتگو را شروع کنند — تا ادمین به ربات
`/start` نداده باشد، `sendMessage` شکست می‌خورد. توکن و `ADMIN_TELEGRAM_ID`
هر دو از ابتدا درست بودند.

**دو باگ کد که تشخیص را غیرممکن کرده بود:**
- `sendOtpViaTelegram` فقط `res.ok` را برمی‌گرداند و فیلد `description`
  تلگرام را دور می‌ریخت → پیام کلی، بدون هیچ سرنخی در لاگ
- تلگرام خطاهای منطقی را در بدنهٔ پاسخ (`ok:false`) هم اعلام می‌کند، نه فقط با
  کد HTTP؛ پس `res.ok` تنها معیار قابل‌اعتمادی نبود

**اصلاح:** تابع حالا `{ ok, reason, botUsername }` برمی‌گرداند و
`otpSendError()` در route آن را به پیام قابل‌اقدام تبدیل می‌کند —
`chat_not_started` / `bot_blocked` / `bad_token` / `network` / `not_configured`.
در حالت `chat_not_started` نام ربات با `getMe` گرفته می‌شود تا پیام بگوید به
کدام ربات `/start` بدهید.

⚠️ نکته: `if (!sent)` قدیمی با آبجکت جدید همیشه `false` می‌شد — یعنی شکست ارسال
به‌عنوان موفقیت گزارش می‌شد. مصرف‌کننده هم‌زمان اصلاح شد.

**تأیید عملی:** رمز غلط → ۴۰۱ | رمز درست → ۲۰۰ و کد در تلگرام | کد غلط →
«کد تایید اشتباه است» (نه «ارسال نشده») که یعنی ذخیره و بازخوانی OTP سالم است |
بدون Origin → ۴۰۳.

#### ۸. KV فعال شد

`wrangler.toml` حالا binding واقعی دارد:
`SITE_KV` = `76de247968e348f5818c9947b464d93d`.
`preview_id` تنظیم نشده — فقط برای `wrangler dev` / `opennextjs-cloudflare
preview` لازم است و دستورش در همان فایل کامنت شده.

#### ۹. تغییر دامنه — چه چیزی لازم است

دامنه در **کل پروژه فقط یک جا** hardcode شده: `src/lib/constants.js` →
`SITE_URL`. بقیه (`layout.js` برای metadataBase/canonical/OG/hreflang،
`robots.js`، `sitemap.js`، `blog/[slug]/page.js`) همان را import می‌کنند.

`checkCsrf` در `lib/admin-auth.js` دامنه‌ی ثابتی ندارد و `origin` را با `host`
خود درخواست مقایسه می‌کند، پس پنل روی هر دامنه‌ای بدون تغییر کار می‌کند.

مراحل: (۱) یک خط `SITE_URL` — (۲) اتصال دامنه‌ی جدید به Worker `ardalan-site`
در داشبورد Cloudflare — (۳) `build` و `deploy` — (۴) redirect دامنه‌ی قدیم
برای حفظ رتبه‌ی گوگل.

⚠ لینک `https://ai2apps.sbs/store/tavana` روی دموی توانا در پروژه‌ی **دیگری**
است (`manager-tavana` → `app/demo/demo-client.tsx`) و باید جدا عوض شود.

#### ۱۰. نقشه‌ی جایگزین: اجرا روی هاست ایرانی (اگر Cloudflare بسته شد)

وابستگی کد به Cloudflare فقط دو نقطه است و هر دو fallback دارند:

| نقطه | فایل | رفتار بدون Cloudflare |
|------|------|------------------------|
| ذخیره‌سازی | `lib/storage.js:40` | binding `SITE_KV` نیست → درایور فایل روی `DATA_DIR` |
| تشخیص IP | `lib/request-ip.js:41` | `cf-connecting-ip` نیست → `x-forwarded-for` / `x-real-ip` |

دو قابلیتی که روی Workers خراب‌اند، روی هاست Node **سالم می‌شوند**: آپلود رسید،
و دیپلوی خودکار (`deployer.js` که `child_process` می‌خواهد).

**پشتیبان‌گیری — الان و به‌صورت دوره‌ای انجام دهید:**
```
bash scripts/kv-backup.sh
```
KV فقط داخل Cloudflare است. این اسکریپت کلیدهای `collection:*` را در قالبی
می‌ریزد که **درایور فایل بی‌واسطه می‌خواند** (`collection:orders` →
`orders.json`)، پس بازیابی فقط کپی فایل است. کلیدهای `otp:*` رد می‌شوند (۳
دقیقه‌ای‌اند). خروجی در `backups/` که در `.gitignore` است چون سفارش واقعی دارد.

**راه‌اندازی روی VPS (Node 22):**
```
git clone … && npm ci
mkdir -p /var/lib/ardalan-data && cp backups/kv-<stamp>/*.json /var/lib/ardalan-data/
# در .env.local:  DATA_DIR=/var/lib/ardalan-data  (بیرون از ریپو — مهم)
npm run build && pm2 start "npm start" --name ardalan
```

⚠ **دو تله‌ی واقعی که باید بدانید:**

1. `src/data/*.json` در git commit شده‌اند. اگر `DATA_DIR` را تنظیم نکنید، هر
   `git pull` روی سرور سفارش‌های زنده را overwrite می‌کند. برای همین `DATA_DIR`
   باید مطلق و بیرون از ریپو باشد و در `.env.example` مستند شد.

2. `x-forwarded-for` توسط کلاینت قابل جعل است. Nginx به‌طور پیش‌فرض آن را
   **append** می‌کند، پس مهاجم با فرستادن هدر خودش اولین IP لیست می‌شود و
   `extractClientKey` همان را برمی‌دارد → محدودیت حدس رمز دور می‌خورد. در
   Nginx باید **overwrite** شود:
   ```
   proxy_set_header X-Forwarded-For $remote_addr;   # نه $proxy_add_x_forwarded_for
   proxy_set_header X-Real-IP       $remote_addr;
   ```
   نکته‌ی مثبت: محدودیت نرخ روی هاست Node تک‌پروسه بهتر از Workers کار می‌کند،
   چون حافظه‌ی مشترک است نه per-isolate.

#### ۱۱. باگ: `DATA_DIR` مطلق بی‌صدا نادیده گرفته می‌شد (`lib/storage.js`)

`dataFilePath` از `path.join(process.cwd(), DATA_DIR, …)` استفاده می‌کرد.
`path.join` با مسیر مطلق reset نمی‌شود، پس `DATA_DIR=/var/lib/ardalan-data`
تبدیل می‌شد به `<repo>/var/lib/ardalan-data/` — سایت **صفر سفارش** گزارش
می‌داد بدون هیچ خطایی. با `path.resolve` جایگزین شد؛ مسیر نسبی (که Jest
استفاده می‌کند) بدون تغییر کار می‌کند.

اثبات: خواندن و نوشتن با `DATA_DIR` مطلق تست شد، مسیر نسبی هم تست شد،
۳۱/۳۱ Jest پاس، هش `src/data/orders.json` قبل و بعد یکسان.

### باقی‌مانده (نیاز به تصمیم/تنظیم شما)
1. **رسیدهای پرداخت** — روی `public/uploads/receipts/` نوشته می‌شوند که در
   Workers کار نمی‌کند. برای ذخیره‌ی واقعی به **R2** نیاز است. فعلاً نمایش‌دهنده‌ی
   رسید به‌جای عکس خراب، پیام «تصویر رسید موجود نیست» می‌دهد
2. **پوشه‌ی `products/`** — وجود ندارد، پس دیپلوی حتی روی سرور Node هم بدون آن
   کار نمی‌کند
3. **سفارش‌های آزمایشی** — ۱۱ سفارش موجود همه آزمایشی است. اگر می‌خواهید پنل
   تمیز شود: `echo "[]" > src/data/orders.json` (پشتیبان بالا حفظ می‌شود)
4. **secrets روی Worker** — متغیرهای `.env.local` فقط محلی‌اند. برای محیط واقعی:
   `npx wrangler secret put <NAME>` برای هر شش مورد فهرست‌شده در `wrangler.toml`

> **شمارنده‌ی بازدید حذف شد** (به‌جای تعمیر). `api/visitors`، `VisitorCounter.js`،
> پوشه‌ی `worker/` و کلید `visitor.label` همه پاک شده‌اند. دلیل: عدد در فوتر
> باربر هیچ تصمیمی نبود و مسیرش روی فایل می‌نوشت که در Workers بی‌اثر است. اگر
> روزی آمار بازدید لازم شد، از صفر روی `lib/storage.js` نوشته شود — با این نکته
> که KV مقایسه-و-جایگذاری ندارد، پس شمارنده‌ی خواندن-افزودن-نوشتن زیر بار
> همزمان افزایش‌ها را گم می‌کند.

### تست‌ها
- Jest: ۳۱ از ۳۱ پاس (تست‌های OTP با API async هم‌راستا شد + یک تست جدید برای
  شمارش پایدار تلاش‌های ناموفق)
- ESLint: بدون خطا (۲ warning قدیمی درباره‌ی `<img>`)

---

## نقطه‌ی شروع نشست بعدی — ۲۰ آگوست ۲۰۲۶

### وضعیت ROADMAP: فاز ۱ و ۲ کامل، فاز ۳ شروع نشده

| گام | وضعیت | شاهد در کد |
|-----|-------|-------------|
| ۱.۱ اطلاعات پرداخت در env | ✅ | `api/payment-info/route.js` + `.env.example` |
| ۱.۲ مبلغ منحصربفرد | ✅ | `lib/orders.js:38` `generateUniqueAmount` |
| ۱.۳ تست مسیرهای پولی | ✅ | `__tests__/` — ۳۱ تست پاس |
| ۱.۴ رفع باگ‌ها | ✅ | بخش‌های ۱ تا ۱۱ همین فایل |
| ۱.۵ مسیر پلن Pro (ZIP) | ✅ | `lib/deployer.js:106` `createZipPackage` |
| ۲.۱ صفحه پنل ادمین | ✅ | `app/admin/page.js` + `Admin/OrderManagement.js` |
| ۲.۲ مشاهده رسید | ✅ **رفع شد — ۲۱ آگوست** | `lib/blob.js` + `api/admin/receipt/[filename]/` |
| ۲.۳ قالب‌های پیام | ✅ | `OrderManagement.js:322` |
| ۲.۴ احراز هویت دو لایه (OTP) | ✅ | `lib/admin-auth.js` + `api/admin/otp/` |
| ۲.۵ تست پنل | ✅ | `__tests__/admin.test.js` |
| **فاز ۳ درگاه پرداخت** | 🔲 **شروع نشده** | هیچ webhook یا route درگاهی وجود ندارد |

### ✅ مسدودکننده‌ی مسیر پول — رفع شد (۲۱ آگوست ۲۰۲۶)

گام ۲.۲ در کد کامل بود اما روی Workers کار نمی‌کرد: آپلود با `fs.writeFile` روی
`public/uploads/receipts/` می‌رفت و Workers فایل‌سیستم نوشتنی ندارد. خرابی
**بی‌صدا** بود — آپلود ۲۰۰ برمی‌گرداند، سفارش به `receipt_uploaded` می‌رفت، و بعد
ادمین «تصویر رسید موجود نیست» می‌دید و راهی برای تطبیق مبلغ با فیش بانکی نداشت.

**راه‌حل: R2 در دسترس نبود، پس KV.** `wrangler r2 bucket create` خط موفقیت چاپ
می‌کند ولی دروغ است: API هر تماس R2 را با
`Please enable R2 through the Cloudflare Dashboard [code: 10042]` رد می‌کند و
فعال‌سازی R2 در داشبورد حتی برای پلن رایگان **روش پرداخت** می‌خواهد. بدتر: اگر
`[[r2_buckets]]` در `wrangler.toml` بماند، خودِ `deploy` شکست می‌خورد.

پس `src/lib/blob.js` با سه درایور نوشته شد (همان الگوی `storage.js`):
R2 اگر باشد ← وگرنه KV ← وگرنه فایل‌سیستم برای `next dev`. تولید امروز روی KV
است (مقادیر باینری تا ۲۵ مگابایت، آپلود سقف ۵ مگابایت). سوئیچ به R2 در آینده
**هیچ تغییر کدی نمی‌خواهد** — فقط فعال‌سازی R2، از کامنت درآوردن بلوک در
`wrangler.toml`، و انتقال رسیدهای موجود از KV (درایورها داده‌ی هم را نمی‌خوانند).

**یک نقص امنیتی هم بسته شد:** رسیدها قبلاً فایل استاتیک عمومی روی
`/uploads/receipts/<filename>` بودند و نام فایل از شناسه‌ی سفارش (که به مشتری
داده می‌شود) + timestamp ساخته می‌شود — یعنی حدس‌زدنی. الان از
`/api/admin/receipt/<filename>` سرو می‌شوند که سشن ادمین لازم دارد و
`Cache-Control: private, no-store` می‌فرستد.

**تایید روی تولید (نسخه‌ی `69961b06`):** سفارش ساخته شد ← رسید آپلود شد (۲۰۰) ←
بایت‌های ذخیره‌شده در KV با فایل ارسالی **بایت‌به‌بایت یکسان** بودند (۶۹ بایت،
PNG magic سالم) ← مسیر ادمین بدون سشن ۴۰۱ داد ← مسیر عمومی قدیمی ۴۰۴ داد.
داده‌ی آزمایشی بعد از تایید از KV پاک شد.

**یک باگ فرعی هم رفع شد:** POST بدون body باعث می‌شد `request.formData()` استثنا
بدهد و در catch به **۵۰۰** «خطا در آپلود رسید» تبدیل شود — خطای کلاینت شبیه
خرابی سرور دیده می‌شد. الان **۴۰۰** «درخواست نامعتبر است» برمی‌گرداند (روی تولید
تایید شد).

**پوشش تست: ۳۱ → ۹۳ تست.** دو فایل جدید:
- `__tests__/blob.test.js` (۴۵ تست) — هر سه درایور جدا، رفت‌وبرگشت بایت‌ها،
  انتخاب درایور، و ۱۰ ورودی مخرب برای `assertSafeName` روی هر سه عمل.
- `__tests__/receipt-routes.test.js` (۱۷ تست) — هر دو route با binding قلابی
  شبیه R2. هر تست موفق، بلاب را **واقعاً می‌خواند**؛ چون تست «۲۰۰ برگشت» همان
  باگ اصلی را هم پاس می‌کرد.
  تست ۴۰۰ با برگرداندن موقت کد به حالت قبل بررسی شد: بدون رفع، ۵۰۰ می‌داد.

### وضعیت داده — مهم

- KV تولید **خالی است** (`[]`). هیچ سفارش واقعی روی سایت ثبت نشده.
- ۱۱ سفارش در `src/data/orders.json` همه **محلی و آزمایشی**‌اند و روی تولید نیستند.
- پس `scripts/kv-backup.sh` الان چیزی برای پشتیبان‌گیری ندارد. از اولین سفارش
  واقعی به بعد معنا پیدا می‌کند.

### ترتیب پیشنهادی برای نشست بعدی

۱. ~~**R2 برای رسیدها**~~ — ✅ انجام شد (بخش بالا). مسیر پول باز است.
۲. **ارتقاهای پنل مدیریت** ← **کار بعدی**. فاز ۳ به «مشاوره حسابدار و ثبت
   کسب‌وکار» (گام ۳.۱) گره خورده که مسدودکننده‌ی کاری است نه کدی. تا آن حل شود،
   وقت آزاد صرف پنل شود.
۳. **فاز ۳ درگاه پرداخت** — بعد از تعیین تکلیف ثبت کسب‌وکار. سه باگ شناسایی‌شده
   در بخش پنجم ROADMAP (امضای HMAC وبهوک، idempotency، تلورانس `matchPayment`)
   باید همان موقع اعمال شوند، نه بعداً.

### ممیزی تم روشن و تاریک — خواسته‌ی ۲۴ آگوست ۲۰۲۶ (انجام نشده)

کاربر خواسته **یک‌بار هر دو تم سرتاسری بررسی و ایرادهایشان رفع شود** تا زیباتر
شوند و کلاس سایت بالاتر برود. جای کامل شرح: `ROADMAP.md` بخش سوم (مشکلات UI/UX).

خلاصه‌ی چیزی که از قبل پیدا شده — دو سامانه‌ی رنگ موازی کار می‌کنند:

- `globals.css` توکن‌های `--color-*` را در `:root` و `.dark` تعریف می‌کند. هر رنگی
  که از این توکن‌ها بیاید، با عوض شدن تم خودش عوض می‌شود. این سامانه‌ی درست است.
- اما حدود **۱۰۵ کلاس رنگ ثابت** (`bg-white`، `text-gray-500`، `border-slate-200`)
  در **۲۹ فایل** `src/` مانده که تم‌کورند و در یکی از دو تم کنتراست را می‌شکنند؛
  و فقط **۲۰** واریانت `dark:` در ۱۰ فایل هست، یعنی وصله‌ها ناقص‌اند.

کار درست ترجمه‌ی کلاس‌های ثابت به توکن‌ها و برداشتن `dark:`های تکراری است، نه
افزودن `dark:` بیشتر — سه مکانیزم رنگ در یک کدبیس، خودش ایراد بعدی را می‌سازد.
سنجه‌ی پایان: کنتراست حداقل AA در هر دو تم، صفر کلاس رنگ ثابت در `src/components/`.
مثل بقیه‌ی پروژه تستِ خودش را می‌خواهد — یک تست منبع‌کاوی روی الگوی
`__tests__/helpers/source-scan.js` جلوی برگشتشان را می‌گیرد.

### دو مورد فرعی که در بازبینی دیده شد (تصمیم نگرفته)
- `src/middleware.js` وجود دارد، اما در Next.js 16 نام فایل به `proxy.js` و نام
  export به `proxy` تغییر کرده (همان چیزی که در پروژه‌ی توانا اصلاح شد — بخش
  «نکات فنی مهم» بالا). باید بررسی شود آیا تشخیص زبان فعلاً اجرا می‌شود یا نه.
  شاهد تازه: بیلد استقرار پیام `middleware-to-proxy` را چاپ می‌کند.
- محدودیت نرخ در `lib/admin-auth.js:185` حافظه‌ی per-isolate است؛ روی Workers
  محدودیت سخت نیست (خود فایل این را مستند کرده). برای محدودیت واقعی KV یا
  Durable Object لازم است. نکته‌ی مرتبط: جعل هدر `cf-connecting-ip` برای تست
  محدودیت نرخ **دیگر کار نمی‌کند** — لبه‌ی Cloudflare آن را با
  `error code: 1000` رد می‌کند، که یعنی مدل اعتماد `lib/request-ip.js` درست است.
- `npm run lint` روی `next lint` بود که در Next.js 16 حذف شده و خطای
  «Invalid project directory» می‌داد. به `eslint src __tests__` تغییر کرد.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
