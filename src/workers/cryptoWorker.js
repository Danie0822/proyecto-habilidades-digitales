import { decryptFile, encryptFile, isZipBuffer, packFiles, unpackZip } from '../utils/cryptoUtils'

const progressByTaskId = new Map()

function startProgress(id) {
  stopProgress(id)

  const state = {
    progress: 4,
    timer: null,
  }

  // Progreso simulado para mantener feedback visual mientras WebCrypto termina.
  state.timer = setInterval(() => {
    state.progress = Math.min(state.progress + Math.random() * 7 + 1, 90)
    self.postMessage({ id, type: 'progress', progress: Math.round(state.progress) })
  }, 120)

  progressByTaskId.set(id, state)
}

function stopProgress(id) {
  const state = progressByTaskId.get(id)
  if (!state) {
    return
  }

  if (state.timer) {
    clearInterval(state.timer)
  }

  progressByTaskId.delete(id)
}

function serializeError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || 'Unexpected worker error',
  }
}

self.onmessage = async (event) => {
  const { id, operation, payload } = event.data

  if (!id || !operation) {
    return
  }

  startProgress(id)

  try {
    let result

    if (operation === 'encrypt') {
      result = await encryptFile(payload.fileBuffer, payload.password, payload.algorithm)
    } else if (operation === 'pack') {
      result = await packFiles(payload.files)
    } else if (operation === 'decrypt') {
      const plainBuffer = await decryptFile(
        payload.encryptedBuffer,
        payload.password,
        payload.algorithm,
      )

      let unpackedFiles = []
      if (payload.includeZipMetadata && isZipBuffer(plainBuffer)) {
        unpackedFiles = await unpackZip(plainBuffer, { metadataOnly: true })
      }

      result = {
        plainBuffer,
        unpackedFiles,
      }
    } else {
      throw new Error(`Unknown operation: ${operation}`)
    }

    stopProgress(id)
    self.postMessage({ id, type: 'progress', progress: 100 })

    const transferables = []
    if (result instanceof ArrayBuffer) {
      transferables.push(result)
    }

    if (result?.plainBuffer instanceof ArrayBuffer) {
      transferables.push(result.plainBuffer)
    }

    // Enviamos resultados como transferable para evitar copias en memoria.
    self.postMessage({ id, type: 'result', result }, transferables)
  } catch (error) {
    stopProgress(id)
    self.postMessage({ id, type: 'error', error: serializeError(error) })
  }
}
