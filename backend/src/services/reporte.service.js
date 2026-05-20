/**
 * Archivo: services/reporte.service.js
 * Responsabilidad: Capa de datos para reportes — queries SQL aisladas de la capa HTTP.
 * Conecta con: config/db.js (pool), utils/db.utils.js.
 * Lógica: Funciones puras que reciben filtro+params y devuelven filas.
 *         Sin conocimiento de req/res — completamente testeables.
 */
const { pool } = require('../config/db');

/**
 * Tipos de reporte válidos.
 * Añadir un nuevo tipo aquí es el único cambio de configuración necesario.
 */
const TIPOS_VALIDOS = new Set(['aspirantes', 'solicitudes', 'grupos', 'certificados']);

function esTipoValido(tipo) {
  return TIPOS_VALIDOS.has(tipo);
}

// ── Queries por tipo ──────────────────────────────────────

async function consultarAspirantes(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT a.nombre_completo, a.tipo_documento,
            ae.nombre AS estado,
            e.nombre  AS empresa, e.nit,
            c.nombre  AS curso,
            DATE_FORMAT(a.created_at, '%d/%m/%Y') AS fecha_solicitud,
            g.nombre  AS grupo_asignado,
            a.motivo_rechazo
     FROM aspirante a
     JOIN aspirante_estado ae ON a.estado_id    = ae.id
     JOIN solicitud        s  ON a.solicitud_id = s.id
     JOIN empresa          e  ON s.empresa_id   = e.id
     JOIN curso            c  ON s.curso_id     = c.id
     LEFT JOIN inscripcion i  ON i.aspirante_id = a.id
     LEFT JOIN grupo       g  ON i.grupo_id     = g.id
     WHERE 1=1 ${filtro} ORDER BY a.created_at DESC`,
    params
  );
  return filas;
}

async function consultarSolicitudes(filtro, params) {
  // FIX: e.sector no existe en la tabla empresa — columna eliminada de la query.
  const [filas] = await pool.execute(
    `SELECT e.nombre AS empresa, e.nit, e.tipo_entidad AS sector,
            c.nombre AS curso,
            se.nombre AS estado,
            DATE_FORMAT(s.created_at, '%d/%m/%Y') AS fecha,
            COUNT(a.id) AS aspirantes
     FROM solicitud s
     JOIN empresa          e  ON s.empresa_id  = e.id
     JOIN curso            c  ON s.curso_id    = c.id
     JOIN solicitud_estado se ON s.estado_id   = se.id
     LEFT JOIN aspirante   a  ON a.solicitud_id = s.id
     WHERE s.deleted_at IS NULL ${filtro}
     GROUP BY s.id ORDER BY s.created_at DESC`,
    params
  );
  return filas;
}

async function consultarGrupos(filtro, params) {
  const [filas] = await pool.execute(
    `SELECT g.nombre AS grupo, c.nombre AS curso,
            u.nombre_completo AS instructor, ge.nombre AS estado,
            g.cupo_maximo, COUNT(i.id) AS inscritos,
            DATE_FORMAT(g.fecha_inicio, '%d/%m/%Y') AS inicio,
            DATE_FORMAT(g.fecha_fin,    '%d/%m/%Y') AS fin,
            l.nombre AS lugar
     FROM grupo g
     JOIN grupo_estado ge ON g.estado_id     = ge.id
     JOIN curso        c  ON g.curso_id      = c.id
     JOIN instructor  ins ON g.instructor_id = ins.id
     JOIN usuario      u  ON ins.usuario_id  = u.id
     LEFT JOIN inscripcion i ON i.grupo_id   = g.id
     LEFT JOIN lugar      l  ON g.lugar_id   = l.id
     WHERE g.deleted_at IS NULL ${filtro}
     GROUP BY g.id ORDER BY g.created_at DESC`,
    params
  );
  return filas;
}

async function consultarCertificados(filtro, params) {
  // FIX v1.0.2: cert.aspirante_id no existe — la relación pasa por inscripcion.
  // La tabla certificado tiene: inscripcion_id → inscripcion → aspirante_id.
  // FIX v1.0.2: cert.codigo no existe — el campo es codigo_certificado.
  const [filas] = await pool.execute(
    `SELECT cert.codigo_certificado AS codigo,
            a.nombre_completo,
            c.nombre  AS curso,
            g.nombre  AS grupo,
            DATE_FORMAT(cert.fecha_emision, '%d/%m/%Y') AS fecha_emision,
            e.nombre  AS empresa
     FROM certificado cert
     JOIN inscripcion i ON cert.inscripcion_id = i.id
     JOIN aspirante   a ON i.aspirante_id      = a.id
     JOIN grupo       g ON i.grupo_id          = g.id
     JOIN curso       c ON g.curso_id          = c.id
     JOIN solicitud   s ON a.solicitud_id      = s.id
     JOIN empresa     e ON s.empresa_id        = e.id
     WHERE 1=1 ${filtro} ORDER BY cert.fecha_emision DESC`,
    params
  );
  return filas;
}

async function consultarEstadisticasAspirantes(filtro, params) {
  const [[stats]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(estado_id=1) AS pendientes,
            SUM(estado_id=2) AS pre_aprobados, SUM(estado_id=3) AS asignados,
            SUM(estado_id=4) AS rechazados
     FROM aspirante a WHERE 1=1 ${filtro}`,
    params
  );
  return stats;
}

async function consultarEstadisticasSolicitudes(filtro, params) {
  const [[stats]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(estado_id=1) AS pendientes,
            SUM(estado_id=3) AS aprobadas, SUM(estado_id=4) AS rechazadas
     FROM solicitud s WHERE deleted_at IS NULL ${filtro}`,
    params
  );
  return stats;
}

async function consultarEstadisticasGrupos(filtro, params) {
  const [[stats]] = await pool.execute(
    `SELECT COUNT(*) AS total, SUM(estado_id=1) AS programados,
            SUM(estado_id=2) AS en_curso, SUM(estado_id=3) AS finalizados
     FROM grupo g WHERE deleted_at IS NULL ${filtro}`,
    params
  );
  return stats;
}

async function consultarTotalCertificados(filtro, params) {
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM certificado cert WHERE 1=1 ${filtro}`,
    params
  );
  return total;
}

module.exports = {
  esTipoValido,
  consultarAspirantes,
  consultarSolicitudes,
  consultarGrupos,
  consultarCertificados,
  consultarEstadisticasAspirantes,
  consultarEstadisticasSolicitudes,
  consultarEstadisticasGrupos,
  consultarTotalCertificados,
};
