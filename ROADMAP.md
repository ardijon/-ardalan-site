# نقشه راه جامع توسعه فروشگاه توانا

> **تاریخ ایجاد**: ۱۴۰۵/۰۵/۲۴
> **آخرین به‌روزرسانی**: ۱۴۰۵/۰۵/۲۴
> **وضعیت فعلی**: فروشگاه با یک محصول (توانا) فعال — پرداخت کارت‌به‌کارت دستی

---

## فهرست مطالب

- [بخش اول: وضعیت فعلی پروژه](#بخش-اول-وضعیت-فعلی-پروژه)
- [بخش دوم: مشکلات اصلاح شده](#بخش-دوم-مشکلات-اصلاح-شده)
- [بخش سوم: مشکلات UI/UX](#بخش-سوم-مشکلات-uiux)
- [بخش چهارم: پیشنهادات Claude](#بخش-چهارم-پیشنهادات-claude)
- [بخش پنجم: باگ‌ها و ریسک‌های شناسایی شده](#بخش-پنجم-باگ‌ها-و-ریسک‌های-شناسایی-شده)
- [فاز ۱: تکمیل فروشگاه و امنیت پایه](#فاز-۱-تکمیل-فروشگاه-و-امنیت-پایه)
- [فاز ۲: پنل ادمین](#فاز-۲-پنل-ادمین)
- [فاز ۳: درگاه پرداخت](#فاز-۳-درگاه-پرداخت)
- [فاز ۴: زیرساخت SaaS](#فاز-۴-زیرساخت-saas)
- [فاز ۵: اشتراک و تمدید](#فاز-۵-اشتراک-و-تمدید)
- [فاز ۶: بهبودهای نهایی](#فاز-۶-بهبودهای-نهایی)
- [بخش نهایی: معماری و هزینه‌ها](#بخش-نهایی-معماری-و-هزینه‌ها)

---

# بخش اول: وضعیت فعلی پروژه

## تکنولوژی

| مورد | وضعیت |
|------|-------|
| فریمورک | Next.js 14 + React 18 |
| استایل | Tailwind CSS 3 |
| زبان | JavaScript |
| هاست فروشگاه | Netlify |
| دیتابیس | فایلی (JSON) |
| پرداخت | کارت‌به‌کارت دستی + آپلود رسید |
| احراز هویت ادمین | Basic Auth |
| تعداد محصولات | ۱ (توانا) |
| تعداد سفارشات | ۹ نمونه |

## ساختار پروژه

```
src/
├── app/
│   ├── store/                  # صفحات فروشگاه
│   │   ├── page.js             # لیست محصولات
│   │   ├── [slug]/page.js      # صفحه محصول
│   │   └── track/page.js       # پیگیری سفارش
│   └── api/
│       ├── orders/             # API سفارشات
│       └── admin/              # API ادمین
├── components/Store/           # ۱۳ کامپوننت فروشگاه
├── data/
│   ├── products.json           # اطلاعات محصولات
│   └── orders.json             # ذخیره سفارشات
├── lib/
│   ├── orders.js               # مدیریت سفارشات (async)
│   ├── products.js             # ابزار محصولات
│   ├── deployer.js             # دیپلوی (غیرفعال در Netlify)
│   └── i18n/                   # بومی‌سازی فارسی/انگلیسی
└── worker/                     # Cloudflare Worker
```

---

# بخش دوم: مشکلات اصلاح شده

## بحرانی (Critical) ✅

| کد | مشکل | فایل | وضعیت |
|----|-------|------|-------|
| C1 | قفل فایل درون‌حافظه‌ای | `orders.js` | ✅ |
| C2 | فایل یتیم در صورت شکست | `receipt/route.js` | ✅ |
| C3 | readFileSync блок کننده | `orders.js` | ✅ |
| C4 | Rate limiter ادمین مجاز را بلاک | `admin/products/route.js` | ✅ |
| C5 | کد تکراری | `ReceiptUpload.js` | ✅ |

## بالا (High) ✅

| کد | مشکل | وضعیت |
|----|-------|-------|
| H1 | عدم rate limiting ایجاد سفارش | ✅ |
| H2 | عدم rate limiting پیگیری | ✅ |
| H3 | Rate limiter ریست سرور | ✅ |
| H4 | عدم اعتبارسنجی محصول | ✅ |
| H5 | خطا null در قیمت‌گذاری | ✅ |
| H6 | اعتبارسنجی تلفن فقط ایران | ⚠️ |
| H7 | لایت‌باکس بدون ARIA | ✅ |

## متوسط (Medium) ✅

| کد | مشکل | وضعیت |
|----|-------|-------|
| M1-M3 | ضدعفونی ورودی + ایمیل + Content-Type | ✅ |
| M6-M7 | اعتبارسازی کلاینت + پیام خطا | ✅ |
| M9-M10 | RTL PricingTable + صفحه‌کلید | ✅ |
| M11-M14 | دسترسی‌پذیری لایت‌باکس | ✅ |
| M15-M16 | alt text + وضعیت ناشناخته | ✅ |
| M17-M18 | SVG آیکون + i18n | ✅ |
| M19-M21 | prefers-reduced-motion | ✅ |

## پایین (Low) ✅

| کد | مشکل | وضعیت |
|----|-------|-------|
| L1-L2 | ثبت خطا + فرمت پاسخ | ✅ |
| L4-L5 | ضدعفونی PII + HTTPS | ✅ |
| L6-L8 | dark mode + line-clamp + قیمت شرطی | ✅ |
| L10 | بررسی null ProductDetail | ✅ |

---

# بخش سوم: مشکلات UI/UX

| مشکل | وضعیت |
|------|-------|
| ناهماهنگی قیمت بین صفحات | ✅ اصلاح شد |
| عدم شفافیت تفاوت پلن‌ها | ✅ اصلاح شد |
| فرم خرید بدون context | ✅ اصلاح شد |
| عدم شفافیت فرآیند پرداخت | ✅ اصلاح شد |
| محصولات مشابه بی‌فایده | ✅ خودکار مخفی می‌شود |

---

# بخش چهارم: پیشنهادات Claude

| # | مورد | اولویت | وضعیت |
|---|------|--------|-------|
| ۱ | درگاه پرداخت آنلاین | بالا | 🔲 |
| ۲ | دیتابیس JSON | ✅ کافی | ✅ |
| ۳ | Basic Auth → OTP | بالا | 🔲 |
| ۴ | تست‌نویسی | بالا | 🔲 |
| ۵ | شماره کارت → env | بالا | 🔲 |
| ۶ | پنل ادمین | بالا | 🔲 |
| ۷ | معماری دیپلوی | متوسط | ⚠️ |
| ۸ | Multi-Tenant | بالا | 🔲 |
| ۹ | تمدید اشتراک | بالا | 🔲 |
| ۱۰ | VPS | بالا | 🔲 |
| ۱۱ | مبلغ منحصربفرد | متوسط | 🔲 |

---

# بخش پنجم: باگ‌ها و ریسک‌های شناسایی شده

> **این بخش شامل ۵ مورد جدید است که در بازنگری دوم شناسایی شدند.**

## باگ ۱: تشخیص نادرست Tenant در دامنه اختصاصی 🔴 بحرانی

### مشکل
کد فعلی `detectTenant` فقط ساب‌دامین را بررسی می‌کند:
```javascript
// ❌ نادرست — فقط ساب‌دامین کار می‌کند
const subdomain = host.split('.')[0]
const tenant = await findTenantBySlug(subdomain)
```

وقتی مشتری دامنه اختصاصی (مثلاً `agentkarimi.com`) وصل می‌کند، `host.split('.')[0]` می‌شود `"agentkarimi"` که با هیچ slug‌ای مطابقت ندارد و **۴۰۴** می‌گیرد.

### راه‌حل
منطق دوگانه: ابتدا دامنه اختصاصی، سپس ساب‌دامین:
```javascript
// ✅ درست — ابتدا دامنه اختصاصی، سپس ساب‌دامین
export async function detectTenant(request) {
  const host = request.headers.get('host')

  // ۱. بررسی دامنه اختصاصی کامل
  let tenant = await findTenantByCustomDomain(host)
  if (tenant) return tenant

  // ۲. بررسی ساب‌دامین
  if (host.endsWith('.tavana.ardalan.ir')) {
    const subdomain = host.split('.')[0]
    tenant = await findTenantBySlug(subdomain)
  }

  return tenant || null
}
```

### اعمال در نقشه راه
**فاز ۴.۴ (پیاده‌سازی Multi-Tenant Middleware)** — اضافه کردن منطق دوگانه

---

## باگ ۲: عدم تأیید امضای وبهوک پرداخت 🔴 بحرانی

### مشکل
در گام ۳.۴، تایید خودکار کارت‌به‌کارت از طریق webhook انجام می‌شود که مستقیماً منجر به `approved` شدن سفارش و بعد `provisionTenant()` می‌شود. اما **هیچ‌جا امضای وبهوک (HMAC signature) چک نمی‌شود**.

اگر آدرس endpoint لو بره (که در پروژه GitHub عمومی محتمل است)، **هرکسی می‌تواند درخواست POST جعلی با مبلغ و شماره تلفن دلخواه بفرسته و یک tenant رایگان بسازد.**

### راه‌حل — دو اقدام ضروری

**۱. تأیید امضا (HMAC Verification):**
```javascript
// هر سرویس cash-in یک secret برای امضا می‌دهد
import crypto from 'crypto'

function verifyWebhookSignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// در webhook handler:
export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('x-signature')

  if (!verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // پردازش عادی...
}
```

**۲. Idempotency (جلوگیری از پردازش تکراری):**
```javascript
// ذخیره eventId یا trackingCode به عنوان کلید یکتا
const processedEvents = new Set()

async function handleWebhook(event) {
  if (processedEvents.has(event.id)) {
    return { status: 'already_processed' }
  }

  processedEvents.add(event.id)
  // پردازش عادی...
}
```

### اعمال در نقشه راه
**فاز ۳.۴ (تایید خودکار پرداخت)** — اضافه کردن تأیید امضای HMAC و Idempotency

---

## باگ ۳: باگ منطقی در matchPayment 🟡 متوسط

### مشکل
```javascript
// ❌ نادرست — تلورانس ۱۰۰۰ تومنی از بازه تصادفی بزرگ‌تر است
const match = pendingOrders.find(o =>
  Math.abs(o.uniqueAmount - amount) < 1000
)
```

چون عدد تصادفی فقط بین ۱۰۰ تا ۹۹۹ تومن است، تلورانس ۱۰۰۰ تومنی عملاً **هر مبلغی نزدیک قیمت پایه را match می‌کند** و کل هدف "منحصربفرد بودن مبلغ" را خنثی می‌کند.

### راه‌حل
```javascript
// ✅ درست — برابری دقیق
const match = pendingOrders.find(o => o.uniqueAmount === amount)

// اگر بیش از یک match پیدا شد → هشدار به ادمین
if (matches.length > 1) {
  await notifyAdmin('Multiple orders match this amount — manual review needed')
  return { status: 'needs_review' }
}
```

### اعمال در نقشه راه
**فاز ۳.۴ (تایید خودکار پرداخت)** — اصلاح تابع matchPayment

---

## مورد ۴: سرنوشت مبهم پلن Pro 🟡 متوسط

### مشکل
در فاز ۴.۷ نوشته شده «غیرفعال کردن دیپلوی خودکار، ارسال ZIP دستی» ولی در کل ۶ فاز، **هیچ گام اختصاصی برای پلن Pro** وجود ندارد. با معماری Multi-Tenant، تمرکز کامل روی Starter رفته و مشتری‌های Pro بلاتکلیف مانده‌اند.

### راه‌حل
اضافه کردن یک گام کوچک (نیم‌روز) در فاز ۱ یا ۲:
- همان `createZipPackage()` فعلی حفظ شود
- دکمه «تولید و دانلود ZIP» در پنل ادمین اضافه شود
- بدون SSH/rsync — فقط ایجاد فایل ZIP و لینک دانلود

### اعمال در نقشه راه
**فاز ۱.۵** — رسمی کردن مسیر پلن Pro (تولید ZIP)

---

## مورد ۵: عدم مانیتورینگ و بکاپ 🔴 بحرانی

### مشکل
از فاز ۴ به بعد، دیگر روی Netlify/Vercel نیستیم — یک VPS خودمان است که **پول واقعی مشتری‌ها و دیتابیس هر کدومشون** روی آن زندگی می‌کند. بدون مانیتورینگ و بکاپ:
- اگر سورف برود، خودمان نمی‌فهمیم
- اگر دیتابیس خراب شود، داده‌ها از بین می‌روند

### راه‌حل — دو اقدام

**۱. مانیتورینگ (رایگان):**
```
UptimeRobot → هشدار رایگان وقتی سایت down شود
- ثبت‌نام رایگان
- اضافه کردن URL سایت
- تنظیم ایمیل/تلگرام برای هشدار
```

**۲. بکاپ دوره‌ای:**
```bash
# اسکریپت بکاپ روزانه (cron)
#!/bin/bash
DATE=$(date +%Y-%m-%d)
turso db dump tavana-main --output backup-$DATE.sql
# آپلود به Backblaze B2 (S3-compatible، ۱۰GB رایگان)
aws s3 cp backup-$DATE.sql s3://my-backups/tavana/
```

### اعمال در نقشه راه
**فاز ۴.۸** — مانیتورینگ + بکاپ روزانه

---

# فاز ۱: تکمیل فروشگاه و امنیت پایه

> **هدف**: فروشگاه آماده فروش واقعی
> **زمان**: ۱-۲ هفته

## گام ۱.۱: انتقال اطلاعات پرداخت به env

**زمان**: ۱ ساعت | **اهمیت**: بالا

| مرحله | کار |
|-------|-----|
| ۱ | ایجاد `.env.local` با `BANK_NAME`, `CARD_NUMBER`, `ACCOUNT_HOLDER` |
| ۲ | ایجاد API route `/api/payment-info` |
| ۳ | تغییر PurchaseForm.js به خواندن از API |
| ۴ | حذف اطلاعات هاردکد از dictionary.js |

---

## گام ۱.۲: ترفند مبلغ منحصربفرد

**زمان**: ۱ ساعت | **اهمیت**: متوسط

| مرحله | کار |
|-------|-----|
| ۱ | اضافه کردن `generateUniqueAmount()` به orders.js |
| ۲ | ذخیره `uniqueAmount` در سفارش |
| ۳ | نمایش مبلغ دقیق بعد از ثبت سفارش |

```javascript
function generateUniqueAmount(basePrice) {
  const randomSuffix = Math.floor(Math.random() * 900) + 100
  return basePrice + randomSuffix
}
```

---

## گام ۱.۳: تست‌های مسیرهای پولی

**زمان**: ۲-۳ ساعت | **اهمیت**: بالا

| فایل تست | تست‌ها |
|----------|--------|
| `orders.test.js` | سفارش معتبر، تلفن نامعتبر، ایمیل نامعتبر، فیلدهای خالی، محصول ناموجود |
| `receipt.test.js` | رسید معتبر، فایل غیرمجاز، حجم بالا، سفارش ناموجود، سفارش تکمیل شده |
| `admin.test.js` | احراز هویت ناموفق، CSRF، rate limit، CRUD محصولات |

---

## گام ۱.۴: رفع باگ‌های احتمالی

**زمان**: ۱-۲ ساعت | **اهمیت**: بالا

---

## گام ۱.۵: رسمی کردن مسیر پلن Pro 🆕

**زمان**: ۲-۳ ساعت | **اهمیت**: متوسط

> **مشکل**: پلن Pro (فروش کد منبع) در فازهای بعدی فراموش شده بود.

| مرحله | کار |
|-------|-----|
| ۱ | حفظ تابع `createZipPackage()` فعلی در `deployer.js` |
| ۲ | اضافه کردن دکمه «تولید ZIP» در پنل ادمین |
| ۳ | ایجاد API endpoint برای دانلود ZIP |
| ۴ | ارسال لینک دانلود به مشتری بعد از تایید سفارش |

**خروجی**: مشتری‌های Pro هم سرویس دریافت می‌کنند (ZIP کد منبع)

---

# فاز ۲: پنل ادمین

> **هدف**: مدیریت سفارشات سریع و ایمن
> **زمان**: ۱-۲ هفته

## گام ۲.۱: صفحه پنل ادمین

**زمان**: ۳-۴ ساعت

- لیست سفارشات (جدول)
- فیلتر بر اساس وضعیت
- جستجو با شماره سفارش/تلفن

## گام ۲.۲: صفحه مشاهده رسید

**زمان**: ۲-۳ ساعت

- تصویر رسید (بزرگ، سمت راست)
- اطلاعات سفارش (کنار رسید)
- بررسی خودکار مغایرت مبلغ

## گام ۲.۳: دکمه‌های قالب پیام

**زمان**: ۱-۲ ساعت

- قالب تأیید
- قالب رد (مبلغ نادرست)
- قالب رد (رسید نامعتبر)

## گام ۲.۴: احراز هویت دو لایه

**زمان**: ۳-۴ ساعت | **اهمیت**: بحرانی

```
قبل: User → Basic Auth → وارد شد
بعد: User → Basic Auth → OTP به تلگرام → کد → وارد شد
```

| مرحله | کار |
|-------|-----|
| ۱ | تابع ارسال OTP از طریق بات تلگرام |
| ۲ | تابع تأیید کد OTP |
| ۳ | فایل `.env.local` با `ADMIN_TELEGRAM_ID` |
| ۴ | صفحه لاگین با دو مرحله |
| ۵ | middleware برای بررسی session |

## گام ۲.۵: تست پنل ادمین

**زمان**: ۱-۲ ساعت

---

# فاز ۳: درگاه پرداخت

> **هدف**: پرداخت آنلاین + تایید خودکار
> **زمان**: ۱-۲ هفته

## گام ۳.۱: مشاوره حسابدار

**زمان**: ۱ روز

> **هشدار مالیاتی**: برخی PSPها نیاز به ثبت کسب‌وکار دارند.

## گام ۳.۲: انتخاب سرویس

| سرویس | درگاه | Cash-in | نیاز به ثبت |
|-------|-------|---------|-------------|
| Vandar | ✓ | ✓ | بله |
| api.ir | ✗ | ✓ | بله |
| کارت‌به‌کارت ساده | ✗ | ✗ | خیر |

## گام ۳.۳: اتصال درگاه پرداخت

**زمان**: ۳-۴ ساعت

## گام ۳.۴: تایید خودکار کارت‌به‌کارت 🆕 اصلاح شده

**زمان**: ۳-۴ ساعت (افزایش از ۲-۳ ساعت)

> **تغییر مهم**: اضافه کردن تأیید امضای HMAC و Idempotency

### کد اصلاح شده

```javascript
import crypto from 'crypto'

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('x-signature')
  const eventId = request.headers.get('x-event-id')

  // ۱. تأیید امضای HMAC
  if (!verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ۲. جلوگیری از پردازش تکراری (ذخیره در دیتابیس، نه حافظه)
  const alreadyProcessed = await turso.execute({
    sql: 'SELECT 1 FROM processed_webhooks WHERE event_id = ?',
    args: [eventId]
  })
  if (alreadyProcessed.rows.length > 0) {
    return NextResponse.json({ status: 'already_processed' })
  }
  await turso.execute({
    sql: 'INSERT INTO processed_webhooks (event_id, processed_at) VALUES (?, datetime("now"))',
    args: [eventId]
  })

  const event = JSON.parse(body)

  // ۳. تطبیق مبلغ (دقیق، نه تلورانسی)
  const match = await matchPayment(event.amount, event.trackingCode)

  if (match.status === 'multiple_matches') {
    await notifyAdmin('Multiple orders match — manual review needed')
    return NextResponse.json({ status: 'needs_review' })
  }

  if (match.order) {
    await approveOrder(match.order.id)
  }

  return NextResponse.json({ status: 'processed' })
}

// تابع matchPayment اصلاح شده
async function matchPayment(amount, trackingCode) {
  const pendingOrders = await getOrdersByStatus('awaiting_payment')

  // ✅ برابری دقیق — نه تلورانس
  const matches = pendingOrders.filter(o => o.uniqueAmount === amount)

  if (matches.length === 0) return { status: 'no_match' }
  if (matches.length > 1) return { status: 'multiple_matches', orders: matches }

  return { status: 'match', order: matches[0] }
}
```

## گام ۳.۵: تست پرداخت واقعی

---

# فاز ۴: زیرساخت SaaS

> **هدف**: آماده شدن برای پلن Starter
> **زمان**: ۲-۳ هفته

## گام ۴.۱: راه‌اندازی VPS

**زمان**: ۱ روز

| مورد | حداقل | پیشنهادی |
|------|-------|----------|
| RAM | ۲ گیگ | ۴ گیگ |
| CPU | ۱ هسته | ۲ هسته |
| Disk | ۲۰ گیگ | ۴۰ گیگ |
| هزینه | ۵$/ماه | ۱۰$/ماه |

ابزارها: Node.js + pm2 + Caddy

## گام ۴.۲: پیکربندی DNS Wildcard

**زمان**: ۱ ساعت

```
*.tavana.ardalan.ir → [IP VPS]
tavana.ardalan.ir → [IP VPS]
```

Caddy خودکار TLS صادر می‌کند.

## گام ۴.۳: پیاده‌سازی Multi-Tenant Middleware 🆕 اصلاح شده

**زمان**: ۵-۶ ساعت (افزایش از ۴-۵ ساعت)

> **تغییر مهم**: اضافه شدن منطق دوگانه تشخیص Tenant

### کد اصلاح شده

```javascript
// src/middleware/tenant.js

export async function detectTenant(request) {
  const host = request.headers.get('host')

  // ۱. ابتدا بررسی دامنه اختصاصی کامل
  let tenant = await findTenantByCustomDomain(host)
  if (tenant) return tenant

  // ۲. در غیر این صورت، بررسی ساب‌دامین
  if (host.endsWith('.tavana.ardalan.ir')) {
    const subdomain = host.split('.')[0]
    tenant = await findTenantBySlug(subdomain)
  }

  return tenant || null
}

// src/lib/tenant/database.js

import { createClient } from '@libsql/client'

export function getTenantDb(tenantSlug) {
  return createClient({
    url: `libsql://${tenantSlug}-ardalan.turso.io`,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
}
```

## گام ۴.۴: اتصال Turso

**زمان**: ۳-۴ ساعت

- ثبت‌نام در Turso
- ایجاد دیتابیس اصلی
- ایجاد schema (tenants, orders)
- ایجاد migration tool

## گام ۴.۵: جابجایی provisioning به VPS

**زمان**: ۲-۳ ساعت

```javascript
// src/lib/provisioning.js

async function provisionTenant(order) {
  const tenant = await createTenant({
    slug: slugify(order.customer.name),
    plan: order.plan,
    ownerName: order.customer.name,
    ownerPhone: order.customer.phone,
  })

  const db = await turso.createDatabase(`tenant-${tenant.slug}`)
  await runMigrations(db)

  await activateSubscription(tenant.id, {
    expiresAt: addDays(new Date(), 30)
  })

  await sendTelegramMessage(
    order.customer.phone,
    `پنل شما آماده است: https://${tenant.slug}.tavana.ardalan.ir`
  )
}
```

## گام ۴.۶: تست Multi-Tenant

## گام ۴.۷: اضافه کردن مسیر Pro به پنل ادمین 🆕

**زمان**: ۱-۲ ساعت

> **تغییر**: اتصال گام ۱.۵ (پلن Pro) به پنل ادمین

- نمایش دکمه «تولید ZIP» برای سفارشات Pro
- لینک دانلود بعد از تولید

## گام ۴.۸: مانیتورینگ و بکاپ 🆕

**زمان**: ۲-۳ ساعت | **اهمیت**: بحرانی

### مانیتورینگ

| ابزار | هزینه | تنظیم |
|-------|-------|-------|
| UptimeRobot | رایگان | ثبت‌نام + اضافه کردن URL + تنظیم ایمیل/تلگرام |

### بکاپ روزانه

```bash
#!/bin/bash
# /etc/cron.daily/tavana-backup

DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/var/backups/tavana"
mkdir -p $BACKUP_DIR

# بکاپ دیتابیس اصلی (رجیستری tenantها و سفارشات)
turso db dump tavana-main --output $BACKUP_DIR/tavana-main-$DATE.sql

# بکاپ دیتابیس هر tenant (داده‌های واقعی کسب‌وکار مشتری‌ها)
for tenant in $(turso db list --output json | jq -r '.[].Name' | grep '^tenant-'); do
  echo "Backing up $tenant..."
  turso db dump "$tenant" --output "$BACKUP_DIR/$tenant-$DATE.sql"
done

# آپلود به Backblaze B2 (۱۰GB رایگان)
aws s3 cp $BACKUP_DIR/ s3://tavana-backups/$DATE/ --recursive

# حذف بکاپ‌های قدیمی‌تر از ۳۰ روز
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

**جدول processed_webhooks (برای Idempotency):**
```sql
CREATE TABLE processed_webhooks (
  event_id TEXT PRIMARY KEY,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### تنظیم cron
```bash
chmod +x /etc/cron.daily/tavana-backup
```

---

# فاز ۵: اشتراک و تمدید

> **هدف**: چرخه عمر کامل اشتراک
> **زمان**: ۱-۲ هفته

## گام ۵.۱: فرم onboarding مشتری

**زمان**: ۲-۳ ساعت

```
نام + شماره تلفن + توکن بات تلگرام + دامنه (اختیاری)
```

## گام ۵.۲: provisioning بهبود یافته

**زمان**: ۳-۴ ساعت

## گام ۵.۳: cron تمدید اشتراک

**زمان**: ۲-۳ ساعت

| زمان | اقدام |
|------|-------|
| روز ۲۷ | یادآوری تمدید |
| روز ۳۰ | grace_period |
| روز ۳۳ | غیرفعال (نه حذف) |
| رسید تایید شد | +۳۰ روز |

## گام ۵.۴: صفحه tenant غیرفعال

**زمان**: ۱-۲ ساعت

## گام ۵.۵: تست چرخه عمر

---

# فاز ۶: بهبودهای نهایی

> **هدف**: کیفیت و آمادگی برای رشد
> **زمان**: ۱-۲ هفته

| گام | کار | زمان |
|-----|-----|------|
| ۶.۱ | مهاجرت به TypeScript (اختیاری) | ۳-۵ روز |
| ۶.۲ | تست‌های جامع | ۲-۳ روز |
| ۶.۳ | مستندسازی API | ۱ روز |
| ۶.۴ | بهینه‌سازی عملکرد | ۱ روز |

---

# بخش نهایی: معماری و هزینه‌ها

## معماری نهایی

```
┌─────────────────────────────────────────────────────────────┐
│                    Netlify (رایگان)                          │
│    فروشگاه + صفحه محصول + فرم خرید + پیگیری سفارش          │
└──────────────────────────┬──────────────────────────────────┘
                           │ Webhook
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    VPS شما (۵-۱۰$/ماه)                      │
│    Node.js + pm2 + Caddy + Turso + Multi-Tenant             │
│    *.tavana.ardalan.ir + دامنه‌های اختصاصی                   │
└─────────────────────────────────────────────────────────────┘
```

## هزینه‌ها

| مورد | هزینه |
|------|-------|
| Netlify | رایگان |
| VPS | ۵-۱۰$/ماه |
| Turso | رایگان (تا ۵۰۰ DB) |
| DNS + TLS | رایگان |
| **مجموع** | **۵-۱۰$/ماه** |

## یادداشت‌های مهم

- **مالیاتی**: قبل از اتصال درگاه پرداخت، با حسابدار مشورت کنید
- **امنیتی**: Basic Auth فعلی ضعیف است — قبل از لانج ارتقا دهید
- **مقیاس‌پذیری**: JSON فعلاً کافی است — مهاجرت فقط وقتی Multi-Tenant شد

---

## خلاصه ۵ مورد جدید

| # | مورد | اهمیت | فاز |
|---|------|-------|-----|
| ۱ | باگ تشخیص Tenant در دامنه اختصاصی | 🔴 بحرانی | ۴.۳ |
| ۲ | عدم تأیید امضای وبهوک پرداخت | 🔴 بحرانی | ۳.۴ |
| ۳ | باگ منطقی matchPayment (تلورانس) | 🟡 متوسط | ۳.۴ |
| ۴ | سرنوشت مبهم پلن Pro | 🟡 متوسط | ۱.۵ + ۴.۷ |
| ۵ | عدم مانیتورینگ و بکاپ | 🔴 بحرانی | ۴.۸ |

---

*آخرین به‌روزرسانی: ۱۴۰۵/۰۵/۲۴ — شامل ۵ مورد اصلاحی بازنگری دوم*
