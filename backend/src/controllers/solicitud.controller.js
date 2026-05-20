/**
 * Archivo: controllers/solicitud.controller.js
 * Responsabilidad: Lógica de negocio para la gestión de solicitudes de formación.
 * Conecta con: config/db.js (pool, CAT), utils/response.utils.js, utils/db.utils.js.
 * Lógica: Listar con filtros, ver detalle con aspirantes, actualizar estado.
 *
 * Optimizaciones v2.0.5:
 *  - Filtros de fecha usan rango DATE en vez de YEAR()/MONTH() para aprovechar índices.
 */
const { pool, CAT }        = require('../config/db');
const { notFoundSi, handleError } = require('../utils/response.utils');
const { construirFiltroPeriodo, normalizarPaginacion } = require('../utils/db.utils');

// Alias local para legibilidad — fuente única: CAT.solEstado en config/db.js
const ID_ESTADO_SOLICITUD = CAT.solEstado;

// ── GET /api/solicitudes ──────────────────────────────────
async function listar(req, res) {
  try {
    const { estado, empresa, anio, mes } = req.query;
    const params = [];
    let clausulaWhere = 'WHERE s.deleted_at IS NULL';

    if (estado) {
      const estadoId = ID_ESTADO_SOLICITUD[estado];
      if (estadoId) { clausulaWhere += ' AND s.estado_id = ?'; params.push(estadoId); }
    }
    if (empresa) {
      clausulaWhere += ' AND (e.nombre LIKE ? OR e.nit LIKE ?)';
      params.push(`%${empresa}%`, `%${empresa}%`);
    }
    // ✅ Rango de fechas → usa índice idx_solicitud_created
    const periodo = construirFiltroPeriodo(anio, mes, 's.created_at');
    if (periodo.filtro) { clausulaWhere += ' ' + periodo.filtro; params.push(...periodo.params); }

    const { limit, offset, pagina } = normalizarPaginacion(req.query);

    const sqlListado = `
      SELECT SQL_CALC_FOUND_ROWS
             s.id, s.num_aspirantes, s.observaciones, s.estado_id,
             se.nombre AS estado,
             s.created_at, s.revisado_en,
             e.nombre AS empresa_nombre, e.nit, e.email AS empresa_email,
             c.nombre AS curso_solicitado, c.id AS curso_id,
             COUNT(a.id) AS total_aspirantes
      FROM solicitud s
      JOIN empresa          e  ON s.empresa_id  = e.id
      JOIN curso            c  ON s.curso_id    = c.id
      JOIN solicitud_estado se ON s.estado_id   = se.id
      LEFT JOIN aspirante   a  ON a.solicitud_id = s.id
      ${clausulaWhere}
      GROUP BY s.id ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const [filas]       = await pool.query(sqlListado, params);
    const [[{ total }]] = await pool.query('SELECT FOUND_ROWS() AS total');

    res.json({ solicitudes: filas, total, pagina });
  } catch (e) {
    handleError(res, e, 'listar solicitudes', 'Error al cargar solicitudes');
  }
}

// ── GET /api/solicitudes/:id ──────────────────────────────
async function verUno(req, res) {
  try {
    const [filasSolicitud] = await pool.execute(
      `SELECT s.*, se.nombre AS estado,
              e.nombre AS empresa_nombre, e.nit, e.email AS empresa_email,
              e.telefono AS empresa_telefono, e.nombre_contacto, e.cargo_contacto,
              c.nombre AS curso_solicitado
       FROM solicitud s
       JOIN solicitud_estado se ON s.estado_id  = se.id
       JOIN empresa          e  ON s.empresa_id = e.id
       JOIN curso            c  ON s.curso_id   = c.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (notFoundSi(res, filasSolicitud, 'Solicitud no encontrada')) return;

    const [filasAspirantes] = await pool.execute(
      `SELECT a.id, a.nombre_completo, a.tipo_documento, ae.nombre AS estado_proceso
       FROM aspirante a
       JOIN aspirante_estado ae ON a.estado_id = ae.id
       WHERE a.solicitud_id = ?`,
      [req.params.id]
    );

    res.json({ ...filasSolicitud[0], aspirantes: filasAspirantes });
  } catch (e) {
    handleError(res, e, 'verUno solicitud', 'Error al cargar solicitud');
  }
}

// ── PATCH /api/solicitudes/:id/estado ────────────────────
async function actualizarEstado(req, res) {
  const { estado, motivo_rechazo } = req.body;
  const estadoId = ID_ESTADO_SOLICITUD[estado];
  if (!estadoId) return res.status(400).json({ error: 'Estado inválido' });

  try {
    await pool.execute(
      'UPDATE solicitud SET estado_id = ?, motivo_rechazo = ?, revisado_por = ?, revisado_en = NOW() WHERE id = ?',
      [estadoId, motivo_rechazo || null, req.usuario.id, req.params.id]
    );
    res.json({ mensaje: 'Estado actualizado' });
  } catch (e) {
    handleError(res, e, 'actualizarEstado solicitud', 'Error al actualizar estado');
  }
}

module.exports = { listar, verUno, actualizarEstado };
