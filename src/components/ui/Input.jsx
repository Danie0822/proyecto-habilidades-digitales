export function Input({ className = '', ...rest }) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${className}`}
      {...rest}
    />
  )
}
