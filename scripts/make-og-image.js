#!/usr/bin/env node

/**
 * ساخت تصویر اشتراک‌گذاری فروشگاه (public/og-store.jpg)
 *
 * نحوه استفاده:
 * node scripts/make-og-image.js
 *
 * خروجی یک‌بار ساخته و کامیت می‌شود؛ این اسکریپت فقط برای بازسازی است
 * وقتی تصویر منبع عوض شد.
 *
 * چرا JPEG و نه همان WebP منبع: واتساپ در پیش‌نمایش لینک با WebP ناسازگار
 * است و کانال اصلی اشتراک‌گذاری کاربران ماست. تلگرام و ایکس هر دو را
 * می‌فهمند، پس JPEG کم‌ریسک‌ترین انتخاب مشترک است.
 *
 * چرا ۱۲۰۰×۶۳۰: نسبت ۱.۹۱:۱ که کارت‌های `summary_large_image` انتظار
 * دارند. منبع ۱۷۷۲×۹۵۶ (۱.۸۵:۱) است، پس `cover` کمی از بالا و پایین
 * می‌برد — عمداً، تا جای خالی (letterbox) نماند.
 *
 * چرا همین تصویر از میان ۲۳ اسکرین‌شات: تیترش («معماری یک زیرساخت
 * مقیاس‌پذیر در صنعت بیمه») در سطح صنعت است نه در سطح یک محصول، پس روی
 * کارتِ کلِ فروشگاه معنا دارد. بقیه یا متن ریزِ ناخوانا در اندازه‌ی کارت
 * دارند یا وعده‌ی مخصوص «توانا» را تکرار می‌کنند.
 *
 * عوارضش را بدان: همین فایل اسکرین‌شات اول «توانا» هم هست، پس کارت
 * /store و کارت /store/tavana یک‌شکل دیده می‌شوند. معاوضه‌ی آگاهانه بود —
 * تصویرِ درست‌ولی‌تکراری بهتر از نبودِ تصویر است. راه‌حل واقعی یک کارت
 * برندشده‌ی اختصاصی است که هنوز ساخته نشده.
 */

const path = require('path')
const sharp = require('sharp')

const SOURCE = path.join(__dirname, '../public/images/insurance-product/scalable-architecture-insurance-industry.webp')
const TARGET = path.join(__dirname, '../public/og-store.jpg')

sharp(SOURCE)
  .resize(1200, 630, { fit: 'cover', position: 'center' })
  .jpeg({ quality: 82, progressive: true })
  .toFile(TARGET)
  .then(info => {
    console.log(`✅ ${path.relative(process.cwd(), TARGET)} — ${info.width}×${info.height}، ${(info.size / 1024).toFixed(0)}KB`)
  })
  .catch(err => {
    console.error('❌ ساخت تصویر شکست خورد:', err.message)
    process.exit(1)
  })
