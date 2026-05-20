/**
 * Archivo: utils/response.utils.js
 * Responsabilidad: Helpers para respuestas HTTP estandarizadas y manejo de errores.
 * Conecta con: todos los controladores del backend.
 */

/**
 * Devuelve 404 si el arreglo de filas está vacío.
 * @param {import('express').Response} res
 * @param {Array} rows
 * @param {string} mensaje
 * @returns {boolean} true si se envió la respuesta 404
 */
function notFoundSi(res, rows, mensaje = 'Registro no encontrado') {
  if (!rows.length) {
    res.status(404).json({ error: mensaje });
    return true;
  }
  return false;
}

/**
 * Manejador genérico de error de controlador.
 * - Propaga el status HTTP si el error lo define (ej. errores de validación propios).
 * - En desarrollo muestra el stack; en producción solo el mensaje público.
 * @param {import('express').Response} res
 * @param {Error} error
 * @param {string} contexto  Texto para console.error (ej. 'listar aspirantes')
 * @param {string} [mensaje] Mensaje público para el cliente
 */
function handleError(res, error, contexto, mensaje = 'Error interno del servidor') {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${contexto}]`, error.stack || error.message);
  } else {
    console.error(`[${contexto}]`, error.message);
  }
  const status = error.status || error.statusCode || 500;
  res.status(status).json({ error: mensaje });
}

module.exports = { notFoundSi, handleError };
