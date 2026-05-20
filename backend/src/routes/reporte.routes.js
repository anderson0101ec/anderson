/**
 * Archivo: routes/reporte.routes.js
 * Responsabilidad: Rutas HTTP para reportes y exportaciones.
 * Conecta con: middleware/auth.middleware.js, controllers/reporte.controller.js
 * Lógica: Delega el procesamiento al controlador de reportes.
 */

const express = require('express');
const { autenticar } = require('../middleware/auth.middleware');
const reporteCtrl = require('../controllers/reporte.controller');

const router = express.Router();
router.use(autenticar);
router.get('/resumen',        reporteCtrl.resumen);
router.get('/exportar/excel', reporteCtrl.exportarExcel);
router.get('/exportar/pdf',   reporteCtrl.exportarPDF);

module.exports = router;
