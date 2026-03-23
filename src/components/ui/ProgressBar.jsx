export function ProgressBar({ value = 0, label }) {
  // Clamp defensivo para prevenir valores fuera de rango.
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div aria-label={label || 'Progress'} className="w-full">
      <div className="mb-1 flex items-center justify-between font-mono text-xs text-slate-300">
        <span>{label || 'Processing'}</span>
        <span>{safeValue}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
        <div
          // El ancho refleja el progreso real en porcentaje.
          className="h-full rounded bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}
