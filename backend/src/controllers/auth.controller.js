/**
 * Archivo: controllers/auth.controller.js  v1.0.2
 * Responsabilidad: Lógica de autenticación: login, logout y refresh de tokens JWT.
 * Conecta con: config/db.js (pool), middleware/audit.middleware.js.
 * Cambios v1.0.2:
 *   - login() incluye instructor_id en la respuesta cuando el usuario es instructor.
 *     Necesario para que el frontend pueda filtrar grupos/eventos por instructor.
 */
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const { pool, CAT }          = require('../config/db');
const { registrarAuditoria } = require('../middleware/audit.middleware');

const MAX_INTENTOS_FALLIDOS = 5;
const MINUTOS_BLOQUEO       = 30;

// ── POST /api/auth/login ──────────────────────────────────
async function login(req, res) {
  const { nombre_usuario, contrasena } = req.body;
  if (!nombre_usuario || !contrasena) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const [filas] = await pool.execute(
      `SELECT u.*, r.nombre AS rol_nombre
       FROM usuario u
       JOIN rol r ON u.rol_id = r.id
       WHERE u.nombre_usuario = ? AND u.activo = 1`,
      [nombre_usuario.trim()]
    );
    if (!filas.length) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const usuario = filas[0];

    if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
      const minutosRestantes = Math.ceil((new Date(usuario.bloqueado_hasta) - new Date()) / 60000);
      return res.status(403).json({ error: `Cuenta bloqueada. Intenta en ${minutosRestantes} minutos.` });
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!contrasenaValida) {
      const intentos       = usuario.intentos_fallidos + 1;
      const bloqueadoHasta = intentos >= MAX_INTENTOS_FALLIDOS
        ? new Date(Date.now() + MINUTOS_BLOQUEO * 60000)
        : null;
      await pool.execute(
        'UPDATE usuario SET intentos_fallidos = ?, bloqueado_hasta = ? WHERE id = ?',
        [intentos, bloqueadoHasta, usuario.id]
      );
      const intentosRestantes = MAX_INTENTOS_FALLIDOS - intentos;
      return res.status(401).json({
        error: intentos >= MAX_INTENTOS_FALLIDOS
          ? `Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos.`
          : `Contraseña incorrecta. ${intentosRestantes} intento${intentosRestantes !== 1 ? 's' : ''} restante${intentosRestantes !== 1 ? 's' : ''}.`,
      });
    }

    await pool.execute(
      'UPDATE usuario SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_login = NOW() WHERE id = ?',
      [usuario.id]
    );

    // Limpieza de tokens obsoletos del usuario: revocados o ya expirados.
    // Se ejecuta en el login para evitar crecimiento indefinido de la tabla
    // sin necesidad de un proceso externo (cron). El impacto es mínimo porque
    // cada usuario suele tener pocos tokens activos.
    await pool.execute(
      'DELETE FROM refresh_tokens WHERE usuario_id = ? AND (revocado = 1 OR expira_en <= NOW())',
      [usuario.id]
    );

    const accessToken = jwt.sign(
      { id: usuario.id, rol_id: usuario.rol_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    const refreshTokenPlano = crypto.randomBytes(48).toString('hex');
    const refreshTokenHash  = crypto.createHash('sha256').update(refreshTokenPlano).digest('hex');
    const tokenExpira       = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    await pool.execute(
      'INSERT INTO refresh_tokens (usuario_id, token_hash, expira_en, ip_origen, user_agent) VALUES (?,?,?,?,?)',
      [
        usuario.id,
        refreshTokenHash,
        tokenExpira,
        req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        req.headers['user-agent']?.substring(0, 500),
      ]
    );

    await registrarAuditoria({
      tabla: 'usuario', operacion: 'LOGIN',
      registroId: usuario.id, usuarioId: usuario.id, req,
    });

    // Si es instructor, incluir su instructor_id para que el frontend pueda
    // solicitar al backend solo los grupos/eventos que le corresponden.
    let instructor_id = null;
    if (usuario.rol_id === CAT.rol.INSTRUCTOR) {
      const [[ins]] = await pool.execute(
        'SELECT id FROM instructor WHERE usuario_id = ? AND deleted_at IS NULL',
        [usuario.id]
      );
      instructor_id = ins?.id ?? null;
    }

    res.json({
      accessToken,
      refreshToken: refreshTokenPlano,
      usuario: {
        id:            usuario.id,
        nombre:        usuario.nombre_completo,
        rol:           usuario.rol_nombre,
        rol_id:        usuario.rol_id,
        instructor_id, // null para admin/superusuario
      },
    });
  } catch (e) {
    console.error('[auth.login]', e.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ── POST /api/auth/refresh ────────────────────────────────
async function refreshToken(req, res) {
  const { refreshToken: tokenRecibido } = req.body;
  if (!tokenRecibido) return res.status(400).json({ error: 'Token requerido' });

  try {
    const tokenHash = crypto.createHash('sha256').update(tokenRecibido).digest('hex');
    const [filas] = await pool.execute(
      `SELECT rt.*, u.id AS uid, u.rol_id, u.nombre_completo, u.activo
       FROM refresh_tokens rt
       JOIN usuario u ON rt.usuario_id = u.id
       WHERE rt.token_hash = ? AND rt.revocado = 0 AND rt.expira_en > NOW()`,
      [tokenHash]
    );

    if (!filas.length || !filas[0].activo) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    const registro    = filas[0];
    const accessToken = jwt.sign(
      { id: registro.uid, rol_id: registro.rol_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    res.json({ accessToken });
  } catch {
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── POST /api/auth/logout ─────────────────────────────────
async function logout(req, res) {
  const { refreshToken: tokenRecibido } = req.body;
  if (tokenRecibido) {
    const tokenHash = crypto.createHash('sha256').update(tokenRecibido).digest('hex');
    await pool.execute('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [tokenHash]);
  }
  await registrarAuditoria({
    tabla: 'usuario', operacion: 'LOGOUT',
    usuarioId: req.usuario?.id, req,
  });
  res.json({ mensaje: 'Sesión cerrada' });
}

module.exports = { login, refreshToken, logout };
