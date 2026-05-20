const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/aspirante.controller');
const { autenticar, soloAdmin } = require('../middleware/auth.middleware');

router.use(autenticar);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.verUno);
router.patch('/:id/pre-aprobar',   soloAdmin, ctrl.preAprobar);
router.patch('/:id/rechazar',      soloAdmin, ctrl.rechazar);
router.patch('/:id/asignar',       soloAdmin, ctrl.asignarAGrupo);
router.patch('/:id/desasignar',    soloAdmin, ctrl.desasignarDeGrupo);
router.patch('/:id/restablecer',   soloAdmin, ctrl.restablecer);

module.exports = router;
