/**
 * Archivo: controllers/curso.controller.js
 * Responsabilidad: Lógica de negocio para el catálogo de cursos.
 * Conecta con: config/db.js (pool), utils/response.utils.js.
 * Lógica: Listar, crear, actualizar, soft-delete.
 * Nota: todos los cursos son certificables por defecto (certificable=1 fijo en DB).
 */
const { pool }        = require('../config/db');
const { handleError } = require('../utils/response.utils');

// ── GET /api/cursos ───────────────────────────────────────
async function listar(req, res) {
  try {
    const [filas] = await pool.execute(
      'SELECT * FROM curso WHERE deleted_at IS NULL ORDER BY nombre'
    );
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listar cursos', 'Error al cargar cursos');
  }
}

// ── POST /api/cursos ──────────────────────────────────────
async function crear(req, res) {
  const { nombre, descripcion, requerimientos_inscripcion, intensidad_horaria } = req.body;
  if (!nombre || !intensidad_horaria) {
    return res.status(400).json({ error: 'Nombre e intensidad horaria son obligatorios' });
  }
  try {
    const [resultado] = await pool.execute(
      `INSERT INTO curso
         (nombre, descripcion, requerimientos_inscripcion, intensidad_horaria, certificable, created_by)
       VALUES (?,?,?,?,1,?)`,
      [nombre, descripcion || null, requerimientos_inscripcion || null, intensidad_horaria, req.usuario.id]
    );
    res.status(201).json({ id: resultado.insertId, mensaje: 'Curso creado' });
  } catch (e) {
    handleError(res, e, 'crear curso', 'Error al crear curso');
  }
}

// ── PUT /api/cursos/:id ───────────────────────────────────
async function actualizar(req, res) {
  const { nombre, descripcion, requerimientos_inscripcion, intensidad_horaria } = req.body;
  try {
    await pool.execute(
      'UPDATE curso SET nombre = ?, descripcion = ?, requerimientos_inscripcion = ?, intensidad_horaria = ? WHERE id = ?',
      [nombre, descripcion, requerimientos_inscripcion, intensidad_horaria, req.params.id]
    );
    res.json({ mensaje: 'Curso actualizado' });
  } catch (e) {
    handleError(res, e, 'actualizar curso', 'Error al actualizar curso');
  }
}

// ── DELETE /api/cursos/:id ────────────────────────────────
async function eliminar(req, res) {
  try {
    await pool.execute('UPDATE curso SET deleted_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Curso eliminado' });
  } catch (e) {
    handleError(res, e, 'eliminar curso', 'Error al eliminar curso');
  }
}

module.exports = { listar, crear, actualizar, eliminar };
