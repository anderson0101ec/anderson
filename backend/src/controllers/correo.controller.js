/**
 * Archivo: controllers/correo.controller.js
 * Responsabilidad: Lógica de negocio para envío de correos y consulta del historial.
 * Conecta con: config/db.js (pool), services/correo.service.js, utils/response.utils.js.
 * Lógica: Envío manual de correo por tipo, listado del historial de envíos.
 */
const { pool }           = require('../config/db');
const { enviarCorreo }   = require('../services/correo.service');
const { handleError }    = require('../utils/response.utils');

// ── POST /api/correos ─────────────────────────────────────
async function enviar(req, res) {
  const { tipo, destinatario, datos, asunto, aspirante_id, empresa_id } = req.body;
  if (!tipo || !destinatario) {
    return res.status(400).json({ error: 'Tipo y destinatario requeridos' });
  }
  try {
    const resultado = await enviarCorreo({
      tipo,
      destinatario,
      datos:       datos || {},
      asunto,
      usuarioId:   req.usuario.id,
      aspiranteId: aspirante_id,
      empresaId:   empresa_id,
    });
    if (resultado.estado === 'ERROR') {
      console.error('[correo.controller] Error SMTP:', resultado.error);
      return res.status(502).json({ error: 'Error al enviar correo: ' + resultado.error, estado: 'ERROR' });
    }
    res.json(resultado);
  } catch (e) {
    handleError(res, e, 'enviar correo', 'Error al enviar correo');
  }
}

// ── GET /api/correos/historial ────────────────────────────
async function historial(req, res) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM correo_log'
    );

    const [filas] = await pool.execute(
      `SELECT cl.id, ct.nombre AS tipo, cl.destinatario, cl.asunto, cl.estado, cl.enviado_en,
              a.nombre_completo, e.nombre AS empresa
       FROM correo_log cl
       JOIN correo_tipo ct ON cl.tipo_id     = ct.id
       LEFT JOIN aspirante a ON cl.aspirante_id = a.id
       LEFT JOIN empresa   e ON cl.empresa_id   = e.id
       ORDER BY cl.enviado_en DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    res.json({
      data:       filas,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    handleError(res, e, 'historial correos', 'Error al cargar historial de correos');
  }
}

module.exports = { enviar, historial };
