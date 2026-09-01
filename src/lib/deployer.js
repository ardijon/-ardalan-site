import path from 'path'
import { putBlob } from '@/lib/blob'
import { updateOrderStatus, updateDeployment, getOrderById } from './orders'

/**
 * Product deployment.
 *
 * PLATFORM NOTE
 * -------------
 * This module shells out (`npm run build`, `rsync`, `ssh`, `zip`) and writes to
 * disk. None of that exists on Cloudflare Workers, which is where this app is
 * deployed. Two consequences shaped the code below:
 *
 *  1. `child_process` and `fs` are loaded lazily, inside the functions that use
 *     them. They used to be top-level imports, which meant the module threw
 *     while loading on Workers and took the whole /api/admin/deploy route down
 *     with it — the route returned 500 before it could even report the problem.
 *
 *  2. `deployProduct` now checks its prerequisites up front and reports a clear,
 *     actionable error instead of failing deep inside a shell command.
 *
 * Running deployments therefore requires a Node host (a VPS, or `npm start`
 * locally) with the `products/` directory present. On Workers the endpoint
 * responds with an explanatory message rather than a confusing crash.
 */

const PRODUCTS_DIR = path.join(process.cwd(), 'products')

// Validation helpers to prevent command injection
function validateIdentifier(value) {
  // Only allow alphanumeric, hyphens, dots, and underscores
  if (!value || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid identifier: ${value}`)
  }
  return value
}

function validateDomain(value) {
  // Only allow valid domain characters (hostname format)
  if (!value || !/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(value)) {
    throw new Error(`Invalid domain: ${value}`)
  }
  return value
}

function validateSshUser(value) {
  // SSH username: alphanumeric, underscore, hyphen, dot (no @)
  if (!value || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid SSH user: ${value}`)
  }
  return value
}

function validateSshHost(value) {
  // SSH host: hostname or IP
  if (!value || !/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(value)) {
    throw new Error(`Invalid SSH host: ${value}`)
  }
  return value
}

function sanitizeForShell(value) {
  // Escape single quotes for safe use in '...' quoting
  return String(value).replace(/'/g, "'\\''")
}

/**
 * Load the Node-only modules this file needs.
 * Returns null when the runtime cannot provide them (i.e. on Workers).
 */
async function loadNodeApis() {
  try {
    const [{ execSync }, fs] = await Promise.all([
      import('child_process'),
      import('fs'),
    ])
    if (typeof execSync !== 'function' || typeof fs.existsSync !== 'function') {
      return null
    }
    return { execSync, fs }
  } catch {
    return null
  }
}

export async function deployProduct(orderId, { productId, domain, hostingInfo, plan }) {
  const now = new Date().toISOString()

  // ---- prerequisites -------------------------------------------------------
  // Checked before any order state changes, so an unsupported environment never
  // leaves the order in a half-deployed state.

  const node = await loadNodeApis()
  if (!node) {
    const error =
      'دیپلوی روی این محیط اجرا نمی‌شود: اجرای دستورات سیستمی در Cloudflare Workers ممکن نیست. ' +
      'برای دیپلوی از یک سرور Node استفاده کنید.'
    console.error(`[Deploy] Unsupported runtime for order ${orderId}`)
    await updateDeployment(orderId, { status: 'failed', error })
    return { success: false, error }
  }

  try {
    validateIdentifier(productId)
  } catch {
    const error = `شناسهٔ محصول نامعتبر است: ${productId}`
    await updateDeployment(orderId, { status: 'failed', error })
    return { success: false, error }
  }

  const productDir = path.join(PRODUCTS_DIR, productId)
  if (!node.fs.existsSync(productDir)) {
    const error = `پوشهٔ محصول پیدا نشد: products/${productId}`
    console.error(`[Deploy] ${error}`)
    await updateDeployment(orderId, { status: 'failed', error })
    return { success: false, error }
  }

  // Pro plan: create ZIP directly without SSH
  if (plan === 'pro') {
    try {
      await updateDeployment(orderId, {
        status: 'building',
        startedAt: now,
        error: null,
      })

      const downloadUrl = await createZipPackage(node, orderId, productId)

      await updateDeployment(orderId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        error: null,
      })

      await updateOrderStatus(orderId, 'completed', 'فایل ZIP تولید شد', 'system')

      return { success: true, downloadUrl }
    } catch (error) {
      return failDeployment(orderId, error, 'تولید ZIP')
    }
  }

  try {
    await updateDeployment(orderId, {
      status: 'building',
      startedAt: now,
      error: null,
    })

    console.log(`[Deploy] Building ${productId}...`)
    node.execSync('npm run build', {
      cwd: productDir,
      stdio: 'pipe',
      timeout: 120000,
    })

    await updateDeployment(orderId, { status: 'uploading' })

    let downloadUrl = null

    if (hostingInfo) {
      const sshMatch = hostingInfo.match(/(?:ssh\s+)?(\S+@[\d.]+)/i)
      const hostMatch = hostingInfo.match(/host:\s*(\S+)/i)
      const userMatch = hostingInfo.match(/user:\s*(\S+)/i)

      const sshUserRaw = userMatch?.[1] || sshMatch?.[1]
      const sshHostRaw = hostMatch?.[1] || sshMatch?.[1]?.split('@')?.[1]

      // Validate and sanitize SSH credentials to prevent command injection
      const sshUser = sshUserRaw ? validateSshUser(sshUserRaw.replace(/@/g, '')) : null
      const sshHost = sshHostRaw ? validateSshHost(sshHostRaw) : null
      if (domain) validateDomain(domain)

      if (sshUser && sshHost) {
        console.log(`[Deploy] Uploading to ${sshHost}...`)
        const remotePath = `${sshUser}:${domain ? `/var/www/${sanitizeForShell(domain)}/` : '/var/www/'}`

        try {
          node.execSync(
            `rsync -avz --delete --exclude node_modules --exclude .git ${productDir}/.next ${productDir}/public ${productDir}/package.json ${remotePath}`,
            { stdio: 'pipe', timeout: 60000 }
          )

          await updateDeployment(orderId, { status: 'configuring' })

          console.log(`[Deploy] Installing dependencies on remote...`)
          const safeDomain = sanitizeForShell(domain || 'app')
          const safeUser = sanitizeForShell(sshUser)
          const safeHost = sanitizeForShell(sshHost)
          node.execSync(
            `ssh ${safeUser}@${safeHost} "cd /var/www/${safeDomain} && npm install --production && pm2 restart ${safeDomain}"`,
            { stdio: 'pipe', timeout: 60000 }
          )
        } catch (sshError) {
          console.log(`[Deploy] SSH deployment failed (${sshError.message}), creating ZIP package instead...`)
          downloadUrl = await createZipPackage(node, orderId, productId)
        }
      } else {
        downloadUrl = await createZipPackage(node, orderId, productId)
      }
    } else {
      downloadUrl = await createZipPackage(node, orderId, productId)
    }

    await updateDeployment(orderId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      error: null,
    })

    await updateOrderStatus(orderId, 'completed', 'دیپلوی با موفقیت انجام شد', 'system')

    console.log(`[Deploy] Deployment completed for order ${orderId}`)
    return { success: true, downloadUrl }
  } catch (error) {
    return failDeployment(orderId, error, 'دیپلوی')
  }
}

/**
 * Record a failed deployment.
 *
 * Deliberately does NOT move the order to `rejected`. Rejection means "we are
 * not honouring this payment", and it is a decision the admin makes about the
 * receipt. A build or SSH failure is an operational problem on our side: the
 * order stays approved so the admin can fix the cause and retry, instead of a
 * paying customer's order being marked rejected because `zip` was missing.
 *
 * The stored/returned message is stage-level on purpose. `error.message` from
 * execSync carries stderr, local paths and host names — that belongs in the
 * server log, not in a panel response body or a permanent audit row.
 */
async function failDeployment(orderId, error, stage) {
  const detail = error?.message || String(error)
  console.error(`[Deploy] ${stage} failed for order ${orderId}:`, detail)

  const message = `${stage} ناموفق بود — جزئیات در لاگ سرور`
  await updateDeployment(orderId, {
    status: 'failed',
    error: message,
  })
  // Actor SYSTEM: the deployer moved this order, not a human clicking — the
  // audit feed must not read as if the admin pressed a button.
  await updateOrderStatus(orderId, 'approved', `خطای ${stage}`, 'system')

  return { success: false, error: message }
}

async function createZipPackage(node, orderId, productId) {
  // Validate orderId and productId to prevent path traversal
  validateIdentifier(orderId)
  validateIdentifier(productId)

  const productDir = path.join(PRODUCTS_DIR, productId)

  console.log(`[Deploy] Creating ZIP package...`)
  // Paths are validated above, so interpolation here is safe. The timeout was
  // missing — the one execSync in the file without one — so a hung `zip` hung
  // the route, and on a single-process Node host, every other request too.
  const zipBuffer = node.execSync(
    `cd "${productDir}" && zip -r - .next public package.json package-lock.json -x "node_modules/*"`,
    { stdio: 'pipe', encoding: 'buffer', timeout: 120000 }
  )

  const filename = `deploy-${orderId}.zip`
  await putBlob(filename, zipBuffer, { contentType: 'application/zip' })

  // The download URL points to the admin receipt route which serves blobs
  const downloadUrl = `/api/admin/receipt/${filename}`
  await updateDeployment(orderId, { downloadUrl })

  console.log(`[Deploy] ZIP package created and stored in blob storage: ${filename}`)
  return downloadUrl
}

export async function getDeploymentStatus(orderId) {
  const order = await getOrderById(orderId)
  if (!order) return null
  return order.deployment
}
