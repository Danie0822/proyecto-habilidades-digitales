import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'

export function ProgressFeedback({ status, progress, error, onReset }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-3">
      <ProgressBar
        value={status === 'success' ? 100 : progress}
        label={status === 'processing' ? 'Processing vault payload' : 'Crypto status'}
      />

      <p className="text-xs text-slate-400">
        {/* Un solo bloque de mensajes para mantener consistente el estado visible. */}
        {status === 'idle' ? 'Listo para operar.' : null}
        {status === 'processing' ? 'Procesando localmente en tu navegador...' : null}
        {status === 'success' ? 'Operacion completada con exito.' : null}
        {status === 'error' ? error?.message || 'Error en la operacion.' : null}
      </p>

      {status !== 'idle' ? (
        <Button variant="secondary" onClick={onReset} className="w-full" aria-label="Reset operation state">
          Reset
        </Button>
      ) : null}
    </section>
  )
}
