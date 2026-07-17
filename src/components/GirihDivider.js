export default function GirihDivider() {
  return (
    <div className="relative flex items-center justify-center h-16 sm:h-20" aria-hidden="true">
      <div className="absolute left-8 right-8 sm:left-16 sm:right-16 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)]/20 to-transparent" />
      <div className="relative z-10 w-9 h-9 rounded-full border-2 border-[var(--color-accent)]/20 bg-[var(--color-bg)] flex items-center justify-center shadow-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-accent)]/50">
          <polygon points="12,2 22,12 12,22 2,12" />
        </svg>
      </div>
    </div>
  )
}
