import { useMemo, useState } from 'react'
import { Input } from '../ui/Input'
import { evaluatePasswordStrength } from '../../utils/validationSchemas'

function getTone(score) {
  if (score < 45) return 'bg-rose-500'
  if (score < 75) return 'bg-amber-500'
  return 'bg-emerald-500'
}

export function PasswordInput({ value, onChange }) {
  const [visible, setVisible] = useState(false)
  // La fortaleza se calcula desde validationSchemas para centralizar reglas.
  const score = useMemo(() => evaluatePasswordStrength(value), [value])

  return (
    <section className="space-y-2">
      <label htmlFor="vault-password" className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Contrasena
      </label>

      <div className="flex gap-2">
        <Input
          id="vault-password"
          aria-label="Password"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ingresa una contrasena fuerte"
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((prev) => !prev)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-800"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 overflow-hidden rounded bg-slate-800">
          <div className={`h-full transition-all ${getTone(score)}`} style={{ width: `${score}%` }} />
        </div>
        <p className="font-mono text-[11px] text-slate-500">Fortaleza: {score}%</p>
      </div>
    </section>
  )
}
