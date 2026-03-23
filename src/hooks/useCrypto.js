import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import {
  CorruptFileError,
  WrongPasswordError,
  decryptFile,
  detectAlgorithmFromEncryptedBuffer,
  encryptFile,
  isZipBuffer,
  packFiles,
  unpackZip,
} from '../utils/cryptoUtils'
import { decryptRequestSchema, encryptRequestSchema } from '../utils/validationSchemas'

const WORKER_THRESHOLD_BYTES = 10 * 1024 * 1024
// Estado compartido a nivel modulo: evita crear un worker por cada ActionCard.
const sharedWorkerState = {
  worker: null,
  consumers: 0,
  pendingTasks: new Map(),
  messageId: 0,
}

function mapWorkerError(workerError) {
  const mapped = new Error(workerError?.message || 'Worker crypto error')
  mapped.name = workerError?.name || 'Error'
  return mapped
}

function ensureSharedWorker() {
  if (typeof Worker === 'undefined') {
    return null
  }

  if (sharedWorkerState.worker) {
    return sharedWorkerState.worker
  }

  const worker = new Worker(new URL('../workers/cryptoWorker.js', import.meta.url), {
    type: 'module',
  })

  // Router central de respuestas del worker para todas las tareas pendientes.
  worker.onmessage = (event) => {
    const { id, type, progress: nextProgress, result, error: workerError } = event.data
    const task = sharedWorkerState.pendingTasks.get(id)

    if (!task) {
      return
    }

    if (type === 'progress') {
      task.onProgress?.(nextProgress)
      return
    }

    if (type === 'result') {
      sharedWorkerState.pendingTasks.delete(id)
      task.resolve(result)
      return
    }

    if (type === 'error') {
      sharedWorkerState.pendingTasks.delete(id)
      task.reject(mapWorkerError(workerError))
    }
  }

  worker.onerror = (event) => {
    const mapped = new Error(event?.message || 'Worker failed')
    sharedWorkerState.pendingTasks.forEach(({ reject }) => reject(mapped))
    sharedWorkerState.pendingTasks.clear()
  }

  sharedWorkerState.worker = worker
  return worker
}

function releaseSharedWorker() {
  // Libera el worker solo cuando no quedan hooks activos usando este modulo.
  sharedWorkerState.consumers = Math.max(0, sharedWorkerState.consumers - 1)
  if (sharedWorkerState.consumers > 0 || !sharedWorkerState.worker) {
    return
  }

  sharedWorkerState.pendingTasks.forEach(({ reject }) => reject(new Error('Worker terminated')))
  sharedWorkerState.pendingTasks.clear()
  sharedWorkerState.worker.terminate()
  sharedWorkerState.worker = null
}

function toKnownError(error) {
  if (error instanceof WrongPasswordError || error instanceof CorruptFileError) {
    return error
  }

  const mapped = new Error(error?.message || 'Unexpected crypto failure')
  mapped.name = error?.name || 'Error'
  return mapped
}

function baseNameWithoutCvlt(fileName) {
  return fileName.endsWith('.cvlt') ? fileName.slice(0, -5) : fileName
}

function hasFileExtension(fileName) {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex > 0 && lastDotIndex < fileName.length - 1
}

function getDecryptedDownloadName(baseName, isZip = false) {
  if (isZip) {
    return baseName.toLowerCase().endsWith('.zip') ? baseName : `${baseName}.zip`
  }

  return hasFileExtension(baseName) ? baseName : `${baseName}.bin`
}

function asDomainValidationError(zodError) {
  // Traducimos errores de schema a errores de dominio para una UX consistente.
  const firstIssue = zodError.issues?.[0]
  const path = firstIssue?.path?.[0]
  const message = firstIssue?.message || 'Invalid request payload'

  if (path === 'password') {
    return new WrongPasswordError(message)
  }

  return new CorruptFileError(message)
}

export function useCrypto() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (typeof Worker !== 'undefined') {
      sharedWorkerState.consumers += 1
      ensureSharedWorker()
    }

    return () => {
      mountedRef.current = false
      if (typeof Worker !== 'undefined') {
        releaseSharedWorker()
      }
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
  }, [])

  const setProgressIfMounted = useCallback((nextProgress) => {
    if (mountedRef.current) {
      setProgress(nextProgress)
    }
  }, [])

  const runWorkerTask = useCallback((operation, payload, options = {}) => {
    const worker = ensureSharedWorker()
    if (!worker) {
      return Promise.reject(new Error('Worker unavailable'))
    }

    const id = ++sharedWorkerState.messageId
    const onProgress = options.onProgress

    return new Promise((resolve, reject) => {
      // Cada tarea conserva su resolver/reject para desacoplar multiples llamadas concurrentes.
      sharedWorkerState.pendingTasks.set(id, {
        resolve,
        reject,
        onProgress,
      })

      // Transferimos ownership de buffers grandes para evitar copias costosas.
      const transferables = []
      if (payload.fileBuffer instanceof ArrayBuffer) {
        transferables.push(payload.fileBuffer)
      }

      if (payload.encryptedBuffer instanceof ArrayBuffer) {
        transferables.push(payload.encryptedBuffer)
      }

      worker.postMessage({ id, operation, payload }, transferables)
    })
  }, [])

  const encrypt = useCallback(
    async ({ files, password, algorithm }) => {
      try {
        setStatus('processing')
        setError(null)
        setProgress(3)

        let parsed
        try {
          parsed = encryptRequestSchema.parse({ files, password, algorithm })
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw asDomainValidationError(error)
          }
          throw error
        }

        const safeFiles = parsed.files
        const safePassword = parsed.password
        const safeAlgorithm = parsed.algorithm

        let rawBuffer
        let originalName

        // Si hay multiples archivos se empaquetan antes de cifrar.
        const canUseWorker = typeof Worker !== 'undefined'

        if (safeFiles.length > 1) {
          setProgress(10)
          rawBuffer = canUseWorker
            ? await runWorkerTask(
                'pack',
                { files: safeFiles },
                {
                  onProgress: setProgressIfMounted,
                },
              )
            : await packFiles(safeFiles)
          originalName = `vault-bundle-${Date.now()}.zip`
          setProgress(28)
        } else {
          rawBuffer = await safeFiles[0].arrayBuffer()
          originalName = safeFiles[0].name
          setProgress(20)
        }

        const useWorker = canUseWorker && rawBuffer.byteLength > WORKER_THRESHOLD_BYTES
        const encryptedBuffer = useWorker
          ? await runWorkerTask(
              'encrypt',
              {
                fileBuffer: rawBuffer,
                password: safePassword,
                algorithm: safeAlgorithm,
              },
              {
                onProgress: setProgressIfMounted,
              },
            )
          : await encryptFile(rawBuffer, safePassword, safeAlgorithm)

        setProgress(100)
        setStatus('success')

        return {
          blob: new Blob([encryptedBuffer], { type: 'application/octet-stream' }),
          fileName: `${originalName}.cvlt`,
          metadata: {
            algorithm: safeAlgorithm,
            fileCount: safeFiles.length,
            encryptedSize: encryptedBuffer.byteLength,
          },
        }
      } catch (caught) {
        const mapped = toKnownError(caught)
        setError(mapped)
        setStatus('error')
        setProgress(0)
        throw mapped
      }
    },
    [runWorkerTask, setProgressIfMounted],
  )

  const decrypt = useCallback(
    async ({ file, password, algorithm }) => {
      try {
        setStatus('processing')
        setError(null)
        setProgress(4)

        let parsed
        try {
          parsed = decryptRequestSchema.parse({ file, password, algorithm })
        } catch (error) {
          if (error instanceof z.ZodError) {
            throw asDomainValidationError(error)
          }
          throw error
        }

        const safeFile = parsed.file
        const safePassword = parsed.password
        const preferredAlgorithm = parsed.algorithm

        const encryptedBuffer = await safeFile.arrayBuffer()
        const detectedAlgorithm = detectAlgorithmFromEncryptedBuffer(encryptedBuffer)
        setProgress(18)

        const canUseWorker = typeof Worker !== 'undefined'
        const useWorker = canUseWorker && encryptedBuffer.byteLength > WORKER_THRESHOLD_BYTES

        let plainBuffer
        let unpackedFiles = []

        if (useWorker) {
          // El worker descifra y extrae solo metadata ZIP para no duplicar buffers en memoria.
          const workerResult = await runWorkerTask(
            'decrypt',
            {
              encryptedBuffer,
              password: safePassword,
              algorithm: preferredAlgorithm || detectedAlgorithm,
              includeZipMetadata: true,
            },
            {
              onProgress: setProgressIfMounted,
            },
          )

          plainBuffer = workerResult.plainBuffer
          unpackedFiles = workerResult.unpackedFiles || []
        } else {
          plainBuffer = await decryptFile(
            encryptedBuffer,
            safePassword,
            preferredAlgorithm || detectedAlgorithm,
          )
        }

        if (!useWorker && isZipBuffer(plainBuffer)) {
          unpackedFiles = await unpackZip(plainBuffer, { metadataOnly: true })
        }

        const isZipPayload = isZipBuffer(plainBuffer)

        setProgress(92)

        const baseName = baseNameWithoutCvlt(safeFile.name)
        let output = {
          blob: new Blob([plainBuffer], { type: 'application/octet-stream' }),
          fileName: getDecryptedDownloadName(baseName),
          metadata: {
            algorithm: detectedAlgorithm,
            fileCount: 1,
            decryptedSize: plainBuffer.byteLength,
            unpackedFiles: [],
          },
        }

        // Si el payload descifrado es ZIP, se muestra metadata sin cargar binarios a memoria.
        if (isZipPayload) {
          output = {
            blob: new Blob([plainBuffer], { type: 'application/zip' }),
            fileName: getDecryptedDownloadName(baseName, true),
            metadata: {
              algorithm: detectedAlgorithm,
              fileCount: unpackedFiles.length,
              decryptedSize: plainBuffer.byteLength,
              unpackedFiles,
            },
          }
        }

        setProgress(100)
        setStatus('success')
        return output
      } catch (caught) {
        const mapped = toKnownError(caught)
        setError(mapped)
        setStatus('error')
        setProgress(0)
        throw mapped
      }
    },
    [runWorkerTask, setProgressIfMounted],
  )

  return {
    encrypt,
    decrypt,
    status,
    progress,
    error,
    reset,
  }
}
