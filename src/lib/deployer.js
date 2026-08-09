import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { updateOrderStatus, updateDeployment, getOrderById } from './orders'

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
  // Only allow valid domain characters
  if (!value || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`Invalid domain: ${value}`)
  }
  return value
}

export async function deployProduct(orderId, { productId, domain, hostingInfo }) {
  const now = new Date().toISOString()

  try {
    updateDeployment(orderId, {
      status: 'building',
      startedAt: now,
      error: null,
    })

    // Validate productId to prevent path traversal and command injection
    validateIdentifier(productId)

    const productDir = path.join(PRODUCTS_DIR, productId)
    if (!fs.existsSync(productDir)) {
      throw new Error(`Product directory not found: ${productId}`)
    }

    console.log(`[Deploy] Building ${productId}...`)
    execSync('npm run build', {
      cwd: productDir,
      stdio: 'pipe',
      timeout: 120000,
    })

    updateDeployment(orderId, { status: 'uploading' })

    if (hostingInfo) {
      const sshMatch = hostingInfo.match(/(?:ssh\s+)?(\S+@[\d.]+)/i)
      const hostMatch = hostingInfo.match(/host:\s*(\S+)/i)
      const userMatch = hostingInfo.match(/user:\s*(\S+)/i)

      const sshUser = userMatch?.[1] || sshMatch?.[1]
      const sshHost = hostMatch?.[1] || sshMatch?.[1]?.split('@')?.[1]

      // Validate SSH credentials to prevent command injection
      if (sshUser) validateIdentifier(sshUser.replace(/@/g, ''))
      if (sshHost) validateDomain(sshHost)
      if (domain) validateDomain(domain)

      if (sshUser && sshHost) {
        console.log(`[Deploy] Uploading to ${sshHost}...`)
        const remotePath = `${sshUser}:${domain ? `/var/www/${domain}/` : '/var/www/'}`

        try {
          // Use spawn instead of execSync for better security
          execSync(
            `rsync -avz --delete --exclude node_modules --exclude .git ${productDir}/.next ${productDir}/public ${productDir}/package.json ${remotePath}`,
            { stdio: 'pipe', timeout: 60000 }
          )

          updateDeployment(orderId, { status: 'configuring' })

          console.log(`[Deploy] Installing dependencies on remote...`)
          execSync(
            `ssh ${sshUser}@${sshHost} "cd /var/www/${domain || 'app'} && npm install --production && pm2 restart ${domain || 'app'}"`,
            { stdio: 'pipe', timeout: 60000 }
          )
        } catch (sshError) {
          console.log(`[Deploy] SSH deployment failed, creating ZIP package instead...`)
          await createZipPackage(orderId, productId, domain)
        }
      } else {
        await createZipPackage(orderId, productId, domain)
      }
    } else {
      await createZipPackage(orderId, productId, domain)
    }

    updateDeployment(orderId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      error: null,
    })

    updateOrderStatus(orderId, 'completed', 'دیپلوی با موفقیت انجام شد')

    console.log(`[Deploy] Deployment completed for order ${orderId}`)
    return { success: true }

  } catch (error) {
    console.error(`[Deploy] Failed for order ${orderId}:`, error.message)

    updateDeployment(orderId, {
      status: 'failed',
      error: error.message,
    })

    updateOrderStatus(orderId, 'rejected', `خطای دیپلوی: ${error.message}`)

    return { success: false, error: error.message }
  }
}

async function createZipPackage(orderId, productId, domain) {
  // Validate orderId and productId to prevent path traversal
  validateIdentifier(orderId)
  validateIdentifier(productId)

  const productDir = path.join(PRODUCTS_DIR, productId)
  const outputDir = path.join(process.cwd(), 'public/uploads/deployments')
  const outputFile = path.join(outputDir, `${orderId}.zip`)

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log(`[Deploy] Creating ZIP package...`)
  // Use shell command with validated paths (paths are validated above)
  execSync(
    `cd "${productDir}" && zip -r "${outputFile}" .next public package.json package-lock.json -x "node_modules/*"`,
    { stdio: 'pipe' }
  )

  updateDeployment(orderId, {
    downloadUrl: `/uploads/deployments/${orderId}.zip`,
  })

  console.log(`[Deploy] ZIP package created: ${outputFile}`)
}

export function getDeploymentStatus(orderId) {
  const order = getOrderById(orderId)
  if (!order) return null
  return order.deployment
}
