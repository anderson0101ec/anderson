/**
 * Archivo: controllers/empresa.controller.js
 * Responsabilidad: Lógica de negocio para empresas y lugares.
 * Conecta con: config/db.js (pool), utils/response.utils.js.
 * Lógica: Listar empresas con filtro de búsqueda, catálogo de lugares.
 *
 * Nota: el catálogo de ciudades lo sirve public.controller (GET /api/public/ciudades)
 * para uso del formulario público sin autenticación.
 */
const { pool }         = require('../config/db');
const { handleError }  = require('../utils/response.utils');
const { normalizarPaginacion } = require('../utils/db.utils');

// ── GET /api/empresas ─────────────────────────────────────
async function listar(req, res) {
  try {
    const { buscar } = req.query;
    const params = [];
    let clausulaWhere = 'WHERE e.deleted_at IS NULL';

    if (buscar) {
      clausulaWhere += ' AND (e.nombre LIKE ? OR e.nit LIKE ?)';
      params.push(`%${buscar}%`, `%${buscar}%`);
    }

    const { limit, offset, pagina } = normalizarPaginacion(req.query);

    const sqlListado = `
      SELECT SQL_CALC_FOUND_ROWS
             e.id, e.nombre, e.nit, e.email, e.telefono, e.direccion,
             e.nombre_contacto, e.cargo_contacto, e.activo, e.tipo_entidad,
             ci.nombre AS ciudad, ci.departamento,
             COUNT(DISTINCT s.id) AS total_solicitudes,
             COUNT(DISTINCT a.id) AS total_aspirantes
      FROM empresa e
      LEFT JOIN ciudad    ci ON e.ciudad_id    = ci.id
      LEFT JOIN solicitud s  ON s.empresa_id   = e.id
      LEFT JOIN aspirante a  ON a.solicitud_id = s.id
      ${clausulaWhere}
      GROUP BY e.id ORDER BY e.nombre
      LIMIT ${limit} OFFSET ${offset}`;

    const [filas]       = await pool.query(sqlListado, params);
    const [[{ total }]] = await pool.query('SELECT FOUND_ROWS() AS total');

    res.json({ empresas: filas, total, pagina });
  } catch (e) {
    handleError(res, e, 'listar empresas', 'Error al cargar empresas');
  }
}

// ── GET /api/empresas/lugares ─────────────────────────────
async function listarLugares(req, res) {
  try {
    const [filas] = await pool.execute('SELECT * FROM lugar WHERE activo = 1 ORDER BY nombre');
    res.json(filas);
  } catch (e) {
    handleError(res, e, 'listarLugares', 'Error al cargar lugares');
  }
}

module.exports = { listar, listarLugares };
