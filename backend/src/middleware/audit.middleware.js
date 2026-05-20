/**
 * Archivo: middleware/audit.middleware.js
 * Responsabilidad: Registro de operaciones en la tabla auditoria_log.
 * Conecta con: config/db.js (pool), controllers/aspirante.controller.js,
 *              controllers/auth.controller.js, controllers/grupo.controller.js.
 * Lógica: Función registrarAuditoria que persiste quién hizo qué y cuándo.
 */
const { pool } = require('../config/db');

async function registrarAuditoria({ tabla, operacion, registroId, usuarioId, datoAntes, datoDespues, req }) {
  try {
    const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || null;
    const userAgent = req?.headers['user-agent']?.substring(0, 500) || null;

    await pool.execute(
      `INSERT INTO auditoria_log
        (tabla, operacion, registro_id, usuario_id, dato_antes, dato_despues, ip_origen, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tabla,
        operacion,
        registroId || null,
        usuarioId || null,
        datoAntes ? JSON.stringify(datoAntes) : null,
        datoDespues ? JSON.stringify(datoDespues) : null,
        ip,
        userAgent,
      ]
    );
  } catch (error) {
    // No fallar por error de auditoría
    console.error('Error en auditoría:', error.message);
  }
}

module.exports = { registrarAuditoria };
