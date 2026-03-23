export function Button({
  children,
  className = '',
  variant = 'primary',
  type = 'button',
  ...rest
}) {
  const variantClass =
    variant === 'secondary'
      ? 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
      : 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 ${variantClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
