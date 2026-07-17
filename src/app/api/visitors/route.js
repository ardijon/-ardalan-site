import { NextResponse } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STORE_PATH = path.join(process.cwd(), '.freebuff', 'visitor-count.json')
const WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_SEEN = 50_000
const seen = new Map()

function pruneSeen() {
  if (seen.size <= MAX_SEEN) return
  const now = Date.now()
  for (const [k, v] of seen.entries()) {
    if (now - v >= WINDOW_MS) seen.delete(k)
  }
  if (seen.size > MAX_SEEN) seen.clear()
}

async function readTotal() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (typeof parsed.total === 'number') return parsed.total
  } catch { /* file missing or invalid, fall through */ }
  return 0
}

async function writeTotal(total) {
  try {
    await fs.writeFile(STORE_PATH, JSON.stringify({ total, updatedAt: new Date().toISOString() }), 'utf8')
  } catch { /* read-only fs etc. — in-memory still works for this process */ }
}

function getKey(request) {
  if (request.ip) return request.ip
  const xff = request.headers.get('x-forwarded-for') || ''
  if (xff) return xff.split(',').pop().trim() || 'unknown'
  const real = request.headers.get('x-real-ip')
  return real || 'unknown'
}

export async function GET() {
  const total = await readTotal()
  return NextResponse.json({ total })
}

export async function POST(request) {
  pruneSeen()
  const key = getKey(request)
  const now = Date.now()
  const last = seen.get(key) || 0

  if (now - last < WINDOW_MS) {
    const total = await readTotal()
    return NextResponse.json({ total, deduped: true })
  }
  seen.set(key, now)

  const current = await readTotal()
  const total = current + 1
  await writeTotal(total)
  return NextResponse.json({ total })
}
