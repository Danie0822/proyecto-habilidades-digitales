import { getAlgorithmOptions } from '../../utils/cryptoUtils'
import { Badge } from '../ui/Badge'

export function AlgorithmSelector({ value, onChange }) {
  // Las opciones salen de cryptoUtils para mantener una sola fuente de verdad.
  const options = getAlgorithmOptions()

  return (
    <section className="space-y-2">
      <label htmlFor="algorithm-selector" className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Algoritmo
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={`Select ${option.label}`}
            title={option.description}
            onClick={() => onChange(option.value)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              // Estado seleccionado con realce visual fuerte para evitar confusiones.
              value === option.value
                ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400/70 shadow-md shadow-amber-500/20'
                : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-slate-100">{option.label}</span>
              {/* 3DES se marca como legacy para advertir compatibilidad limitada. */}
              {option.legacy ? <Badge tone="warning">LEGACY</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-slate-400">{option.description}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
