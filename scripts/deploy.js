#!/usr/bin/env node

/**
 * اسکریپت دیپلوی دستی محصولات
 * 
 * نحوه استفاده:
 * node scripts/deploy.js --product insurance-recruit-template --domain example.com --user user@host
 * 
 * این اسکریپت کد منبع محصول رو روی هاست مشتری دیپلوی می‌کنه.
 * پیش‌نیاز: دسترسی SSH به هاست مشتری
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const args = process.argv.slice(2)
const params = {}
for (let i = 0; i < args.length; i += 2) {
  params[args[i].replace('--', '')] = args[i + 1]
}

const { product, domain, user, host } = params

if (!product || !domain) {
  console.log(`
🚀 اسکریپت دیپلوی محصولات

استفاده:
  node scripts/deploy.js --product <slug> --domain <domain> [--user <ssh-user>] [--host <ssh-host>]

مثال:
  node scripts/deploy.js --product insurance-recruit-template --domain bimeh.example.com
  node scripts/deploy.js --product insurance-recruit-template --domain bimeh.example.com --user root --host 185.x.x.x

محصولات موجود:
  - insurance-recruit-template

پیش‌نیازها:
  - دسترسی SSH به هاست مشتری
  - Node.js روی هاست
  - Netlify CLI یا Vercel CLI (اختیاری)
`)
  process.exit(1)
}

const productDir = path.join(__dirname, '..', 'products', product)
if (!fs.existsSync(productDir)) {
  console.error(`❌ محصول "${product}" پیدا نشد.`)
  process.exit(1)
}

console.log(`🚀 شروع دیپلوی "${product}" روی "${domain}"...`)
console.log(`📁 مسیر محصول: ${productDir}`)

try {
  // Step 1: Build محصول
  console.log('\n📦 مرحله ۱: Build محصول...')
  execSync('npm run build', { cwd: productDir, stdio: 'inherit' })

  // Step 2: آپلود فایل‌ها (مثال با rsync)
  if (user && host) {
    console.log('\n📤 مرحله ۲: آپلود فایل‌ها...')
    const remotePath = `${user}@${host}:/var/www/${domain}/`
    execSync(`rsync -avz --delete ${productDir}/.next ${productDir}/public ${productDir}/package.json ${remotePath}`, { stdio: 'inherit' })

    // Step 3: نصب dependency و ری‌استارت
    console.log('\n⚙️ مرحله ۳: نصب و ری‌استارت...')
    execSync(`ssh ${user}@${host} "cd /var/www/${domain} && npm install --production && pm2 restart ${domain}"`, { stdio: 'inherit' })
  }

  console.log('\n✅ دیپلوی با موفقیت انجام شد!')
  console.log(`🌐 سایت: https://${domain}`)
} catch (error) {
  console.error('\n❌ خطا در دیپلوی:', error.message)
  process.exit(1)
}
