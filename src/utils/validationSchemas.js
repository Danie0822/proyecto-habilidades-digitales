import { z } from 'zod'

// Schemas de entrada para validar requests antes de ejecutar crypto.
const ALGORITHM_VALUES = ['AES-GCM', '3DES-CBC']

// Validaciones ASCII sin regex para mantener reglas centralizadas y explicitas.
function hasUppercase(text) {
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code >= 65 && code <= 90) {
      return true
    }
  }
  return false
}

function hasLowercase(text) {
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code >= 97 && code <= 122) {
      return true
    }
  }
  return false
}

function hasDigit(text) {
  for (const char of text) {
    const code = char.charCodeAt(0)
    if (code >= 48 && code <= 57) {
      return true
    }
  }
  return false
}

function hasSymbol(text) {
  for (const char of text) {
    const code = char.charCodeAt(0)
    const isUpper = code >= 65 && code <= 90
    const isLower = code >= 97 && code <= 122
    const isDigitCode = code >= 48 && code <= 57
    if (!isUpper && !isLower && !isDigitCode) {
      return true
    }
  }
  return false
}

// Schema base para evaluar fortaleza sin mezclarlo con reglas de operacion.
export const passwordStrengthSchema = z.object({
  password: z.string().max(1024, 'Password is too long'),
})

// Reglas de entrada para flujo de cifrado.
export const encryptRequestSchema = z.object({
  files: z.array(z.instanceof(File)).min(1, 'Select at least one file to encrypt'),
  password: z
    .string()
    .min(8, 'Password must contain at least 8 characters')
    .max(1024, 'Password is too long'),
  algorithm: z.enum(ALGORITHM_VALUES, {
    errorMap: () => ({ message: 'Unsupported algorithm selection' }),
  }),
})

// Reglas de entrada para flujo de descifrado.
export const decryptRequestSchema = z.object({
  file: z.instanceof(File, { message: 'Select an encrypted .cvlt file' }),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(1024, 'Password is too long'),
  algorithm: z
    .enum(ALGORITHM_VALUES, {
      errorMap: () => ({ message: 'Unsupported algorithm selection' }),
    })
    .optional(),
})

export const algorithmSchema = z.enum(ALGORITHM_VALUES)

export function evaluatePasswordStrength(password) {
  // Se valida primero con zod y luego se calcula un score simple de 0-100.
  const parsed = passwordStrengthSchema.parse({ password })
  const safePassword = parsed.password

  let score = 0
  if (safePassword.length >= 8) score += 25
  if (hasUppercase(safePassword)) score += 20
  if (hasLowercase(safePassword)) score += 20
  if (hasDigit(safePassword)) score += 20
  if (hasSymbol(safePassword)) score += 15

  return Math.min(score, 100)
}
