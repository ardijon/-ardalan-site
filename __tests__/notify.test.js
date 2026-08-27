import { addLead, getAllLeads, getLeadStats, markLeadNotified, markLeadsNotified } from '@/lib/leads'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'

// DATA_DIR is set to a scratch directory by jest.setup.js — never src/data.
const LEADS_FILE = path.join(process.cwd(), process.env.DATA_DIR, 'leads.json')

beforeEach(() => {
  mkdirSync(path.dirname(LEADS_FILE), { recursive: true })
  writeFileSync(LEADS_FILE, '[]', 'utf8')
})

describe('Leads (waitlist)', () => {
  describe('addLead', () => {
    it('should store a lead with the expected shape', async () => {
      const { lead, duplicate } = await addLead({
        productSlug: 'agent-site',
        phone: '09123456789',
        email: 'ali@example.com',
        source: 'store',
      })

      expect(duplicate).toBe(false)
      expect(lead.id).toMatch(/^LEAD-/)
      expect(lead.productSlug).toBe('agent-site')
      expect(lead.phone).toBe('09123456789')
      expect(lead.email).toBe('ali@example.com')
      expect(lead.notifiedAt).toBeNull()
      expect(lead.createdAt).toBeDefined()
    })

    it('should persist across reads', async () => {
      await addLead({ productSlug: 'rahyar', phone: '09123456789' })

      const leads = await getAllLeads()
      expect(leads.length).toBe(1)
      expect(leads[0].productSlug).toBe('rahyar')
    })

    it('should not duplicate the same phone for the same product', async () => {
      await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      const second = await addLead({ productSlug: 'rahyar', phone: '09123456789' })

      expect(second.duplicate).toBe(true)
      expect((await getAllLeads()).length).toBe(1)
    })

    it('should fill in an email supplied on a repeat signup', async () => {
      await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      const second = await addLead({
        productSlug: 'rahyar',
        phone: '09123456789',
        email: 'later@example.com',
      })

      expect(second.lead.email).toBe('later@example.com')
    })

    it('should keep the same phone on two different products apart', async () => {
      await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      const second = await addLead({ productSlug: 'agent-site', phone: '09123456789' })

      expect(second.duplicate).toBe(false)
      expect((await getAllLeads()).length).toBe(2)
    })

    it('should sanitize HTML from the email field', async () => {
      const { lead } = await addLead({
        productSlug: 'rahyar',
        phone: '09123456789',
        email: '<script>x</script>a@b.co',
      })

      expect(lead.email).not.toContain('<')
      expect(lead.email).not.toContain('>')
    })
  })

  describe('markLeadNotified', () => {
    it('should stamp notifiedAt', async () => {
      const { lead } = await addLead({ productSlug: 'rahyar', phone: '09123456789' })

      const updated = await markLeadNotified(lead.id)
      expect(updated.notifiedAt).toBeTruthy()
    })

    it('should return null for an unknown id', async () => {
      expect(await markLeadNotified('LEAD-nope')).toBeNull()
    })
  })

  describe('markLeadsNotified', () => {
    it('should stamp a whole batch', async () => {
      const a = await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      const b = await addLead({ productSlug: 'rahyar', phone: '09123456788' })

      const changed = await markLeadsNotified([a.lead.id, b.lead.id])

      expect(changed).toBe(2)
      expect((await getAllLeads()).every(l => l.notifiedAt)).toBe(true)
    })

    it('should leave leads outside the batch alone', async () => {
      const a = await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      await addLead({ productSlug: 'agent-site', phone: '09123456788' })

      await markLeadsNotified([a.lead.id])

      const leads = await getAllLeads()
      expect(leads.find(l => l.id === a.lead.id).notifiedAt).toBeTruthy()
      expect(leads.find(l => l.productSlug === 'agent-site').notifiedAt).toBeNull()
    })

    it('should not overwrite an existing notifiedAt', async () => {
      // The date the announcement actually went out is the point of the field —
      // re-running a batch must not rewrite it to today.
      const { lead } = await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      const original = '2020-01-01T00:00:00.000Z'
      writeFileSync(LEADS_FILE, JSON.stringify([{ ...lead, notifiedAt: original }]), 'utf8')

      const changed = await markLeadsNotified([lead.id])

      expect(changed).toBe(0)
      expect((await getAllLeads())[0].notifiedAt).toBe(original)
    })

    it('should ignore unknown ids instead of failing the batch', async () => {
      const { lead } = await addLead({ productSlug: 'rahyar', phone: '09123456789' })

      const changed = await markLeadsNotified(['LEAD-nope', lead.id])

      expect(changed).toBe(1)
    })

    it('should return 0 for an empty list', async () => {
      expect(await markLeadsNotified([])).toBe(0)
    })
  })

  describe('getLeadStats', () => {
    it('should count totals, pending and per-product', async () => {
      await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      await addLead({ productSlug: 'rahyar', phone: '09123456788' })
      const { lead } = await addLead({ productSlug: 'agent-site', phone: '09123456787' })
      await markLeadNotified(lead.id)

      const stats = await getLeadStats()
      expect(stats.total).toBe(3)
      expect(stats.pending).toBe(2)
      expect(stats.byProduct.rahyar).toBe(2)
      expect(stats.byProduct['agent-site']).toBe(1)
    })

    it('should count pending per product separately from the total', async () => {
      // The panel filters on the pending figure, so a product whose whole list has
      // already been contacted must read 0 there while byProduct still reads 1.
      await addLead({ productSlug: 'rahyar', phone: '09123456789' })
      const { lead } = await addLead({ productSlug: 'agent-site', phone: '09123456787' })
      await markLeadsNotified([lead.id])

      const stats = await getLeadStats()
      expect(stats.byProduct['agent-site']).toBe(1)
      expect(stats.pendingByProduct['agent-site']).toBeUndefined()
      expect(stats.pendingByProduct.rahyar).toBe(1)
    })

    it('should return zeroes on an empty collection', async () => {
      const stats = await getLeadStats()
      expect(stats.total).toBe(0)
      expect(stats.pending).toBe(0)
      expect(stats.byProduct).toEqual({})
      expect(stats.pendingByProduct).toEqual({})
    })
  })
})
