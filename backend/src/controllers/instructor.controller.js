/**
 * Archivo: controllers/instructor.controller.js
 * Responsabilidad: Gestión completa de instructores (listar, crear, editar, eliminar, historial).
 * Conecta con: config/db.js (pool, CAT), bcrypt, utils/response.utils.js.
 * Lógica: CRUD con transacciones, soft-delete, historial de asignaciones instructor↔grupo
 *         con fallback retroactivo para datos previos a la migración v1.2.5.
 */
const bcrypt = require('bcryptjs');
const { pool, CAT }           = require('../config/db');
const { notFoundSi, handleError } = require('../utils/response.utils');

// ── GET /api/instructores ─────────────────────────────────
async function listar(req, res) {
  try {
    const [filas] = await pool.execute(
      `SELECT ins.id, ins.especialidad, ins.experiencia_anios, ins.horas_maximas, ins.activo, ins.telefono, ins.color,
              u.id AS usuario_id, u.nombre_completo, u.email,
              COUNT(DISTINCT g.id)                   AS grupos_activos,
              COALESCE(SUM(DISTINCT ev_sum.horas_evento), 0) AS horas_asignadas
       FROM instructor ins
       JOIN usuario u ON ins.usuario_id = u.id
       LEFT JOIN grupo g ON g.instructor_id = ins.id AND g.estado_id IN (1,2)
       LEFT JOIN (
         SELECT ev.grupo_id,
                SUM(TIMESTAMPDIFF(HOUR, ev.hora_inicio, ev.hora_fin)) AS horas_evento
         FROM evento ev GROUP BY ev.grupo_id
       ) ev_sum ON ev_sum.grupo_id IN (
         SELECT id FROM grupo WHERE instructor_id = ins.id AND deleted_at IS NULL
       )
       WHERE ins.deleted_at IS NULL
       GROUP BY ins.id
       ORDER BY u.nombre_completo`
    );
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listar instructores', 'Error al listar instructores');
  }
}

// ── POST /api/instructores ────────────────────────────────
async function crear(req, res) {
  const {
    nombre_completo, email, nombre_usuario, contrasena,
    especialidad, experiencia_anios = 0, horas_maximas = 40, telefono,
  } = req.body;

  if (!nombre_completo || !email || !nombre_usuario || !contrasena) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const passwordHash = await bcrypt.hash(contrasena, 12);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [resultUsuario] = await conn.execute(
      'INSERT INTO usuario (nombre_completo, nombre_usuario, email, contrasena_hash, rol_id) VALUES (?,?,?,?,?)',
      [nombre_completo, nombre_usuario, email, passwordHash, CAT.rol.INSTRUCTOR]
    );
    await conn.execute(
      'INSERT INTO instructor (usuario_id, especialidad, experiencia_anios, horas_maximas, telefono, color) VALUES (?,?,?,?,?,?)',
      [resultUsuario.insertId, especialidad || null, experiencia_anios, horas_maximas, telefono || null, null]
    );
    await conn.commit();
    res.status(201).json({ mensaje: 'Instructor creado' });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Usuario o email ya existe' });
    handleError(res, e, 'crear instructor', 'Error al crear instructor');
  } finally { conn.release(); }
}

// ── PUT /api/instructores/:id ─────────────────────────────
async function editar(req, res) {
  const { id } = req.params;
  const {
    nombre_completo, email, telefono,
    especialidad, experiencia_anios, horas_maximas, activo,
    contrasena, color,
  } = req.body;

  if (!nombre_completo || !email) {
    return res.status(400).json({ error: 'Nombre y email son obligatorios' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [filasInstructor] = await conn.execute(
      'SELECT ins.id, ins.usuario_id FROM instructor ins WHERE ins.id = ? AND ins.deleted_at IS NULL',
      [id]
    );
    if (!filasInstructor.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Instructor no encontrado' });
    }

    const { usuario_id } = filasInstructor[0];

    await conn.execute(
      'UPDATE usuario SET nombre_completo = ?, email = ? WHERE id = ?',
      [nombre_completo, email, usuario_id]
    );

    if (contrasena && contrasena.trim().length >= 8) {
      const hash = await bcrypt.hash(contrasena, 12);
      await conn.execute('UPDATE usuario SET contrasena_hash = ? WHERE id = ?', [hash, usuario_id]);
    }

    await conn.execute(
      `UPDATE instructor
         SET telefono = ?, especialidad = ?, experiencia_anios = ?, horas_maximas = ?,
             color = COALESCE(?, color),
             activo = COALESCE(?, activo)
       WHERE id = ?`,
      [
        telefono       || null,
        especialidad   || null,
        experiencia_anios ?? 0,
        horas_maximas  ?? 40,
        color !== undefined ? (color || null) : null,
        activo !== undefined ? (activo ? 1 : 0) : null,
        id,
      ]
    );

    await conn.commit();
    res.json({ mensaje: 'Instructor actualizado' });
  } catch (e) {
    await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email ya existe en otro usuario' });
    handleError(res, e, 'editar instructor', 'Error al actualizar instructor');
  } finally { conn.release(); }
}

// ── GET /api/instructores/:id/historial ──────────────────
// Devuelve historial de asignaciones.
// Si la tabla historial no tiene registros para el instructor (grupos preexistentes
// a la migración v1.2.5), hace fallback a los grupos directamente asignados.
async function historial(req, res) {
  try {
    const { id } = req.params;

    const [filasHistorial] = await pool.execute(
      `SELECT
         h.id, h.fecha_asignacion, h.nota,
         g.id AS grupo_id, g.nombre AS grupo_nombre,
         g.fecha_inicio, g.fecha_fin,
         c.nombre AS curso_nombre,
         ge.nombre AS grupo_estado,
         u.nombre_completo AS asignado_por_nombre
       FROM instructor_grupo_historial h
       JOIN grupo        g  ON h.grupo_id     = g.id
       JOIN curso        c  ON g.curso_id     = c.id
       JOIN grupo_estado ge ON g.estado_id    = ge.id
       LEFT JOIN usuario u  ON h.asignado_por = u.id
       WHERE h.instructor_id = ?
       ORDER BY h.fecha_asignacion DESC`,
      [id]
    );

    if (filasHistorial.length > 0) return res.json(filasHistorial);

    // Fallback: grupos directamente asignados al instructor (migración retroactiva)
    const [filasGrupos] = await pool.execute(
      `SELECT
         g.id AS id,
         g.created_at AS fecha_asignacion,
         NULL AS nota,
         g.id AS grupo_id, g.nombre AS grupo_nombre,
         g.fecha_inicio, g.fecha_fin,
         c.nombre AS curso_nombre,
         ge.nombre AS grupo_estado,
         NULL AS asignado_por_nombre
       FROM grupo g
       JOIN curso        c  ON g.curso_id  = c.id
       JOIN grupo_estado ge ON g.estado_id = ge.id
       WHERE g.instructor_id = ? AND g.deleted_at IS NULL
       ORDER BY g.created_at DESC`,
      [id]
    );

    // Registrar retroactivamente en historial con un único INSERT IGNORE por lotes
    if (filasGrupos.length > 0) {
      const conn = await pool.getConnection();
      try {
        const placeholders = filasGrupos.map(() => '(?, ?, ?)').join(', ');
        const valores = filasGrupos.flatMap(g => [id, g.grupo_id, g.fecha_asignacion]);
        await conn.execute(
          `INSERT IGNORE INTO instructor_grupo_historial (instructor_id, grupo_id, fecha_asignacion) VALUES ${placeholders}`,
          valores
        );
      } finally { conn.release(); }
    }

    res.json(filasGrupos);
  } catch (e) {
    handleError(res, e, 'historial instructor', 'Error al cargar historial');
  }
}

/**
 * Función interna: registra en el historial cuando se asigna un instructor a un grupo.
 * Llamada desde grupo.controller.js al crear/actualizar grupo con instructor.
 * @param {import('mysql2').PoolConnection} conn  Conexión activa dentro de una transacción
 */
async function registrarAsignacion(conn, instructorId, grupoId, usuarioId) {
  try {
    const [existe] = await conn.execute(
      'SELECT id FROM instructor_grupo_historial WHERE instructor_id = ? AND grupo_id = ?',
      [instructorId, grupoId]
    );
    if (!existe.length) {
      await conn.execute(
        'INSERT INTO instructor_grupo_historial (instructor_id, grupo_id, asignado_por) VALUES (?,?,?)',
        [instructorId, grupoId, usuarioId || null]
      );
    }
  } catch (e) {
    // No interrumpir la transacción principal si el historial falla
    console.warn('registrarAsignacion historial (no crítico):', e.message);
  }
}

// ── DELETE /api/instructores/:id  (soft-delete) ───────────
async function eliminar(req, res) {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [filasInstructor] = await conn.execute(
      'SELECT id, usuario_id FROM instructor WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (!filasInstructor.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Instructor no encontrado' });
    }

    const [filasGruposActivos] = await conn.execute(
      `SELECT COUNT(*) AS total FROM grupo
       WHERE instructor_id = ? AND estado_id IN (1,2) AND deleted_at IS NULL`,
      [id]
    );
    if (filasGruposActivos[0].total > 0) {
      await conn.rollback();
      return res.status(400).json({
        error: `No se puede eliminar: tiene ${filasGruposActivos[0].total} grupo(s) activo(s). Reasígnalos primero.`,
      });
    }

    const ahora = new Date();
    await conn.execute('UPDATE instructor SET deleted_at = ? WHERE id = ?', [ahora, id]);
    await conn.execute('UPDATE usuario SET activo = FALSE WHERE id = ?', [filasInstructor[0].usuario_id]);

    await conn.commit();
    res.json({ mensaje: 'Instructor eliminado correctamente' });
  } catch (e) {
    await conn.rollback();
    handleError(res, e, 'eliminar instructor', 'Error al eliminar instructor');
  } finally { conn.release(); }
}

module.exports = { listar, crear, editar, historial, eliminar, registrarAsignacion };
