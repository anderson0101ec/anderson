/**
 * Archivo: routes/usuario-admin.routes.js
 * Responsabilidad: Definir endpoints exclusivos del SuperUsuario para cuentas de administrador.
 * Conecta con: controllers/adminUsuario.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloSuperUsuario } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/adminUsuario.controller');

const router = express.Router();
router.use(autenticar, soloSuperUsuario);

router.get('/',                   ctrl.listar);
router.patch('/:id/activar',      ctrl.activar);
router.patch('/:id/desactivar',   ctrl.desactivar);

module.exports = router;
