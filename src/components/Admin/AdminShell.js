'use client'

import { useState, useEffect } from 'react'
import ThemeToggle from '@/components/ThemeToggle'

/**
 * The panel's app shell: one right-hand icon rail, one sticky top bar.
 *
 * The old layout wrapped the panel in the site's marketing Header (eight nav
 * links) and Footer and capped it at max-w-5xl. That burned roughly 300px of
 * height before the first row of data — a third of a laptop viewport — while
 * leaving half of a wide monitor empty beside a table that wanted the width.
 *
 * So navigation moved from the top edge to the side edge, which is the direction
 * there is spare room in: the rail costs 56px of width that the content did not
 * need, instead of ~150px of height that it did. The shell owns the viewport and
 * scrolls internally, which also makes the top bar sticky for free and keeps a
 * long order list from pushing the filters off screen.
 *
 * dir is pinned here rather than inherited. The panel is Persian-only, so it
 * should not flip if the public site's locale is switched to English.
 *
 * Every component in this file stays at module scope — the same rule as
 * fields.js. One defined inside AdminShell would be a new component type on
 * every render, so React would unmount and remount the entire panel each time
 * the rail was collapsed.
 */

const RAIL_KEY = 'admin:rail-expanded'

// 24×24 stroke paths, kept as data so the tab list stays a plain array.
const ICONS = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  orders: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l1.5 1.5L15 12',
  products: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  leads: 'M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.3-.36-1.86m0 0a5 5 0 00-9.28 0M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.3.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  customers: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  site: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18',
  menu: 'M4 6h16M4 12h16M4 18h16',
  collapse: 'M9 5l7 7-7 7',
}

/**
 * The tab list is exported so the page and the shell cannot disagree about which
 * tabs exist. `countKey` names the stat this tab shows a badge for — absent means
 * no badge, which is correct for a tab where a number would be meaningless.
 */
export const ADMIN_TABS = [
  { key: 'dashboard', label: 'داشبورد', icon: 'dashboard' },
  { key: 'orders', label: 'سفارشات', icon: 'orders', countKey: 'orders' },
  // Next to orders rather than next to products: both tabs are lists of people
  // waiting on an answer, which is a different kind of work from editing a catalogue.
  { key: 'leads', label: 'سرنخ‌ها', icon: 'leads', countKey: 'leads' },
  // No countKey, for the same reason as products: a customer total is a fact about
  // the business, not a queue. What is waiting on me for a customer already shows
  // as a badge on سفارشات, where the work actually happens.
  { key: 'customers', label: 'مشتریان', icon: 'customers' },
  // No countKey: a product total is not something waiting to be done, and a badge
  // in the accent colour would read as if it were.
  { key: 'products', label: 'محصولات', icon: 'products' },
]

function Icon({ path, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={path} />
    </svg>
  )
}

function RailItem({ tab, active, expanded, count, onClick }) {
  return (
    <button
      onClick={onClick}
      // title carries the label when the rail is collapsed. A real tooltip would
      // need positioning logic for one line of text.
      title={expanded ? undefined : tab.label}
      aria-current={active ? 'page' : undefined}
      className={`relative w-full flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'text-[var(--color-text)]/60 hover:text-[var(--color-text)] hover:bg-[var(--color-text)]/5'
      }`}
    >
      <Icon path={ICONS[tab.icon]} />
      {expanded && <span className="truncate">{tab.label}</span>}

      {/* Collapsed, the badge shrinks to a dot: a two-digit number does not fit
          in a 40px button, and "something is waiting here" is the whole message. */}
      {count > 0 && (expanded ? (
        <span className={`ms-auto px-1.5 min-w-5 text-center text-xs rounded-full ${
          active ? 'bg-white/20 text-white' : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
        }`}>
          {count}
        </span>
      ) : (
        <span className="absolute top-1.5 start-1.5 w-2 h-2 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-surface)]" />
      ))}
    </button>
  )
}

function IconButton({ label, path, onClick, href }) {
  const className =
    'p-2 rounded-xl text-[var(--color-text)]/60 hover:text-[var(--color-accent)] hover:bg-[var(--color-text)]/5 transition-colors'

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={label} className={className}>
        <Icon path={path} size={20} />
      </a>
    )
  }
  return (
    <button onClick={onClick} title={label} aria-label={label} className={className}>
      <Icon path={path} size={20} />
    </button>
  )
}

export default function AdminShell({ activeTab, onTabChange, counts = {}, actions, onLogout, children }) {
  const [expanded, setExpanded] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Read after mount, not during: localStorage does not exist on the server, and
  // a lazy initialiser that touched it would break the hydration match.
  useEffect(() => {
    setExpanded(localStorage.getItem(RAIL_KEY) === '1')
  }, [])

  function toggleRail() {
    setExpanded(next => {
      const value = !next
      localStorage.setItem(RAIL_KEY, value ? '1' : '0')
      return value
    })
  }

  const current = ADMIN_TABS.find(t => t.key === activeTab)

  const rail = (
    <>
      <div className="flex-1 space-y-1">
        {ADMIN_TABS.map(tab => (
          <RailItem
            key={tab.key}
            tab={tab}
            active={activeTab === tab.key}
            expanded={expanded}
            count={tab.countKey ? counts[tab.countKey] : 0}
            onClick={() => { onTabChange(tab.key); setDrawerOpen(false) }}
          />
        ))}
      </div>

      <div className="space-y-1 pt-2 border-t border-[var(--color-border)]">
        <button
          onClick={onLogout}
          title={expanded ? undefined : 'خروج'}
          className="w-full flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium text-[var(--color-text)]/60 hover:text-red-500 hover:bg-red-500/5 transition-colors"
        >
          <Icon path={ICONS.logout} />
          {expanded && <span>خروج</span>}
        </button>
      </div>
    </>
  )

  return (
    // Owns the viewport: no page scroll, so the top bar stays put and the content
    // area is the only thing that moves.
    <div dir="rtl" className="fixed inset-0 flex bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Order matters, and it is inverted from what it looks like: this is a
          dir="rtl" flex row, so the FIRST child sits at the right edge. The rail
          has to come before the content to appear on the right — where the reading
          eye starts in Persian. Hidden below lg, where it becomes the drawer. */}
      <nav
        className={`hidden lg:flex flex-col shrink-0 gap-1 p-2 border-e border-[var(--color-border)] bg-[var(--color-surface)] transition-[width] duration-200 ${
          expanded ? 'w-52' : 'w-14'
        }`}
      >
        <button
          onClick={toggleRail}
          className="w-full flex items-center justify-center h-10 mb-1 rounded-xl text-[var(--color-text)]/40 hover:text-[var(--color-accent)] hover:bg-[var(--color-text)]/5 transition-colors"
          aria-label={expanded ? 'جمع کردن منو' : 'باز کردن منو'}
          aria-expanded={expanded}
        >
          <span className={`transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`}>
            <Icon path={ICONS.collapse} size={16} />
          </span>
        </button>
        {rail}
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center gap-2 px-3 sm:px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 -ms-1 rounded-xl text-[var(--color-text)]/60 hover:bg-[var(--color-text)]/5"
            aria-label="منو"
          >
            <Icon path={ICONS.menu} size={20} />
          </button>

          {/* The only title on the page. The old header repeated "پنل مدیریت
              فروشگاه" plus a subtitle above every tab, on every visit. */}
          <h1 className="text-base font-bold text-[var(--color-primary)] truncate">{current?.label}</h1>

          {/* Tabs fill this slot with their own search or filters. */}
          <div className="flex-1 min-w-0 flex items-center justify-end gap-2">{actions}</div>

          <div className="flex items-center gap-0.5 ps-1 border-s border-[var(--color-border)]">
            <IconButton label="مشاهده سایت" path={ICONS.site} href="/" />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4">{children}</div>
      </div>

      {/* Mobile drawer. The user works on a laptop, so this only has to be
          usable, not optimised — one overlay, tap outside to close. Same rtl
          ordering rule: the drawer comes first so it opens on the right, under the
          hamburger, rather than across the screen from it. */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <nav className="w-56 flex flex-col gap-1 p-2 bg-[var(--color-surface)] border-e border-[var(--color-border)]">
            <div className="h-10 flex items-center px-3 text-sm font-bold text-[var(--color-primary)]">پنل مدیریت</div>
            {/* expanded is forced on in the drawer — there is no room for icons
                without labels on a screen this narrow. */}
            <div className="flex-1 space-y-1">
              {ADMIN_TABS.map(tab => (
                <RailItem
                  key={tab.key}
                  tab={tab}
                  active={activeTab === tab.key}
                  expanded
                  count={tab.countKey ? counts[tab.countKey] : 0}
                  onClick={() => { onTabChange(tab.key); setDrawerOpen(false) }}
                />
              ))}
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-medium text-[var(--color-text)]/60 hover:text-red-500 transition-colors"
            >
              <Icon path={ICONS.logout} />
              <span>خروج</span>
            </button>
          </nav>
          <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
        </div>
      )}
    </div>
  )
}
