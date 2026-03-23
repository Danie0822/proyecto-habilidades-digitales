import { useMemo, useState } from 'react'
import { useCrypto } from '../../hooks/useCrypto'
import { AlgorithmSelector } from './AlgorithmSelector'
import { DropZone } from './DropZone'
import { PasswordInput } from './PasswordInput'
import { ProgressFeedback } from './ProgressFeedback'
import { ResultCard } from './ResultCard'
import { Button } from '../ui/Button'

function downloadBlob(blob, fileName) {
  // Descarga client-side sin depender de backend.
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
} 

export function ActionCard({ mode = 'encrypt', onActive }) {
  const [files, setFiles] = useState([])
  const [password, setPassword] = useState('')
  const [algorithm, setAlgorithm] = useState('AES-GCM')
  const [result, setResult] = useState(null)

  const { encrypt, decrypt, status, progress, error, reset } = useCrypto()

  const isEncrypt = mode === 'encrypt'

  const title = isEncrypt ? 'Cifrar archivos' : 'Descifrar archivo'
  const ctaLabel = isEncrypt ? 'Cifrar ahora' : 'Descifrar ahora'

  const description = useMemo(() => {
    if (isEncrypt) {
      return 'Empaqueta multiples archivos en ZIP y luego cifra el contenido.'
    }

    return 'Lee el encabezado CVLT, valida algoritmo y restaura el contenido original.'
  }, [isEncrypt])

  const handleReset = () => {
    reset()
    setResult(null)
  }

  const run = async () => {
    // Notifica a App para actualizar SEO/titulo segun la accion activa.
    onActive(mode)
    setResult(null)

    try {
      if (isEncrypt) {
        const output = await encrypt({ files, password, algorithm })
        setResult(output)
        return
      }

      const target = files[0]
      const output = await decrypt({ file: target, password, algorithm })
      setResult(output)
    } catch {
      // El error ya se publica desde useCrypto para mostrar feedback en UI.
    }
  }

  return (
    <article className="vault-panel rounded-2xl border border-slate-700/80 p-4">
      <header className="mb-4">
        <h2 className="font-ui text-lg font-semibold text-slate-100">{title}</h2>
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      </header>

      <div className="space-y-4">
        <DropZone
          title={isEncrypt ? 'Selecciona archivos' : 'Selecciona .cvlt'}
          files={files}
          onFilesChange={setFiles}
          multiple={isEncrypt}
          allowDirectory={isEncrypt}
          accept={isEncrypt ? '*' : '.cvlt,application/octet-stream'}
        />

        <AlgorithmSelector value={algorithm} onChange={setAlgorithm} />
        <PasswordInput value={password} onChange={setPassword} />

        <Button
          aria-label={ctaLabel}
          className="w-full"
          disabled={status === 'processing' || files.length === 0 || !password}
          onClick={run}
        >
          {ctaLabel}
        </Button>

        <ProgressFeedback status={status} progress={progress} error={error} onReset={handleReset} />

        <ResultCard
          title={isEncrypt ? 'Archivo cifrado listo' : 'Archivo descifrado listo'}
          result={result}
          onDownload={() => result && downloadBlob(result.blob, result.fileName)}
        />
      </div>
    </article>
  )
}
