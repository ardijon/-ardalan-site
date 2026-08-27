import { readCollection, mutateCollection } from '@/lib/storage'
import { orderStatusLabel } from '@/lib/order-status'

/**
 * One append-only log of everything that changed.
 *
 * WHY, GIVEN statusHistory ALREADY EXISTS
 * ---------------------------------------
 * `order.statusHistory` is the customer's timeline: it lives on the order, it is
 * rendered on the tracking page, and it can only ever describe that one order.
 * Structurally it cannot record a product being edited, a price being changed, or
 * someone failing the login five times — and those are exactly the events you go
 * looking for afterwards, when the question is "what did I change last Tuesday" or
 * "why is this product suddenly not for sale".
 *
 * So statusHistory stays where it is and keeps doing its job. This is the panel's
 * cross-entity stream: every mutation in one place, newest first, in Jalali.
 *
 * WHY IT NEVER THROWS
 * -------------------
 * The log is a record of the work, not the work. A KV hiccup while appending must
 * not turn an approved payment into a 500 that the admin retries — retrying is how
 * you end up approving twice. Every failure here is logged to the console and
 * swallowed, and the caller is not told.
 *
 * WHY THE SUMMARY IS STORED AND NOT DERIVED
 * -----------------------------------------
 * The Persian sentence is written at record time rather than rebuilt from `action`
 * when the panel renders. A log is a historical claim: if a status label is renamed
 * next month, the entry from today should still say what it said today. It also
 * means the CSV export is readable without shipping a lookup table alongside it.
 */

const COLLECTION = 'audit'

/**
 * How many entries survive.
 *
 * Every append is a read-modify-write of the whole array on KV, so this is a cost
 * ceiling as much as a retention policy: ~300 entries is well under a hundred
 * kilobytes and covers months of a one-person shop. Old entries are dropped, not
 * archived — if history ever needs to be kept, export it (CSV) before it rolls off.
 */
export const AUDIT_LIMIT = 300

/** Who did it. `system` is for things no human triggered, e.g. a deploy result. */
export const AUDIT_ACTORS = { ADMIN: 'admin', CUSTOMER: 'customer', SYSTEM: 'system' }

/**
 * The vocabulary. `label` heads the row in the panel; `tone` picks its colour.
 *
 * A closed table rather than free-form strings: the panel filters on these keys, and
 * a typo in an action name is an event that silently never shows up under its filter.
 */
export const AUDIT_ACTIONS = {
  'order.status': { label: 'تغییر وضعیت سفارش', tone: 'default' },
  'order.receipt': { label: 'دریافت رسید', tone: 'info' },
  'order.deploy': { label: 'دیپلوی', tone: 'good' },
  'order.deploy_failed': { label: 'دیپلوی ناموفق', tone: 'bad' },
  'product.create': { label: 'محصول جدید', tone: 'good' },
  'product.update': { label: 'ویرایش محصول', tone: 'default' },
  'product.delete': { label: 'حذف محصول', tone: 'bad' },
  'auth.login': { label: 'ورود به پنل', tone: 'info' },
  'auth.blocked': { label: 'ورود مسدود شد', tone: 'bad' },
}

export const AUDIT_ACTION_KEYS = Object.keys(AUDIT_ACTIONS)

/**
 * Sortable-by-prefix and unique enough for a 300-row log.
 *
 * Not `crypto.randomUUID()` — this is only a React key and a dedupe handle, and a
 * 36-character UUID on every row is a tenth of the storage budget spent on nothing.
 */
function nextId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Append one entry. Returns the stored record, or null if it could not be written.
 *
 * @param {{action: string, summary: string, actor?: string, entityId?: string, ip?: string}} entry
 */
export async function recordAudit(entry) {
  const action = entry?.action
  if (!AUDIT_ACTIONS[action]) {
    // A caller inventing an action would write a row the panel cannot label or
    // filter. Refused loudly here, where it is a one-line fix, rather than quietly
    // becoming an unlabelled row in production.
    console.error('[audit] unknown action, not recorded:', action)
    return null
  }

  const record = {
    id: nextId(),
    at: new Date().toISOString(),
    action,
    actor: entry.actor || AUDIT_ACTORS.ADMIN,
    entityId: entry.entityId || '',
    summary: entry.summary || AUDIT_ACTIONS[action].label,
    // Only where it means something — see the auth call sites. On an admin action
    // it is always the same address and is pure noise.
    ...(entry.ip ? { ip: entry.ip } : {}),
  }

  try {
    await mutateCollection(COLLECTION, log => {
      // Newest first in storage too, so reading the recent N is a slice and
      // trimming is a truncation. Both mutate in place, which mutateCollection
      // requires — it writes back the array it handed us, not a return value.
      log.unshift(record)
      if (log.length > AUDIT_LIMIT) log.length = AUDIT_LIMIT
    }, [])
    return record
  } catch (error) {
    console.error('[audit] could not record', action, error)
    return null
  }
}

/**
 * The most recent entries, newest first.
 *
 * Re-sorted on read even though writes prepend: the file driver's JSON is a real
 * file a human can edit, and an out-of-order log reads as "nothing happened
 * lately", which is the one thing a log must never say by accident. ISO timestamps
 * are always UTC here, so lexical order is chronological order.
 */
export async function readAudit({ limit = 50, action = null } = {}) {
  let log
  try {
    log = await readCollection(COLLECTION, [])
  } catch (error) {
    console.error('[audit] could not read log', error)
    return []
  }
  if (!Array.isArray(log)) return []

  const filtered = action ? log.filter(entry => entry?.action === action) : log
  return [...filtered]
    .sort((a, b) => String(b?.at || '').localeCompare(String(a?.at || '')))
    .slice(0, Math.max(1, Math.min(Number(limit) || 50, AUDIT_LIMIT)))
}

// ------------------------------------------------------------------- summaries

/**
 * The Persian sentences, in one place.
 *
 * Built here rather than at each call site so that the log reads consistently —
 * half the value of a stream like this is being able to skim it, and that stops
 * working as soon as two routes phrase the same event differently.
 */
export const auditSummary = {
  orderStatus(order, status, note) {
    const who = order?.customer?.name ? ` — ${order.customer.name}` : ''
    const why = note ? ` (${note})` : ''
    return `سفارش ${order?.id || '—'}${who}: ${orderStatusLabel(status)}${why}`
  },

  receipt(order) {
    const who = order?.customer?.name ? ` از ${order.customer.name}` : ''
    return `رسید پرداخت${who} برای سفارش ${order?.id || '—'} دریافت شد`
  },

  deploy(order, { error } = {}) {
    const target = order?.customer?.domain || order?.productId || '—'
    return error
      ? `دیپلوی سفارش ${order?.id || '—'} روی ${target} ناموفق بود: ${error}`
      : `سفارش ${order?.id || '—'} روی ${target} دیپلوی شد`
  },

  product(verb, product) {
    // The Persian title, because a slug is not what you remember editing. The slug
    // comes along anyway as `entityId`, which is what a filter would match on.
    const name = product?.title?.fa || product?.title?.en || product?.slug || '—'
    return `${verb} «${name}»`
  },

  login() {
    return 'ورود موفق به پنل مدیریت'
  },

  blocked(ip) {
    return `تلاش‌های ناموفق ورود از ${ip || 'نامشخص'} به حد مجاز رسید و مسدود شد`
  },
}
