/**
 * Archivo: routes/grupo.routes.js
 * Responsabilidad: Definir endpoints HTTP para grupos de formación.
 * Conecta con: controllers/grupo.controller.js, middleware/auth.middleware.js
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/grupo.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',     ctrl.listar);
router.get('/:id',  ctrl.verUno);
router.post('/',    soloAdmin, ctrl.crear);
router.put('/:id',  soloAdmin, ctrl.actualizar);
router.delete('/:id', soloAdmin, ctrl.eliminar);

module.exports = router;
