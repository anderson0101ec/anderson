/**
 * Archivo: controllers/certificado.controller.js
 * Responsabilidad: Lógica de negocio para emisión y listado de certificados.
 * Conecta con: config/db.js (pool, CAT), uuid, utils/response.utils.js.
 * Lógica: Listado paginado de certificados emitidos, generación con código único UUID.
 *
 * Paginación: GET /api/certificados?page=1&limit=50
 *   - page  : número de página (por defecto 1)
 *   - limit : registros por página (por defecto 50, máximo 500)
 */
const { v4: uuidv4 } = require('uuid');
const { pool, CAT }  = require('../config/db');
const { handleError } = require('../utils/response.utils');

const LIMIT_DEFAULT = 50;
const LIMIT_MAX     = 500;

// ── GET /api/certificados ─────────────────────────────────
async function listar(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(LIMIT_MAX, Math.max(1, parseInt(req.query.limit, 10) || LIMIT_DEFAULT));
    const offset = (page - 1) * limit;

    // Total de registros para que el frontend pueda construir la paginación
    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM certificado'
    );

    const [filas] = await pool.execute(
      `SELECT cert.id, cert.codigo_certificado,
              DATE_FORMAT(cert.fecha_emision, '%d/%m/%Y') AS fecha_emision,
              a.nombre_completo,
              c.nombre AS curso, g.nombre AS grupo
       FROM certificado cert
       JOIN inscripcion i ON cert.inscripcion_id = i.id
       JOIN aspirante   a ON i.aspirante_id      = a.id
       JOIN grupo       g ON i.grupo_id          = g.id
       JOIN curso       c ON g.curso_id          = c.id
       ORDER BY cert.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    res.json({
      data:        filas,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    handleError(res, e, 'listar certificados', 'Error al cargar certificados');
  }
}

// ── POST /api/certificados ────────────────────────────────
async function crear(req, res) {
  const { inscripcion_id } = req.body;
  if (!inscripcion_id) return res.status(400).json({ error: 'Inscripción requerida' });

  const codigoCertificado = `SENA-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;
  try {
    await pool.execute(
      'INSERT INTO certificado (inscripcion_id, codigo_certificado, fecha_emision, emitido_por) VALUES (?,?,CURDATE(),?)',
      [inscripcion_id, codigoCertificado, req.usuario.id]
    );
    await pool.execute(
      'UPDATE inscripcion SET estado_id = ? WHERE id = ?',
      [CAT.insEstado.APROBADO, inscripcion_id]
    );
    res.status(201).json({ codigo_certificado: codigoCertificado, mensaje: 'Certificado generado' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya existe certificado para esta inscripción' });
    }
    handleError(res, e, 'crear certificado', 'Error al generar certificado');
  }
}

module.exports = { listar, crear };
