/**
 * Archivo: middleware/auth.middleware.js
 * Responsabilidad: Autenticación JWT y control de acceso por rol.
 * Conecta con: config/db.js (pool, CAT), todos los routers protegidos.
 * Lógica: Verificación de token Bearer, middlewares soloAdmin y soloSuperUsuario.
 */
const jwt = require('jsonwebtoken');
const { pool, CAT } = require('../config/db');

async function autenticar(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No has iniciado sesión' });
    }
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const [rows] = await pool.execute(
      'SELECT id, nombre_completo, rol_id, activo FROM usuario WHERE id = ?',
      [payload.id]
    );
    if (!rows.length || !rows[0].activo) {
      return res.status(401).json({ error: 'Usuario inactivo o no existe' });
    }
    req.usuario = rows[0];
    next();
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario?.rol_id !== CAT.rol.ADMIN) {
    return res.status(403).json({ error: 'Solo la administradora puede realizar esta acción' });
  }
  next();
}

function soloSuperUsuario(req, res, next) {
  if (req.usuario?.rol_id !== CAT.rol.SUPERUSUARIO) {
    return res.status(403).json({ error: 'Solo el Super Usuario puede realizar esta acción' });
  }
  next();
}

module.exports = { autenticar, soloAdmin, soloSuperUsuario };
