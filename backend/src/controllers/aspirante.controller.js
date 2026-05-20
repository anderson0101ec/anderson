/**
 * Archivo: controllers/aspirante.controller.js
 * Responsabilidad: Lógica de negocio para la gestión de aspirantes.
 * Conecta con: config/db.js, utils/crypto.utils.js, utils/db.utils.js,
 *              utils/formato.utils.js, services/correo.service.js, middleware/audit.middleware.js.
 * Lógica: listar, verUno, preAprobar, rechazar, asignarAGrupo con cifrado de datos personales.
 *
 * Optimizaciones v3.0:
 *  - SQL_CALC_FOUND_ROWS + FOUND_ROWS() elimina la segunda query de conteo (ya en v2).
 *  - Filtros de fecha usan rango DATE en vez de YEAR()/MONTH() para aprovechar índices (ya en v2).
 *  - NUEVO: enviarCorreoBackground() — el correo se envía en background (setImmediate).
 *    La respuesta HTTP se devuelve instantáneamente sin esperar al SMTP.
 *    Si el SMTP falla, se loguea el error pero NO bloquea ni expone al usuario el fallo.
 *    La UI recibe respuesta inmediata; el correo llega al buzón en segundo plano.
 */
const { pool, CAT }            = require('../config/db');
const { descifrar }            = require('../utils/crypto.utils');
const { enviarCorreo }         = require('../services/correo.service');
const { registrarAuditoria }   = require('../middleware/audit.middleware');
const { normalizarPaginacion, construirFiltroPeriodo } = require('../utils/db.utils');
const { formatearFechaCO }     = require('../utils/formato.utils');
const { notFoundSi, handleError } = require('../utils/response.utils');

// Mapa id de estado → etiqueta textual
const ETIQUETA_ESTADO = { 1: 'PENDIENTE', 2: 'PRE_APROBADO', 3: 'ASIGNADO', 4: 'RECHAZADO' };

// Mapa inverso: texto → id (para filtros)
const ID_ESTADO = { PENDIENTE: 1, PRE_APROBADO: 2, ASIGNADO: 3, RECHAZADO: 4 };

/**
 * Dispara enviarCorreo en background (no bloquea la respuesta HTTP).
 * Errores SMTP se loguean pero no interrumpen el flujo del usuario.
 * @param {object} payload - Mismo payload que acepta enviarCorreo()
 */
function enviarCorreoBackground(payload) {
  setImmediate(async () => {
    try {
      await enviarCorreo(payload);
    } catch (err) {
      console.error('[correo:bg] Error al enviar correo en background:', err.message);
    }
  });
}

/** Descifra los campos sensibles y agrega etiqueta de estado. */
function descifrarAspirante(fila) {
  return {
    ...fila,
    numero_documento: descifrar(fila.numero_documento) || '',
    email:            descifrar(fila.email)            || '',
    telefono:         descifrar(fila.telefono)         || '',
    estado_proceso:   ETIQUETA_ESTADO[fila.estado_id]  || String(fila.estado_id),
  };
}

/** Descifra los campos sensibles del registro médico. */
function descifrarMedico(filaMediaca) {
  if (!filaMediaca) return null;
  return {
    ...filaMediaca,
    eps:          descifrar(filaMediaca.eps)          || null,
    arl:          descifrar(filaMediaca.arl)          || null,
    antecedentes: descifrar(filaMediaca.antecedentes) || null,
    medicamentos: descifrar(filaMediaca.medicamentos) || null,
  };
}

// ── GET /api/aspirantes ──────────────────────────────────────────────────────
async function listar(req, res) {
  try {
    const { buscar = '', estado = '', curso = '', anio = '', mes = '' } = req.query;
    const { limit, offset, pagina } = normalizarPaginacion(req.query);

    const params  = [];
    const filtros = [];

    if (estado) {
      const estadoId = ID_ESTADO[estado];
      if (estadoId) { filtros.push('a.estado_id = ?'); params.push(estadoId); }
    }
    if (curso) { filtros.push('c.nombre LIKE ?'); params.push(`%${curso}%`); }

    // ✅ Rango de fechas en vez de YEAR()/MONTH() → usa índice idx_aspirante_created
    const periodo = construirFiltroPeriodo(anio, mes, 'a.created_at');
    if (periodo.filtro) {
      filtros.push(periodo.filtro);
      params.push(...periodo.params);
    }

    if (buscar) {
      filtros.push('(a.nombre_completo LIKE ? OR e.nombre LIKE ?)');
      params.push(`%${buscar}%`, `%${buscar}%`);
    }

    const clausulaWhere = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

    const fromBase = `
      FROM aspirante a
      JOIN solicitud        s  ON a.solicitud_id = s.id
      JOIN empresa          e  ON s.empresa_id   = e.id
      JOIN curso            c  ON s.curso_id     = c.id
      JOIN aspirante_estado ae ON a.estado_id    = ae.id
      ${clausulaWhere}`;

    // ✅ SQL_CALC_FOUND_ROWS: MySQL cuenta el total mientras recorre las filas
    //    Una sola query en vez de dos queries con el mismo FROM+JOIN costoso.
    const sqlListado = `
      SELECT SQL_CALC_FOUND_ROWS
             a.id, a.nombre1, a.nombre2, a.apellido1, a.apellido2, a.nombre_completo,
             a.tipo_documento, a.numero_documento, a.email, a.telefono,
             a.fecha_nacimiento, a.estado_id, a.motivo_rechazo, a.documento_pdf, a.created_at,
             ae.nombre AS estado_nombre,
             e.nombre  AS empresa, e.tipo_entidad,
             c.nombre  AS curso_requerido,
             s.id      AS solicitud_id, s.curso_id
      ${fromBase}
      ORDER BY a.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`;

    const [filas]          = await pool.query(sqlListado, params);
    const [[{ total }]]    = await pool.query('SELECT FOUND_ROWS() AS total');

    res.json({
      aspirantes: filas.map(descifrarAspirante),
      total,
      pagina,
    });
  } catch (e) {
    handleError(res, e, 'listar aspirantes', 'Error al cargar aspirantes: ' + e.message);
  }
}

// ── GET /api/aspirantes/:id ──────────────────────────────────────────────────
async function verUno(req, res) {
  try {
    const { id } = req.params;

    const [filas] = await pool.execute(
      `SELECT a.*,
              ae.nombre AS estado_nombre,
              e.nombre  AS empresa, e.email AS email_empresa, e.tipo_entidad,
              c.nombre  AS curso_nombre,
              g.nombre  AS nombre_grupo,
              i.grupo_id
       FROM aspirante a
       JOIN solicitud        s  ON a.solicitud_id = s.id
       JOIN empresa          e  ON s.empresa_id   = e.id
       JOIN curso            c  ON s.curso_id     = c.id
       JOIN aspirante_estado ae ON a.estado_id    = ae.id
       LEFT JOIN inscripcion i  ON i.aspirante_id = a.id
       LEFT JOIN grupo       g  ON i.grupo_id     = g.id
       WHERE a.id = ?`,
      [id]
    );
    if (notFoundSi(res, filas, 'Aspirante no encontrado')) return;

    const [filasMedico]   = await pool.execute(
      'SELECT * FROM aspirante_medico WHERE aspirante_id = ?', [id]
    );
    const [filasContacto] = await pool.execute(
      'SELECT * FROM aspirante_contacto_emergencia WHERE aspirante_id = ?', [id]
    );
    const [filasLaboral]  = await pool.execute(
      `SELECT al.*, emp.nombre AS empresa_nombre
       FROM aspirante_laboral al
       LEFT JOIN empresa emp ON al.empresa_id = emp.id
       WHERE al.aspirante_id = ?`,
      [id]
    );

    res.json({
      ...descifrarAspirante(filas[0]),
      medico:   descifrarMedico(filasMedico[0] || null),
      contacto: filasContacto[0] || null,
      laboral:  filasLaboral[0]  || null,
    });
  } catch (e) {
    handleError(res, e, 'verUno aspirante', 'Error al cargar aspirante');
  }
}

// ── PATCH /api/aspirantes/:id/pre-aprobar ────────────────────────────────────
async function preAprobar(req, res) {
  const { id } = req.params;
  try {
    const [filas] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filas)) return;

    const aspirante = filas[0];
    if (aspirante.estado_id !== CAT.aspEstado.PENDIENTE) {
      return res.status(400).json({ error: 'El aspirante no está en estado pendiente' });
    }

    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.PRE_APROBADO, req.usuario.id, id]
    );

    const emailDescifrado = descifrar(aspirante.email);
    const sinEmail = !emailDescifrado;

    if (emailDescifrado) {
      const [[{ empresa, curso }]] = await pool.execute(
        `SELECT e.nombre AS empresa, c.nombre AS curso
         FROM solicitud s
         JOIN empresa e ON s.empresa_id = e.id
         JOIN curso   c ON s.curso_id   = c.id
         WHERE s.id = ?`,
        [aspirante.solicitud_id]
      );
      // Correo en background — no bloquea la respuesta HTTP
      enviarCorreoBackground({
        tipo: 'APROBACION',
        destinatario: emailDescifrado,
        datos: { nombre: aspirante.nombre_completo, cursoRequerido: curso, empresa },
        usuarioId: req.usuario.id,
        aspiranteId: id,
      });
    }

    // Auditoría en background también para no bloquear la respuesta
    setImmediate(() => {
      registrarAuditoria({
        tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
        usuarioId: req.usuario.id,
        datoAntes: { estado_id: 1 }, datoDespues: { estado_id: 2 }, req,
      }).catch(err => console.error('[auditoria:bg] preAprobar:', err.message));
    });

    if (sinEmail) {
      return res.json({ mensaje: 'Aspirante pre-aprobado. El aspirante no tiene correo registrado.', correoEnviado: false, sinEmail: true });
    }
    res.json({ mensaje: 'Aspirante pre-aprobado. Se envió correo de notificación.', correoEnviado: true });
  } catch (e) {
    handleError(res, e, 'preAprobar', 'Error al pre-aprobar aspirante');
  }
}

// ── PATCH /api/aspirantes/:id/rechazar ───────────────────────────────────────
async function rechazar(req, res) {
  const { motivo } = req.body;
  const { id } = req.params;

  if (!motivo || motivo.trim().length < 10) {
    return res.status(400).json({ error: 'El motivo es obligatorio (mínimo 10 caracteres)' });
  }

  try {
    const [filas] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filas)) return;

    const motivoLimpio = motivo.trim();
    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, motivo_rechazo = ?, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.RECHAZADO, motivoLimpio, req.usuario.id, id]
    );

    const emailDescifrado = descifrar(filas[0].email);
    const sinEmail = !emailDescifrado;

    if (emailDescifrado) {
      // Correo en background
      enviarCorreoBackground({
        tipo: 'RECHAZO',
        destinatario: emailDescifrado,
        datos: { nombre: filas[0].nombre_completo, motivo: motivoLimpio },
        usuarioId: req.usuario.id,
        aspiranteId: id,
      });
    }

    setImmediate(() => {
      registrarAuditoria({
        tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
        usuarioId: req.usuario.id,
        datoDespues: { estado_id: 4, motivo_rechazo: motivo }, req,
      }).catch(err => console.error('[auditoria:bg] rechazar:', err.message));
    });

    if (sinEmail) {
      return res.json({ mensaje: 'Aspirante rechazado. El aspirante no tiene correo registrado.', correoEnviado: false, sinEmail: true });
    }
    res.json({ mensaje: 'Aspirante rechazado. Notificación enviada.', correoEnviado: true });
  } catch (e) {
    handleError(res, e, 'rechazar', 'Error al rechazar aspirante');
  }
}

// ── PATCH /api/aspirantes/:id/asignar ───────────────────────────────────────
async function asignarAGrupo(req, res) {
  const { grupo_id } = req.body;
  const { id } = req.params;

  if (!grupo_id) return res.status(400).json({ error: 'Grupo requerido' });

  try {
    const [filasAspirante] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filasAspirante)) return;

    const aspirante = filasAspirante[0];
    if (aspirante.estado_id !== CAT.aspEstado.PRE_APROBADO) {
      return res.status(400).json({ error: 'El aspirante debe estar pre-aprobado para asignar' });
    }

    const [[grupo]] = await pool.execute(
      `SELECT g.id, g.nombre, g.cupo_maximo, g.fecha_inicio, g.fecha_fin,
              g.curso_id,
              COUNT(i.id)       AS inscritos,
              l.nombre          AS lugar_nombre,
              u.nombre_completo AS instructor_nombre,
              c.nombre          AS curso_nombre,
              ev_first.hora_inicio,
              ev_first.hora_fin
       FROM grupo g
       LEFT JOIN inscripcion i   ON i.grupo_id      = g.id
       LEFT JOIN lugar       l   ON g.lugar_id      = l.id
       JOIN  instructor      ins ON g.instructor_id = ins.id
       JOIN  usuario         u   ON ins.usuario_id  = u.id
       JOIN  curso           c   ON g.curso_id      = c.id
       LEFT JOIN (
         SELECT grupo_id, hora_inicio, hora_fin
         FROM evento
         WHERE id = (SELECT MIN(id) FROM evento e2 WHERE e2.grupo_id = evento.grupo_id)
       ) ev_first ON ev_first.grupo_id = g.id
       WHERE g.id = ?
       GROUP BY g.id, g.nombre, g.cupo_maximo, g.fecha_inicio, g.fecha_fin,
                g.curso_id, l.nombre, u.nombre_completo, c.nombre,
                ev_first.hora_inicio, ev_first.hora_fin`,
      [grupo_id]
    );
    if (!grupo) return res.status(404).json({ error: 'Grupo no encontrado' });
    if (Number(grupo.inscritos) >= Number(grupo.cupo_maximo)) {
      return res.status(400).json({ error: 'El grupo ya no tiene cupos disponibles' });
    }

    // ── Validar que el curso del aspirante coincide con el curso del grupo ──
    const [[solicitud]] = await pool.execute(
      'SELECT curso_id FROM solicitud WHERE id = ?',
      [aspirante.solicitud_id]
    );
    if (solicitud && String(solicitud.curso_id) !== String(grupo.curso_id)) {
      const [[cursAsp]] = await pool.execute('SELECT nombre FROM curso WHERE id = ?', [solicitud.curso_id]);
      return res.status(400).json({
        error: `El aspirante solicitó el curso "${cursAsp?.nombre || 'desconocido'}" pero el grupo pertenece al curso "${grupo.curso_nombre}". No se puede asignar a un grupo de curso diferente.`,
      });
    }

    await pool.execute(
      'INSERT INTO inscripcion (aspirante_id, grupo_id, estado_id) VALUES (?, ?, ?)',
      [id, grupo_id, CAT.insEstado.INSCRITO]
    );
    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.ASIGNADO, req.usuario.id, id]
    );

    const emailDescifrado = descifrar(aspirante.email);
    const sinEmail = !emailDescifrado;

    if (emailDescifrado) {
      // Correo en background — la respuesta HTTP ya se envió, el correo llega en segundos
      enviarCorreoBackground({
        tipo: 'ASIGNACION',
        destinatario: emailDescifrado,
        datos: {
          nombre:      aspirante.nombre_completo,
          curso:       grupo.curso_nombre,
          grupo:       grupo.nombre,
          instructor:  grupo.instructor_nombre,
          fechaInicio: formatearFechaCO(grupo.fecha_inicio),
          fechaFin:    formatearFechaCO(grupo.fecha_fin),
          horaInicio:  grupo.hora_inicio || 'Por confirmar',
          horaFin:     grupo.hora_fin    || 'Por confirmar',
          lugar:       grupo.lugar_nombre || 'SENA Sede Palmira',
        },
        usuarioId: req.usuario.id,
        aspiranteId: id,
      });
    }

    setImmediate(() => {
      registrarAuditoria({
        tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
        usuarioId: req.usuario.id,
        datoAntes: { estado_id: CAT.aspEstado.PRE_APROBADO },
        datoDespues: { estado_id: CAT.aspEstado.ASIGNADO, grupo_id }, req,
      }).catch(err => console.error('[auditoria:bg] asignarAGrupo:', err.message));
    });

    if (sinEmail) {
      return res.json({ mensaje: 'Aspirante asignado. El aspirante no tiene correo registrado.', correoEnviado: false, sinEmail: true });
    }
    res.json({ mensaje: 'Aspirante asignado. Se envió correo con información del curso.', correoEnviado: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El aspirante ya está inscrito en este grupo' });
    }
    handleError(res, e, 'asignarAGrupo', 'Error al asignar aspirante');
  }
}

// ── PATCH /api/aspirantes/:id/desasignar ─────────────────────────────────────
async function desasignarDeGrupo(req, res) {
  const { id } = req.params;
  try {
    const [filas] = await pool.execute('SELECT * FROM aspirante WHERE id = ?', [id]);
    if (notFoundSi(res, filas, 'Aspirante no encontrado')) return;

    const aspirante = filas[0];
    if (aspirante.estado_id !== CAT.aspEstado.ASIGNADO) {
      return res.status(400).json({ error: 'El aspirante no está asignado a ningún grupo' });
    }

    // Eliminar inscripción activa
    await pool.execute('DELETE FROM inscripcion WHERE aspirante_id = ?', [id]);

    // Revertir estado a PRE_APROBADO
    await pool.execute(
      'UPDATE aspirante SET estado_id = ? WHERE id = ?',
      [CAT.aspEstado.PRE_APROBADO, id]
    );

    await registrarAuditoria({
      tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
      usuarioId: req.usuario.id,
      datoAntes: { estado_id: CAT.aspEstado.ASIGNADO },
      datoDespues: { estado_id: CAT.aspEstado.PRE_APROBADO }, req,
    });

    res.json({ mensaje: 'Aspirante desasignado del grupo correctamente.' });
  } catch (e) {
    handleError(res, e, 'desasignarDeGrupo', 'Error al desasignar aspirante');
  }
}

// ── PATCH /api/aspirantes/:id/restablecer ─────────────────
// Devuelve un aspirante RECHAZADO al estado PENDIENTE.
async function restablecer(req, res) {
  const { id } = req.params;
  try {
    const [filas] = await pool.execute(
      'SELECT id, estado_id FROM aspirante WHERE id = ?',
      [id]
    );
    if (notFoundSi(res, filas, 'Aspirante no encontrado')) return;

    const aspirante = filas[0];
    if (aspirante.estado_id !== CAT.aspEstado.RECHAZADO) {
      return res.status(400).json({ error: 'Solo se pueden restablecer aspirantes en estado RECHAZADO' });
    }

    await pool.execute(
      'UPDATE aspirante SET estado_id = ?, motivo_rechazo = NULL, decision_por = ?, decision_en = NOW() WHERE id = ?',
      [CAT.aspEstado.PENDIENTE, req.usuario.id, id]
    );

    await registrarAuditoria({
      tabla: 'aspirante', operacion: 'UPDATE', registroId: id,
      usuarioId: req.usuario.id,
      datoAntes:  { estado_id: CAT.aspEstado.RECHAZADO },
      datoDespues: { estado_id: CAT.aspEstado.PENDIENTE }, req,
    });

    res.json({ mensaje: 'Aspirante restablecido a estado PENDIENTE correctamente.' });
  } catch (e) {
    handleError(res, e, 'restablecer', 'Error al restablecer aspirante');
  }
}

module.exports = { listar, verUno, preAprobar, rechazar, asignarAGrupo, desasignarDeGrupo, restablecer };
