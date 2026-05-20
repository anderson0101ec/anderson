/**
 * Archivo: routes/auth.routes.js
 * Responsabilidad: Rutas de autenticación (login, logout, refresh).
 * Conecta con: controllers/auth.controller.js, middleware/auth.middleware.js.
 * Lógica: Registro de endpoints de sesión sin lógica propia.
 */
// auth.routes.js
const express = require('express');
const router = express.Router();
const { login, refreshToken, logout } = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth.middleware');

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', autenticar, logout);

module.exports = router;
