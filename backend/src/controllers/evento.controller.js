/**
 * Archivo: controllers/evento.controller.js  v1.0.2
 * Responsabilidad: Lógica de negocio para eventos/clases programadas.
 * Conecta con: config/db.js (pool), utils/response.utils.js.
 * Cambios v1.0.2:
 *   - listar() acepta query param instructor_id para filtrar solo los eventos
 *     de los grupos asignados al instructor autenticado.
 *   - El filtrado ocurre en BD, no en el frontend.
 */
const { pool }        = require('../config/db');
const { handleError } = require('../utils/response.utils');

// ── GET /api/eventos ──────────────────────────────────────
async function listar(req, res) {
  try {
    const { mes, anio, grupo_id, instructor_id } = req.query;
    const params = [];
    let clausulaWhere = 'WHERE 1=1';

    if (mes)           { clausulaWhere += ' AND MONTH(ev.fecha_inicio) = ?'; params.push(mes); }
    if (anio)          { clausulaWhere += ' AND YEAR(ev.fecha_inicio) = ?';  params.push(anio); }
    if (grupo_id)      { clausulaWhere += ' AND ev.grupo_id = ?'; params.push(grupo_id); }
    if (instructor_id) {
      // Solo eventos de grupos donde el instructor está asignado
      clausulaWhere += ' AND g.instructor_id = ?';
      params.push(Number(instructor_id));
    }

    const [filas] = await pool.execute(
      `SELECT ev.id, ev.titulo, ev.observaciones,
              DATE_FORMAT(ev.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
              DATE_FORMAT(ev.fecha_fin,   '%Y-%m-%d') AS fecha_fin,
              ev.hora_inicio, ev.hora_fin,
              ev.grupo_id, g.nombre AS grupo_nombre,
              g.instructor_id,
              u.nombre_completo AS instructor_nombre,
              c.nombre AS curso_nombre,
              l.nombre AS lugar_nombre, l.id AS lugar_id
       FROM evento ev
       JOIN grupo g ON ev.grupo_id = g.id
       JOIN curso c ON g.curso_id  = c.id
       JOIN instructor ins ON g.instructor_id = ins.id
       JOIN usuario u ON ins.usuario_id = u.id
       LEFT JOIN lugar l ON ev.lugar_id = l.id
       ${clausulaWhere}
       ORDER BY ev.fecha_inicio`,
      params
    );
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listar eventos', 'Error al cargar eventos');
  }
}

// ── POST /api/eventos ─────────────────────────────────────
async function crear(req, res) {
  const { grupo_id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, lugar_id, observaciones } = req.body;
  if (!grupo_id || !titulo || !fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    const [resultado] = await pool.execute(
      `INSERT INTO evento
         (grupo_id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, lugar_id, observaciones, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [grupo_id, titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
       lugar_id || null, observaciones || null, req.usuario.id]
    );
    res.status(201).json({ id: resultado.insertId, mensaje: 'Clase programada' });
  } catch (e) {
    const mensajePublico = e.message?.includes('hora_fin')
      ? 'La hora de fin debe ser posterior a la de inicio'
      : 'Error al programar clase';
    handleError(res, e, 'crear evento', mensajePublico);
  }
}

// ── PUT /api/eventos/:id ──────────────────────────────────
async function actualizar(req, res) {
  const { titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin, lugar_id, observaciones } = req.body;
  try {
    await pool.execute(
      `UPDATE evento
         SET titulo = ?, fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?,
             lugar_id = ?, observaciones = ?
       WHERE id = ?`,
      [titulo, fecha_inicio, fecha_fin, hora_inicio, hora_fin,
       lugar_id || null, observaciones, req.params.id]
    );
    res.json({ mensaje: 'Evento actualizado' });
  } catch (e) {
    handleError(res, e, 'actualizar evento', 'Error al actualizar evento');
  }
}

// ── DELETE /api/eventos/:id ───────────────────────────────
async function eliminar(req, res) {
  try {
    await pool.execute('DELETE FROM evento WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Evento eliminado' });
  } catch (e) {
    handleError(res, e, 'eliminar evento', 'Error al eliminar evento');
  }
}

module.exports = { listar, crear, actualizar, eliminar };
