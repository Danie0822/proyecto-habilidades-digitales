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
  const workerRef = useRef(null)
  const pendingRef = useRef(new Map())
  const messageIdRef = useRef(0)

  useEffect(() => {
    if (typeof Worker === 'undefined') {
      return () => {}
    }

    const worker = new Worker(new URL('../workers/cryptoWorker.js', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    const pendingTasks = pendingRef.current

    worker.onmessage = (event) => {
      const { id, type, progress: nextProgress, result, error: workerError } = event.data
      const resolver = pendingTasks.get(id)

      if (!resolver) {
        return
      }

      if (type === 'progress') {
        setProgress(nextProgress)
        return
      }

      if (type === 'result') {
        pendingTasks.delete(id)
        resolver.resolve(result)
        return
      }

      if (type === 'error') {
        pendingTasks.delete(id)
        const mapped = new Error(workerError?.message || 'Worker crypto error')
        mapped.name = workerError?.name || 'Error'
        resolver.reject(mapped)
      }
    }

    return () => {
      pendingTasks.forEach(({ reject }) => reject(new Error('Worker terminated')))
      pendingTasks.clear()
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
  }, [])

  const runWorkerTask = useCallback((operation, payload) => {
    if (!workerRef.current) {
      return Promise.reject(new Error('Worker unavailable'))
    }

    const id = ++messageIdRef.current

    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject })

      // Transferimos ownership de buffers grandes para evitar copias costosas.
      const transferables = []
      if (payload.fileBuffer instanceof ArrayBuffer) {
        transferables.push(payload.fileBuffer)
      }

      if (payload.encryptedBuffer instanceof ArrayBuffer) {
        transferables.push(payload.encryptedBuffer)
      }

      workerRef.current.postMessage({ id, operation, payload }, transferables)
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
        if (safeFiles.length > 1) {
          setProgress(10)
          rawBuffer = await packFiles(safeFiles)
          originalName = `vault-bundle-${Date.now()}.zip`
          setProgress(28)
        } else {
          rawBuffer = await safeFiles[0].arrayBuffer()
          originalName = safeFiles[0].name
          setProgress(20)
        }

        const useWorker = rawBuffer.byteLength > WORKER_THRESHOLD_BYTES && workerRef.current
        const encryptedBuffer = useWorker
          ? await runWorkerTask('encrypt', {
              fileBuffer: rawBuffer,
              password: safePassword,
              algorithm: safeAlgorithm,
            })
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
    [runWorkerTask],
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

        const useWorker = encryptedBuffer.byteLength > WORKER_THRESHOLD_BYTES && workerRef.current
        const plainBuffer = useWorker
          ? await runWorkerTask('decrypt', {
              encryptedBuffer,
              password: safePassword,
              algorithm: preferredAlgorithm || detectedAlgorithm,
            })
          : await decryptFile(
              encryptedBuffer,
              safePassword,
              preferredAlgorithm || detectedAlgorithm,
            )

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

        // Si el payload descifrado es ZIP, lo dejamos listo para descarga directa.
        if (isZipBuffer(plainBuffer)) {
          const unpacked = await unpackZip(plainBuffer)
          output = {
            blob: new Blob([plainBuffer], { type: 'application/zip' }),
            fileName: getDecryptedDownloadName(baseName, true),
            metadata: {
              algorithm: detectedAlgorithm,
              fileCount: unpacked.length,
              decryptedSize: plainBuffer.byteLength,
              unpackedFiles: unpacked,
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
    [runWorkerTask],
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
