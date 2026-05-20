/**
 * Archivo: utils/formato.utils.js
 * Responsabilidad: Helpers de formato de datos (fechas, etiquetas de período).
 * Conecta con: controllers/reporte.controller.js, controllers/aspirante.controller.js.
 */

const NOMBRES_MES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Genera una etiqueta legible del período.
 * @param {string|number} anio
 * @param {string|number} mes
 * @returns {string}  Ej.: "Mayo 2025" | "Año 2025" | "Todos los períodos"
 */
function etiquetaPeriodo(anio, mes) {
  if (anio && mes) return `${NOMBRES_MES[Number(mes)]} ${anio}`;
  if (anio) return `Año ${anio}`;
  return 'Todos los períodos';
}

/**
 * Formatea una fecha para mostrar al aspirante en notificaciones de asignación.
 * @param {Date|string} fecha
 * @returns {string}  Ej.: "12 de mayo de 2025"
 */
function formatearFechaCO(fecha) {
  return new Date(fecha).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

module.exports = { etiquetaPeriodo, formatearFechaCO };
