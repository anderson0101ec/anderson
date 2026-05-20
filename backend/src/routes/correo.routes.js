/**
 * Archivo: routes/correo.routes.js
 * Responsabilidad: Definir endpoints HTTP para envío y consulta de correos.
 * Conecta con: controllers/correo.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/correo.controller');

const router = express.Router();
router.use(autenticar, soloAdmin);

router.post('/enviar',   ctrl.enviar);
router.get('/historial', ctrl.historial);

module.exports = router;
