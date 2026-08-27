import crypto from 'crypto'
import { readCollection, mutateCollection } from '@/lib/storage'

/**
 * Waitlist for products that have not shipped.
 *
 * Same storage contract as orders.js — the collection goes through
 * src/lib/storage.js, so it lands in Cloudflare KV in production and in
 * src/data/leads.json locally. Writing a file directly would silently lose every
 * signup on Workers.
 */

const COLLECTION = 'leads'

function generateLeadId() {
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `LEAD-${Date.now()}-${random}`
}

function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>]/g, '').trim()
}

export async function getAllLeads() {
  return readCollection(COLLECTION, [])
}

/**
 * Records interest in a product.
 *
 * Returns `{ lead, duplicate }`. A second signup with the same phone for the
 * same product updates the existing row instead of adding one, because the
 * visible outcome is "you're on the list" either way — someone who taps twice,
 * or comes back a week later, should not turn into two people to contact on
 * release day.
 */
export async function addLead({ productSlug, phone, email, source }) {
  return mutateCollection(COLLECTION, leads => {
    const now = new Date().toISOString()
    const existing = leads.find(l => l.productSlug === productSlug && l.phone === phone)

    if (existing) {
      if (email) existing.email = sanitize(email)
      existing.updatedAt = now
      return { lead: existing, duplicate: true }
    }

    const lead = {
      id: generateLeadId(),
      productSlug,
      phone,
      email: sanitize(email || ''),
      source: sanitize(source || ''),
      // Set once the release announcement actually goes out, so a partially
      // finished round of messages can be resumed instead of restarted.
      notifiedAt: null,
      createdAt: now,
      updatedAt: now,
    }

    leads.push(lead)
    return { lead, duplicate: false }
  }, [])
}

export async function markLeadNotified(leadId) {
  return mutateCollection(COLLECTION, leads => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return null

    const now = new Date().toISOString()
    lead.notifiedAt = now
    lead.updatedAt = now
    return lead
  }, [])
}

/**
 * Marks a whole batch notified in one read-modify-write.
 *
 * The real workflow is "copy every phone number for this product, send one bulk
 * SMS, mark them all done" — calling markLeadNotified() in a loop would be one KV
 * read plus one KV write per lead, serialised behind the collection lock. A batch
 * of fifty becomes fifty round trips, and any of them failing halfway leaves the
 * list in a state nobody can reason about.
 *
 * Ids that do not exist are ignored rather than failing the batch: the alternative
 * is that one stale id from an open tab blocks marking everyone else.
 *
 * @returns {Promise<number>} how many leads actually changed.
 */
export async function markLeadsNotified(leadIds) {
  const wanted = new Set(leadIds)
  if (wanted.size === 0) return 0

  return mutateCollection(COLLECTION, leads => {
    const now = new Date().toISOString()
    let changed = 0

    for (const lead of leads) {
      // Already-notified leads are skipped so a re-run does not overwrite the
      // date the announcement actually went out.
      if (!wanted.has(lead.id) || lead.notifiedAt) continue
      lead.notifiedAt = now
      lead.updatedAt = now
      changed += 1
    }

    return changed
  }, [])
}

export async function getLeadStats() {
  const leads = await getAllLeads()

  // Per-product counts are the number that decides whether an unreleased
  // product is worth finishing first.
  const byProduct = {}
  // Kept as a second map rather than turning byProduct into objects: byProduct is
  // already read as a plain count elsewhere, and "how many are still waiting to
  // hear from me" is the number the panel acts on, so it earns its own field.
  const pendingByProduct = {}

  for (const lead of leads) {
    byProduct[lead.productSlug] = (byProduct[lead.productSlug] || 0) + 1
    if (!lead.notifiedAt) {
      pendingByProduct[lead.productSlug] = (pendingByProduct[lead.productSlug] || 0) + 1
    }
  }

  return {
    total: leads.length,
    pending: leads.filter(l => !l.notifiedAt).length,
    byProduct,
    pendingByProduct,
  }
}
