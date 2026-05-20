/**
 * Archivo: routes/certificado.routes.js
 * Responsabilidad: Definir endpoints HTTP para certificados.
 * Conecta con: controllers/certificado.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/certificado.controller');

const router = express.Router();

router.get('/',  autenticar, ctrl.listar);
router.post('/', autenticar, soloAdmin, ctrl.crear);

module.exports = router;
