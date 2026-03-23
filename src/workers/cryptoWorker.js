import { decryptFile, encryptFile } from '../utils/cryptoUtils'

let fakeProgress = 0
let fakeTimer = null

function startProgress(id) {
  stopProgress()
  fakeProgress = 4

  // Progreso simulado para mantener feedback visual mientras WebCrypto termina.
  fakeTimer = setInterval(() => {
    fakeProgress = Math.min(fakeProgress + Math.random() * 7 + 1, 90)
    self.postMessage({ id, type: 'progress', progress: Math.round(fakeProgress) })
  }, 120)
}

function stopProgress() {
  if (fakeTimer) {
    clearInterval(fakeTimer)
    fakeTimer = null
  }
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
    } else if (operation === 'decrypt') {
      result = await decryptFile(payload.encryptedBuffer, payload.password, payload.algorithm)
    } else {
      throw new Error(`Unknown operation: ${operation}`)
    }

    stopProgress()
    self.postMessage({ id, type: 'progress', progress: 100 })
    // Enviamos el resultado como transferable para evitar copias en memoria.
    self.postMessage({ id, type: 'result', result }, [result])
  } catch (error) {
    stopProgress()
    self.postMessage({ id, type: 'error', error: serializeError(error) })
  }
}
