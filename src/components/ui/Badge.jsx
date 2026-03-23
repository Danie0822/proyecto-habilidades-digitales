export function Badge({ children, tone = 'info' }) {
  const toneClass = tone === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/60' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${toneClass}`}>
      {children}
    </span>
  )
}
