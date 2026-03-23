import JSZip from 'jszip'

export class WrongPasswordError extends Error {
  constructor(message = 'Hubo un error al descifrar el archivo. verifica los datos. ') {
    super(message)
    this.name = 'WrongPasswordError'
  }
}

export class CorruptFileError extends Error {
  constructor(message = 'The encrypted file is corrupted') {
    super(message)
    this.name = 'CorruptFileError'
  }
}

export class UnsupportedAlgorithmError extends Error {
  constructor(message = 'Unsupported algorithm') {
    super(message)
    this.name = 'UnsupportedAlgorithmError'
  }
}

const textEncoder = new TextEncoder()
const MAGIC = textEncoder.encode('CVLT')
// Este marcador permite detectar contrasena incorrecta tras descifrar.
const PLAIN_MARKER = textEncoder.encode('CV01')
const HEADER_VERSION_V2 = 127
const SALT_LENGTH_BYTES = 16

// Config de algoritmos soportados + metadatos para serializacion en header.
const ALGORITHMS = {
  'AES-GCM': {
    id: 1,
    ivLength: 12,
    webcryptoName: 'AES-GCM',
    keyLengthBits: 256,
    deriveLengthBits: 256,
  },
  '3DES-CBC': {
    id: 2,
    ivLength: 8,
    webcryptoName: 'DES-EDE3-CBC',
    keyLengthBits: 192,
    deriveLengthBits: 192,
  },
}

const ALGORITHMS_BY_ID = Object.fromEntries(
  Object.entries(ALGORITHMS).map(([name, value]) => [value.id, { ...value, name }]),
)

function ensureArrayBuffer(value) {
  // Normaliza cualquier vista tipada a ArrayBuffer puro para operar de forma uniforme.
  if (value instanceof ArrayBuffer) {
    return value
  }

  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
  }

  throw new CorruptFileError('Invalid binary payload')
}

function concatArrayBuffers(...buffers) {
  // Concat binario manual para construir payloads sin conversiones de texto.
  const normalized = buffers.map((item) => ensureArrayBuffer(item))
  const total = normalized.reduce((acc, buffer) => acc + buffer.byteLength, 0)
  const combined = new Uint8Array(total)
  let offset = 0

  for (const buffer of normalized) {
    combined.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  }

  return combined.buffer
}

function equalsBytes(a, b) {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }

  return true
}

function resolveAlgorithm(algorithmOrId) {
  // Soporta resolucion por nombre (UI) o por id (header del archivo cifrado).
  if (typeof algorithmOrId === 'string') {
    const config = ALGORITHMS[algorithmOrId]
    if (!config) {
      throw new UnsupportedAlgorithmError(`Algorithm ${algorithmOrId} is not supported`)
    }
    return { ...config, name: algorithmOrId }
  }

  if (typeof algorithmOrId === 'number') {
    const config = ALGORITHMS_BY_ID[algorithmOrId]
    if (!config) {
      throw new UnsupportedAlgorithmError(`Algorithm ID ${algorithmOrId} is not supported`)
    }
    return config
  }

  throw new UnsupportedAlgorithmError('Missing algorithm')
}

function hasMagicHeader(bytes) {
  return (
    bytes.length >= 4 &&
    bytes[0] === MAGIC[0] &&
    bytes[1] === MAGIC[1] &&
    bytes[2] === MAGIC[2] &&
    bytes[3] === MAGIC[3]
  )
}

async function deriveKey(password, algorithmName, saltBuffer) {
  if (!password || typeof password !== 'string') {
    throw new WrongPasswordError('A password is required')
  }

  const config = resolveAlgorithm(algorithmName)
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const salt = new Uint8Array(ensureArrayBuffer(saltBuffer))
  const keyMaterial = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 160000,
      salt,
    },
    passwordKey,
    config.deriveLengthBits,
  )

  try {
    // ImportKey cambia segun algoritmo para mantener compatibilidad WebCrypto.
    if (config.name === 'AES-GCM') {
      return await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: 'AES-GCM', length: config.keyLengthBits },
        false,
        ['encrypt', 'decrypt'],
      )
    }

    return await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: config.webcryptoName },
      false,
      ['encrypt', 'decrypt'],
    )
  } catch {
    throw new UnsupportedAlgorithmError(
      `${config.name} is unavailable in this browser WebCrypto implementation`,
    )
  }
}

function wrapPlaintext(fileBuffer) {
  // Prepend de marker para validar integridad logica al descifrar.
  return concatArrayBuffers(PLAIN_MARKER.buffer, fileBuffer)
}

function unwrapPlaintext(decryptedBuffer) {
  const bytes = new Uint8Array(decryptedBuffer)
  const marker = bytes.subarray(0, PLAIN_MARKER.length)

  if (!equalsBytes(marker, PLAIN_MARKER)) {
    throw new WrongPasswordError()
  }

  const payload = bytes.subarray(PLAIN_MARKER.length)
  // Se retorna una copia exacta para desacoplar el resultado del buffer original.
  return payload.slice().buffer
}

function parseHeader(encryptedBuffer) {
  const view = new Uint8Array(encryptedBuffer)

  if (view.byteLength < 7) {
    throw new CorruptFileError('Encrypted file is too small')
  }

  if (!hasMagicHeader(view)) {
    throw new CorruptFileError('Missing CryptoVault magic header')
  }

  if (view[4] !== HEADER_VERSION_V2) {
    throw new CorruptFileError('Unsupported CryptoVault format version')
  }

  // Layout v2: [MAGIC(4)][VERSION(1)][ALGO(1)][SALT_LEN(1)][SALT][IV][CIPHERTEXT]
  const algorithmId = view[5]
  const config = resolveAlgorithm(algorithmId)
  const saltLength = view[6]
  const saltStart = 7
  const saltEnd = saltStart + saltLength
  const ivStart = saltEnd
  const ivEnd = ivStart + config.ivLength

  if (saltLength !== SALT_LENGTH_BYTES || view.byteLength <= ivEnd) {
    throw new CorruptFileError('Encrypted payload is truncated')
  }

  const salt = view.subarray(saltStart, saltEnd)
  const iv = view.subarray(ivStart, ivEnd)
  const ciphertext = view.subarray(ivEnd)

  return { config, iv, ciphertext, salt }
}

export async function encryptFile(fileBuffer, password, algorithm) {
  const normalizedBuffer = ensureArrayBuffer(fileBuffer)
  const config = resolveAlgorithm(algorithm)
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(config.ivLength))
  const key = await deriveKey(password, config.name, salt)
  const payload = wrapPlaintext(normalizedBuffer)

  let encrypted
  try {
    if (config.name === 'AES-GCM') {
      encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload)
    } else if (config.name === '3DES-CBC') {
      encrypted = await crypto.subtle.encrypt({ name: config.webcryptoName, iv }, key, payload)
    } else {
      throw new UnsupportedAlgorithmError(`Unsupported algorithm: ${algorithm}`)
    }
  } catch (error) {
    if (error instanceof UnsupportedAlgorithmError) {
      throw error
    }

    throw new CorruptFileError('Encryption failed')
  }

  const header = new Uint8Array(7)
  // Header versionado para soportar evolucion del formato de cifrado.
  header.set(MAGIC, 0)
  header[4] = HEADER_VERSION_V2
  header[5] = config.id
  header[6] = salt.byteLength

  // Formato final v2: [CVLT][VER][ALG_ID][SALT_LEN][SALT][IV][CIPHERTEXT]
  return concatArrayBuffers(header.buffer, salt.buffer, iv.buffer, encrypted)
}

export async function decryptFile(encryptedBuffer, password, algorithm) {
  const normalized = ensureArrayBuffer(encryptedBuffer)
  const { config, iv, ciphertext, salt } = parseHeader(normalized)

  if (algorithm && algorithm !== config.name) {
    // No filtramos detalles del algoritmo real para evitar pistas al usuario.
    throw new WrongPasswordError()
  }

  const key = await deriveKey(password, config.name, salt)

  let decrypted
  try {
    if (config.name === 'AES-GCM') {
      decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    } else {
      decrypted = await crypto.subtle.decrypt({ name: config.webcryptoName, iv }, key, ciphertext)
    }
  } catch (error) {
    if (error instanceof UnsupportedAlgorithmError) {
      throw error
    }

    if (error?.name === 'OperationError' || error?.name === 'DataError') {
      throw new WrongPasswordError()
    }

    throw new CorruptFileError('Unable to decrypt payload')
  }

  return unwrapPlaintext(decrypted)
}

export async function packFiles(fileList) {
  if (!Array.isArray(fileList) || fileList.length === 0) {
    throw new CorruptFileError('No files to pack')
  }

  const zip = new JSZip()

  // Conserva rutas relativas y limita memoria procesando secuencialmente.
  for (const file of fileList) {
    const path = file.webkitRelativePath || file.name
    const buffer = await file.arrayBuffer()
    zip.file(path, buffer)
  }

  return zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    // Nivel medio: mejor balance entre CPU y tamano para lotes grandes.
    compressionOptions: { level: 6 },
  })
}

export async function unpackZip(arrayBuffer, options = {}) {
  const metadataOnly = options?.metadataOnly === true

  try {
    const zip = await JSZip.loadAsync(ensureArrayBuffer(arrayBuffer))
    const entries = []

    for (const entry of Object.values(zip.files)) {
      if (entry.dir) {
        continue
      }

      if (metadataOnly) {
        entries.push({
          name: entry.name,
          // JSZip no expone size por API publica en este punto; fallback seguro a 0.
          size: typeof entry._data?.uncompressedSize === 'number' ? entry._data.uncompressedSize : 0,
        })
        continue
      }

      const data = await entry.async('arraybuffer')
      entries.push({
        name: entry.name,
        size: data.byteLength,
        data,
      })
    }

    // Se devuelve metadata + binario para poder mostrar lista y permitir descarga.
    return entries
  } catch {
    throw new CorruptFileError('Invalid ZIP payload')
  }
}

export function getAlgorithmOptions() {
  return [
    {
      id: ALGORITHMS['AES-GCM'].id,
      value: 'AES-GCM',
      label: 'AES-256-GCM',
      description: 'Cifrado autenticado, recomendado para uso moderno.',
      legacy: false,
    },
    {
      id: ALGORITHMS['3DES-CBC'].id,
      value: '3DES-CBC',
      label: '3DES-CBC',
      description:
        'Modo legacy de compatibilidad. Algunos navegadores no exponen 3DES en WebCrypto.',
      legacy: true,
    },
  ]
}

export function detectAlgorithmFromEncryptedBuffer(encryptedBuffer) {
  const normalized = ensureArrayBuffer(encryptedBuffer)
  const bytes = new Uint8Array(normalized)

  // Validacion rapida de firma antes de intentar descifrar.
  if (bytes.length < 5 || !hasMagicHeader(bytes)) {
    throw new CorruptFileError('Not a CryptoVault encrypted file')
  }

  if (bytes[4] !== HEADER_VERSION_V2) {
    throw new CorruptFileError('Unsupported CryptoVault format version')
  }

  if (bytes.length < 6) {
    throw new CorruptFileError('Encrypted payload is truncated')
  }

  return resolveAlgorithm(bytes[5]).name
}

export function isZipBuffer(buffer) {
  const view = new Uint8Array(ensureArrayBuffer(buffer))
  return view.byteLength > 4 && view[0] === 0x50 && view[1] === 0x4b
}
