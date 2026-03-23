import { useEffect, useRef, useState } from 'react'

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }

  return `${value.toFixed(2)} ${units[i]}`
}

export function DropZone({
  title,
  files,
  onFilesChange,
  multiple = true,
  accept = '*',
  allowDirectory = false,
}) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [directoryMode, setDirectoryMode] = useState(false)

  useEffect(() => {
    if (!inputRef.current) {
      return
    }

    if (allowDirectory && directoryMode) {
      // webkitdirectory permite seleccionar carpetas completas en navegadores compatibles.
      inputRef.current.setAttribute('webkitdirectory', '')
      inputRef.current.setAttribute('directory', '')
    } else {
      inputRef.current.removeAttribute('webkitdirectory')
      inputRef.current.removeAttribute('directory')
    }
  }, [allowDirectory, directoryMode])

  const updateFiles = (fileList) => {
    // Normalizamos a array para simplificar el manejo en el estado del card.
    const next = Array.from(fileList || [])
    onFilesChange(next)
  }

  const onDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    updateFiles(event.dataTransfer.files)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{title}</h3>
        {allowDirectory ? (
          <label className="inline-flex items-center gap-2 text-xs text-slate-400">
            <input
              aria-label="Enable directory selection"
              type="checkbox"
              checked={directoryMode}
              onChange={(event) => setDirectoryMode(event.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Carpeta
          </label>
        ) : null}
      </div>

      <label
        className={`block cursor-pointer rounded-xl border border-dashed p-5 text-center transition ${
          dragActive
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-slate-600 bg-slate-900/50 hover:border-slate-400'
        }`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          aria-label={`${title} file input`}
          onChange={(event) => updateFiles(event.target.files)}
        />
        <p className="font-mono text-xs text-slate-300">Arrastra y suelta archivos aqui</p>
        <p className="mt-1 text-xs text-slate-500">o haz clic para seleccionarlos</p>
      </label>

      {files.length > 0 ? (
        <ul className="max-h-36 space-y-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900/60 p-2">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-2 text-xs text-slate-300">
              <span className="truncate font-mono">{file.webkitRelativePath || file.name}</span>
              <span className="shrink-0 text-slate-500">{formatBytes(file.size)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
