# CryptoVault

Aplicacion web para cifrar y descifrar archivos localmente en el navegador usando WebCrypto API.

No hay backend para el procesamiento criptografico: los archivos y contraseñas no se envian a servidor.

## Que hace el proyecto

- Cifra uno o varios archivos en formato `.cvlt`.
- Si seleccionas multiples archivos, primero los empaqueta en ZIP y luego cifra ese ZIP.
- Descifra archivos `.cvlt` y restaura el contenido original.
- Muestra progreso y metadatos de salida (algoritmo, tamano, cantidad de archivos).

## Flujo criptografico (resumen)

### Cifrado

1. Valida entradas (archivos, contraseña, algoritmo).
2. Si hay varios archivos, genera un ZIP en memoria.
3. Genera `salt` aleatorio por archivo (16 bytes) e `iv` aleatorio.
4. Deriva clave con `PBKDF2-SHA256` (160000 iteraciones).
5. Cifra el payload con algoritmo seleccionado.
6. Construye archivo final en formato `CVLT v2`.

### Descifrado

1. Valida entrada (`.cvlt` + contraseña).
2. Lee header `CVLT v2` y detecta algoritmo desde el archivo.
3. Recupera `salt` e `iv` del header.
4. Deriva clave con los mismos parametros PBKDF2.
5. Descifra el contenido.
6. Si el contenido resultante es ZIP, muestra metadata de archivos internos.

## Formato de archivo `.cvlt` (v2)

Layout binario:

`[MAGIC(4)][VERSION(1)][ALGO_ID(1)][SALT_LEN(1)][SALT][IV][CIPHERTEXT]`

- `MAGIC`: `CVLT`
- `VERSION`: `127` (v2)
- `SALT_LEN`: actualmente `16`

## Algoritmos soportados

- `AES-GCM` (recomendado)
- `3DES-CBC` (legacy de compatibilidad)

## Arquitectura rapida

- `src/pages/`: vistas principales (`VaultPage`, `TeamPage`).
- `src/components/crypto/`: UI del flujo de cifrado/descifrado.
- `src/hooks/useCrypto.js`: orquesta validaciones, worker y estados de progreso.
- `src/utils/cryptoUtils.js`: logica criptografica y formato CVLT.
- `src/workers/cryptoWorker.js`: operaciones pesadas en Web Worker.

## Web Worker y rendimiento

- Para cargas grandes se delega cifrado/descifrado al worker.
- Umbral actual: `10 MB` (`WORKER_THRESHOLD_BYTES`).
- El empaquetado multiple se realiza en secuencia para reducir picos de memoria.

## Requisitos

- Node.js 20+ recomendado
- npm 10+ recomendado
- Navegador con soporte de WebCrypto API

## Ejecutar el proyecto

```bash
npm install
npm run dev
```

Abrir `http://localhost:5173`.

## Scripts

- `npm run dev`: entorno local
- `npm run build`: build produccion
- `npm run preview`: previsualizar build
- `npm run lint`: revisar reglas ESLint

## Rutas

- `/`: boveda de cifrado/descifrado
- `/equipo`: informacion del equipo y resumen tecnico

## Seguridad y consideraciones

- La seguridad depende de una contraseña fuerte.
- El procesamiento es local, pero el archivo cifrado puede ser copiado/compartido por el usuario.
- `3DES-CBC` se mantiene por compatibilidad; usa `AES-GCM` cuando sea posible.

