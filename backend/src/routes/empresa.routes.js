/**
 * Archivo: routes/empresa.routes.js
 * Responsabilidad: Definir endpoints HTTP para empresas y lugares.
 * Conecta con: controllers/empresa.controller.js, middleware/auth.middleware.js
 *
 * Nota: el catálogo de ciudades se expone únicamente en /api/public/ciudades (sin auth)
 * para uso del formulario público. No se duplica aquí como ruta autenticada.
 */
const express = require('express');
const { autenticar } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/empresa.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',       ctrl.listar);
router.get('/lugares', ctrl.listarLugares);

module.exports = router;
