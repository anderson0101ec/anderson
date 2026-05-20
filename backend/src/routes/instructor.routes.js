/**
 * routes/instructor.routes.js v3
 */
const express = require('express');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/instructor.controller');

const router = express.Router();
router.use(autenticar);

router.get('/',                   ctrl.listar);
router.post('/',    soloAdmin,    ctrl.crear);
// Rutas con subrutas específicas ANTES de las genéricas /:id
router.get('/:id/historial',      ctrl.historial);
router.put('/:id',  soloAdmin,    ctrl.editar);
router.delete('/:id', soloAdmin,  ctrl.eliminar);

module.exports = router;
