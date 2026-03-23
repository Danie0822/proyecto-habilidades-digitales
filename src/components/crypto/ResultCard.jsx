import { Button } from '../ui/Button'
import { formatBytes } from '../../utils/formatters'

export function ResultCard({ title, result, onDownload }) {
  if (!result) {
    return null
  }

  return (
    <section className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4">
      <h4 className="font-semibold text-emerald-300">{title}</h4>
      {/* Resumen tecnico minimo para validar salida antes de descargar. */}
      <dl className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs text-slate-200">
        <dt>Algoritmo:</dt>
        <dd>{result.metadata.algorithm}</dd>
        <dt>Archivos:</dt>
        <dd>{result.metadata.fileCount}</dd>
        <dt>Tamano:</dt>
        <dd>{formatBytes(result.metadata.encryptedSize || result.metadata.decryptedSize)}</dd>
      </dl>

      {result.metadata.unpackedFiles?.length ? (
        // Si se descifro un lote, mostramos su contenido ZIP para inspeccion rapida.
        <div className="mt-3 rounded border border-slate-700 bg-slate-950/40 p-2">
          <p className="mb-1 text-xs text-slate-400">Contenido ZIP:</p>
          <ul className="max-h-28 space-y-1 overflow-auto font-mono text-xs text-slate-300">
            {result.metadata.unpackedFiles.map((entry) => (
              <li key={entry.name} className="truncate">{entry.name}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button className="mt-3 w-full" onClick={onDownload} aria-label="Download output file">
        Descargar {result.fileName}
      </Button>
    </section>
  )
}
