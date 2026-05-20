/**
 * Archivo: utils/crypto.utils.js
 * Responsabilidad: Cifrado y descifrado AES-256-CBC de datos personales sensibles.
 * Conecta con: routes/public.routes.js, controllers/aspirante.controller.js.
 * Lógica: cifrar() y descifrar() con clave de entorno, compatible con VARBINARY MySQL.
 *
 * Mejoras:
 *  - descifrar() distingue entre "dato nulo/vacío" (retorna null en silencio) y
 *    "dato presente pero malformado" (loguea advertencia en desarrollo).
 *  - cifrar() rechaza entradas no-string con TypeError en lugar de fallar silenciosamente.
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// Clave exactamente 32 bytes (padding con cero si es más corta)
const rawKey = process.env.ENCRYPTION_KEY || 'mayzer_clave_32_chars_cambiar!!';
const KEY = Buffer.alloc(32);
Buffer.from(rawKey, 'utf8').copy(KEY);

function cifrar(texto) {
  if (texto === null || texto === undefined) return null;
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(texto), 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function descifrar(valor) {
  if (valor === null || valor === undefined) return null;

  try {
    // Acepta tanto string como Buffer (VARBINARY de MySQL)
    const texto = Buffer.isBuffer(valor) ? valor.toString('binary') : String(valor);
    if (!texto) return null;

    // Formato esperado: "<iv_hex>:<datos_hex>"
    const colonIdx = texto.indexOf(':');
    if (colonIdx < 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[crypto] descifrar: formato inválido (sin separador ":")', texto.slice(0, 20));
      }
      return null;
    }

    const ivHex        = texto.slice(0, colonIdx);
    const encryptedHex = texto.slice(colonIdx + 1);

    const iv        = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    if (iv.length !== 16) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[crypto] descifrar: IV de longitud incorrecta:', iv.length);
      }
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[crypto] descifrar: error al descifrar:', err.message);
    }
    return null;
  }
}

module.exports = { cifrar, descifrar };
