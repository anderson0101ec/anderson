/**
 * Archivo: routes/solicitud.routes.js
 * Responsabilidad: Definir endpoints HTTP para solicitudes de formación.
 * Conecta con: controllers/solicitud.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/solicitud.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',                 ctrl.listar);
router.get('/:id',              ctrl.verUno);
router.patch('/:id/estado', soloAdmin, ctrl.actualizarEstado);

module.exports = router;
