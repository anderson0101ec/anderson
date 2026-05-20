/**
 * Archivo: controllers/reporte.controller.js  v1.0.2
 * Responsabilidad: Capa HTTP para reportes — valida parámetros, orquesta servicios,
 *                  construye documentos PDF/Excel y envía la respuesta.
 * Conecta con: services/reporte.service.js, utils/db.utils.js, utils/formato.utils.js,
 *              pdfkit, xlsx.
 * Cambios v1.0.2:
 *   - Extraída la lógica de datos a reporte.service.js (separación de capas).
 *   - Validación explícita de parámetros con respuestas 400 descriptivas.
 *   - Corregida consultarCertificados: usaba cert.aspirante_id (no existe)
 *     y cert.codigo (la columna es codigo_certificado).
 *   - Corregida consultarSolicitudes: usaba e.sector (no existe en empresa).
 *   - Logging estructurado con contexto claro.
 */
const PDFDocument = require('pdfkit');
const XLSX        = require('xlsx-js-style');

const { construirFiltroPeriodo } = require('../utils/db.utils');
const { etiquetaPeriodo }        = require('../utils/formato.utils');
const ReporteData                = require('../services/reporte.service');
const { pool }                   = require('../config/db');

// ── Constantes de estilo PDF ──────────────────────────────
const COLOR = {
  brand:  '#FF6719',
  dark:   '#1a1a1a',
  gray:   '#666666',
  light:  '#f5f5f5',
  border: '#e0e0e0',
};

// ── Validación de parámetros de entrada ───────────────────

/**
 * Valida y normaliza los query params comunes de exportación.
 * @returns {{ ok: true, anio, mes, tipo } | { ok: false, mensaje: string }}
 */
function validarParamsExport(query) {
  const { anio, mes, tipo = 'aspirantes' } = query;

  if (!ReporteData.esTipoValido(tipo)) {
    return {
      ok: false,
      mensaje: `Tipo "${tipo}" no reconocido. Valores válidos: aspirantes, solicitudes, grupos, certificados.`,
    };
  }

  if (anio !== undefined) {
    const anioNum = Number(anio);
    if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
      return { ok: false, mensaje: `Parámetro "anio" inválido: ${anio}` };
    }
  }

  if (mes !== undefined) {
    const mesNum = Number(mes);
    if (!Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return { ok: false, mensaje: `Parámetro "mes" inválido: ${mes}. Debe ser un número entre 1 y 12.` };
    }
    if (!anio) {
      return { ok: false, mensaje: 'Se requiere "anio" cuando se especifica "mes".' };
    }
  }

  return { ok: true, anio, mes, tipo };
}

// ── Helpers PDF ───────────────────────────────────────────

function pdfHeader(doc, titulo, subtitulo) {
  doc.rect(0, 0, doc.page.width, 80).fill(COLOR.brand);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
     .text('MAYZER', 50, 18, { continued: true })
     .fontSize(11).font('Helvetica')
     .text('  ·  Sistema de Gestión SENA Palmira', { baseline: 'middle' });
  doc.fontSize(11).font('Helvetica-Bold').text(titulo, 50, 45);
  doc.fontSize(9).font('Helvetica').text(subtitulo, 50, 60);
  doc.fillColor(COLOR.dark);
  doc.y = 100;
}

function pdfSectionTitle(doc, texto) {
  doc.moveDown(0.5);
  doc.rect(50, doc.y, doc.page.width - 100, 22).fill(COLOR.brand);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
     .text(texto, 58, doc.y - 16);
  doc.fillColor(COLOR.dark);
  doc.y += 8;
}

function pdfTableRow(doc, cols, widths, isHeader = false, yPos = null) {
  const y    = yPos !== null ? yPos : doc.y;
  const x0   = 50;
  const rowH = 18;
  const totalAncho = widths.reduce((a, b) => a + b, 0);

  if (isHeader) {
    doc.rect(x0, y, totalAncho, rowH).fill('#f0f0f0');
  } else if (doc._rowIndex % 2 === 0) {
    doc.rect(x0, y, totalAncho, rowH).fill('#fafafa');
  }

  let x = x0;
  cols.forEach((col, i) => {
    doc.rect(x, y, widths[i], rowH).stroke(COLOR.border);
    doc.fillColor(isHeader ? COLOR.dark : COLOR.gray)
       .fontSize(isHeader ? 8.5 : 8)
       .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
       .text(String(col ?? '—'), x + 4, y + 5, { width: widths[i] - 8, ellipsis: true });
    x += widths[i];
  });

  doc._rowIndex = (doc._rowIndex || 0) + 1;
  doc.y = y + rowH;
}

function pdfCheckPageBreak(doc) {
  if (doc.y > doc.page.height - 100) {
    doc.addPage();
    doc.y = 60;
    doc._rowIndex = 0;
  }
}

function pdfStatBox(doc, label, valor, x, y, w = 110) {
  doc.rect(x, y, w, 52).fill(COLOR.light).stroke(COLOR.border);
  doc.fillColor(COLOR.brand).fontSize(22).font('Helvetica-Bold')
     .text(String(valor ?? 0), x + 6, y + 8, { width: w - 12, align: 'center' });
  doc.fillColor(COLOR.gray).fontSize(8).font('Helvetica')
     .text(label, x + 4, y + 36, { width: w - 8, align: 'center' });
}

function pdfFooter(doc, anio, mes) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(pages.start + i);
    doc.fillColor('#aaa').fontSize(8).font('Helvetica')
       .text(
         `Mayzer – SENA Sede Palmira · Período: ${etiquetaPeriodo(anio, mes)} · Pág. ${i + 1} / ${pages.count}`,
         50, doc.page.height - 35,
         { align: 'center', width: doc.page.width - 100 }
       );
  }
}

// ── Helpers Excel — Identidad Visual Mayzer ───────────────

const M = {
  NARANJA:      'FF6719',
  NARANJA_OSC:  'CC5214',
  NARANJA_CLR:  'FFF3EC',
  NARANJA_MID:  'FFE4CC',
  BLANCO:       'FFFFFF',
  GRIS_TEXTO:   '1E1E1E',
  GRIS_SEC:     '555555',
  GRIS_META:    '888888',
  GRIS_HEADER:  'F2F2F2',
  GRIS_BORDE:   'D0D0D0',
  GRIS_BORDE_L: 'EBEBEB',
  VERDE:        '059669',
  ROJO:         'DC2626',
};

const _borde = (c) => ({
  top:    { style: 'thin', color: { rgb: c } },
  bottom: { style: 'thin', color: { rgb: c } },
  left:   { style: 'thin', color: { rgb: c } },
  right:  { style: 'thin', color: { rgb: c } },
});

const ESTILO_ENCABEZADO = {
  fill:      { fgColor: { rgb: M.NARANJA } },
  font:      { bold: true, color: { rgb: M.BLANCO }, sz: 9.5, name: 'Calibri' },
  border:    _borde(M.NARANJA_OSC),
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

const ESTILO_CELDA = {
  font:      { sz: 9, color: { rgb: M.GRIS_TEXTO }, name: 'Calibri' },
  border:    _borde(M.GRIS_BORDE_L),
  alignment: { vertical: 'center' },
};

const ESTILO_CELDA_ALTERNA = {
  ...ESTILO_CELDA,
  fill: { fgColor: { rgb: M.NARANJA_CLR } },
};

const ESTILO_CELDA_NUMERO = {
  ...ESTILO_CELDA,
  alignment: { horizontal: 'right', vertical: 'center' },
};

const ESTILO_CELDA_NUMERO_ALTERNA = {
  ...ESTILO_CELDA_ALTERNA,
  alignment: { horizontal: 'right', vertical: 'center' },
};

function construirLibroExcel(encabezados, filas, anchosColumna, tipo, anio, mes) {
  const wb = XLSX.utils.book_new();

  const ahora = new Date().toLocaleString('es-CO', {
    timeZone: 'America/Bogota', day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit',
  });

  const titulo = [{ v: 'MAYZER · Trabajo Seguro en Alturas — SENA Palmira', t: 's', s: {
    font: { bold: true, sz: 15, color: { rgb: M.NARANJA }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  }}];

  const reporte = [{ v: `Reporte de ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}  ·  Período: ${etiquetaPeriodo(anio, mes)}`, t: 's', s: {
    font: { bold: true, sz: 10, color: { rgb: M.GRIS_TEXTO }, name: 'Calibri' },
    alignment: { horizontal: 'left', vertical: 'center' },
  }}];

  const meta = [{ v: `Generado: ${ahora}  ·  ${filas.length} registro${filas.length !== 1 ? 's' : ''}`, t: 's', s: {
    font: { sz: 8.5, color: { rgb: M.GRIS_META }, name: 'Calibri', italic: true },
    alignment: { horizontal: 'left', vertical: 'center' },
  }}];

  const vacio = [{ v: '', t: 's' }];

  const aoa = [
    titulo,
    reporte,
    meta,
    vacio,
    encabezados.map(h => ({ v: h, t: 's', s: ESTILO_ENCABEZADO })),
  ];

  filas.forEach((fila, ri) => {
    aoa.push(fila.map(v => {
      const esNum = typeof v === 'number';
      const alterna = ri % 2 === 1;
      let s;
      if (esNum)   s = alterna ? ESTILO_CELDA_NUMERO_ALTERNA : ESTILO_CELDA_NUMERO;
      else         s = alterna ? ESTILO_CELDA_ALTERNA         : ESTILO_CELDA;
      return { v: v ?? '', t: esNum ? 'n' : 's', s };
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = anchosColumna.map(w => ({ wch: w }));
  ws['!rows'] = [{ hpt: 24 }, { hpt: 16 }, { hpt: 14 }, { hpt: 6 }, { hpt: 22 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: encabezados.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: encabezados.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: encabezados.length - 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws, tipo.charAt(0).toUpperCase() + tipo.slice(1));
  return wb;
}

// ── Mapa de configuración por tipo ────────────────────────
// Centraliza encabezados, anchos y proyección de filas.
// Extender con un nuevo tipo = añadir una entrada aquí.

function obtenerConfigExcel(tipo, filas) {
  switch (tipo) {
    case 'aspirantes':
      return {
        encabezados: ['Nombre Completo', 'Tipo Doc.', 'Estado', 'Empresa', 'NIT',
                      'Curso Solicitado', 'Fecha Registro', 'Grupo Asignado', 'Motivo Rechazo'],
        datos:  filas.map(r => [r.nombre_completo, r.tipo_documento, r.estado,
                                r.empresa, r.nit, r.curso, r.fecha_solicitud,
                                r.grupo_asignado || '—', r.motivo_rechazo || '—']),
        anchos: [28, 10, 14, 22, 14, 22, 14, 20, 25],
      };
    case 'solicitudes':
      return {
        encabezados: ['Empresa', 'NIT', 'Tipo Entidad', 'Curso Solicitado', 'Estado', 'Fecha', 'N° Aspirantes'],
        datos:  filas.map(r => [r.empresa, r.nit, r.sector || '—', r.curso,
                                r.estado, r.fecha, Number(r.aspirantes)]),
        anchos: [26, 14, 16, 24, 14, 12, 14],
      };
    case 'grupos':
      return {
        encabezados: ['Grupo', 'Curso', 'Instructor', 'Estado', 'Cupo Máx.', 'Inscritos', 'Inicio', 'Fin', 'Lugar'],
        datos:  filas.map(r => [r.grupo, r.curso, r.instructor, r.estado,
                                Number(r.cupo_maximo), Number(r.inscritos),
                                r.inicio, r.fin, r.lugar || '—']),
        anchos: [24, 22, 22, 14, 10, 10, 12, 12, 18],
      };
    case 'certificados':
      return {
        encabezados: ['Código Certificado', 'Aspirante', 'Curso', 'Grupo', 'Fecha Emisión', 'Empresa'],
        datos:  filas.map(r => [r.codigo, r.nombre_completo, r.curso, r.grupo, r.fecha_emision, r.empresa]),
        anchos: [20, 28, 22, 22, 14, 22],
      };
    default:
      return null;
  }
}

// ── GET /api/reportes/resumen ─────────────────────────────
async function resumen(req, res) {
  const { anio, mes } = req.query;
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');
  const fCert = construirFiltroPeriodo(anio, mes, 'cert.created_at');

  try {
    const [[sol]]  = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(s.estado_id=1) AS pendientes, SUM(s.estado_id=2) AS en_revision,
              SUM(s.estado_id=3) AS aprobadas, SUM(s.estado_id=4) AS rechazadas
       FROM solicitud s WHERE s.deleted_at IS NULL ${fSol.filtro}`,
      fSol.params
    );
    const [[asp]]  = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(a.estado_id=1) AS pendientes, SUM(a.estado_id=2) AS pre_aprobados,
              SUM(a.estado_id=3) AS asignados, SUM(a.estado_id=4) AS rechazados
       FROM aspirante a WHERE 1=1 ${fAsp.filtro}`,
      fAsp.params
    );
    const [[grp]]  = await pool.execute(
      `SELECT COUNT(*) AS total, SUM(g.estado_id=1) AS programados,
              SUM(g.estado_id=2) AS en_curso, SUM(g.estado_id=3) AS finalizados
       FROM grupo g WHERE g.deleted_at IS NULL ${fGrp.filtro}`,
      fGrp.params
    );
    const [[cert]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM certificado cert WHERE 1=1 ${fCert.filtro}`,
      fCert.params
    );
    const [cursos] = await pool.execute(
      `SELECT c.nombre AS curso_requerido, COUNT(a.id) AS total
       FROM aspirante a
       JOIN solicitud s ON a.solicitud_id = s.id
       JOIN curso     c ON s.curso_id     = c.id
       WHERE 1=1 ${fAsp.filtro}
       GROUP BY c.id ORDER BY total DESC LIMIT 5`,
      fAsp.params
    );
    const [empresas] = await pool.execute(
      `SELECT e.nombre, e.nit, COUNT(a.id) AS aspirantes
       FROM empresa    e
       JOIN solicitud  s ON s.empresa_id    = e.id
       JOIN aspirante  a ON a.solicitud_id  = s.id
       WHERE 1=1 ${fAsp.filtro}
       GROUP BY e.id ORDER BY aspirantes DESC LIMIT 8`,
      fAsp.params
    );

    res.json({
      solicitudes: sol, aspirantes: asp, grupos: grp, certificados: cert,
      cursosPopulares: cursos, empresasTop: empresas,
      periodo: { anio: anio || 'Todos', mes: mes || 'Todos' },
    });
  } catch (e) {
    console.error('[reporte.resumen]', e.message);
    res.status(500).json({ error: 'Error al generar resumen' });
  }
}

// ── GET /api/reportes/exportar/excel ─────────────────────
async function exportarExcel(req, res) {
  const validacion = validarParamsExport(req.query);
  if (!validacion.ok) {
    return res.status(400).json({ error: validacion.mensaje });
  }
  const { anio, mes, tipo } = validacion;

  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');
  const fCert = construirFiltroPeriodo(anio, mes, 'cert.fecha_emision');

  const consultasPorTipo = {
    aspirantes:   () => ReporteData.consultarAspirantes(fAsp.filtro, fAsp.params),
    solicitudes:  () => ReporteData.consultarSolicitudes(fSol.filtro, fSol.params),
    grupos:       () => ReporteData.consultarGrupos(fGrp.filtro, fGrp.params),
    certificados: () => ReporteData.consultarCertificados(fCert.filtro, fCert.params),
  };

  try {
    const filas  = await consultasPorTipo[tipo]();
    const config = obtenerConfigExcel(tipo, filas);

    const wb     = construirLibroExcel(config.encabezados, config.datos, config.anchos, tipo, anio, mes);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false });

    const periodo = anio ? (mes ? `${String(mes).padStart(2, '0')}-${anio}` : anio) : 'completo';
    const nombre  = `Mayzer_${tipo}_${periodo}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (e) {
    console.error(`[reporte.exportarExcel tipo=${tipo}]`, e.message);
    res.status(500).json({ error: 'Error al exportar Excel. Contacta al administrador.' });
  }
}

// ── GET /api/reportes/exportar/pdf ───────────────────────
async function exportarPDF(req, res) {
  const validacion = validarParamsExport(req.query);
  if (!validacion.ok) {
    return res.status(400).json({ error: validacion.mensaje });
  }
  const { anio, mes, tipo } = validacion;

  const fAsp  = construirFiltroPeriodo(anio, mes, 'a.created_at');
  const fSol  = construirFiltroPeriodo(anio, mes, 's.created_at');
  const fGrp  = construirFiltroPeriodo(anio, mes, 'g.fecha_inicio');
  const fCert = construirFiltroPeriodo(anio, mes, 'cert.fecha_emision');
  const periodo = etiquetaPeriodo(anio, mes);

  try {
    const doc    = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const nombre = `Mayzer_${tipo}_${anio || 'general'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    doc.pipe(res);
    doc._rowIndex = 0;

    if (tipo === 'aspirantes') {
      const [filas, stats] = await Promise.all([
        ReporteData.consultarAspirantes(fAsp.filtro, fAsp.params),
        ReporteData.consultarEstadisticasAspirantes(fAsp.filtro, fAsp.params),
      ]);
      pdfHeader(doc, 'Reporte de Aspirantes', `Período: ${periodo} · ${filas.length} registros`);
      pdfStatBox(doc, 'Total',         stats.total,          50,  doc.y);
      pdfStatBox(doc, 'Pendientes',    stats.pendientes,     170,  doc.y);
      pdfStatBox(doc, 'Pre-aprobados', stats.pre_aprobados,  290,  doc.y);
      pdfStatBox(doc, 'Asignados',     stats.asignados,      410,  doc.y);
      doc.y += 64;
      pdfSectionTitle(doc, 'Listado de Aspirantes');
      const cols   = ['Nombre Completo', 'Doc.', 'Estado', 'Empresa', 'Curso', 'Fecha', 'Grupo'];
      const widths = [120, 40, 65, 90, 80, 55, 45];
      pdfTableRow(doc, cols, widths, true);
      for (const r of filas) {
        pdfCheckPageBreak(doc);
        pdfTableRow(doc, [r.nombre_completo, r.tipo_documento, r.estado,
                          r.empresa, r.curso, r.fecha_solicitud, r.grupo_asignado || '—'], widths);
      }

    } else if (tipo === 'solicitudes') {
      const [filas, stats] = await Promise.all([
        ReporteData.consultarSolicitudes(fSol.filtro, fSol.params),
        ReporteData.consultarEstadisticasSolicitudes(fSol.filtro, fSol.params),
      ]);
      pdfHeader(doc, 'Reporte de Solicitudes', `Período: ${periodo} · ${filas.length} registros`);
      pdfStatBox(doc, 'Total',      stats.total,      50,  doc.y);
      pdfStatBox(doc, 'Pendientes', stats.pendientes, 170,  doc.y);
      pdfStatBox(doc, 'Aprobadas',  stats.aprobadas,  290,  doc.y);
      pdfStatBox(doc, 'Rechazadas', stats.rechazadas, 410,  doc.y);
      doc.y += 64;
      pdfSectionTitle(doc, 'Listado de Solicitudes');
      const cols   = ['Empresa', 'NIT', 'Curso Solicitado', 'Estado', 'Fecha', 'Aspirantes'];
      const widths = [120, 70, 130, 70, 60, 45];
      pdfTableRow(doc, cols, widths, true);
      for (const r of filas) {
        pdfCheckPageBreak(doc);
        pdfTableRow(doc, [r.empresa, r.nit, r.curso, r.estado, r.fecha, Number(r.aspirantes)], widths);
      }

    } else if (tipo === 'grupos') {
      const [filas, stats] = await Promise.all([
        ReporteData.consultarGrupos(fGrp.filtro, fGrp.params),
        ReporteData.consultarEstadisticasGrupos(fGrp.filtro, fGrp.params),
      ]);
      pdfHeader(doc, 'Reporte de Grupos de Formación', `Período: ${periodo} · ${filas.length} grupos`);
      pdfStatBox(doc, 'Total',       stats.total,       50,  doc.y);
      pdfStatBox(doc, 'Programados', stats.programados, 170,  doc.y);
      pdfStatBox(doc, 'En Curso',    stats.en_curso,    290,  doc.y);
      pdfStatBox(doc, 'Finalizados', stats.finalizados, 410,  doc.y);
      doc.y += 64;
      pdfSectionTitle(doc, 'Listado de Grupos');
      const cols   = ['Grupo', 'Curso', 'Instructor', 'Estado', 'Cupo', 'Inscritos', 'Inicio', 'Fin'];
      const widths = [90, 90, 95, 60, 35, 45, 55, 55];
      pdfTableRow(doc, cols, widths, true);
      for (const r of filas) {
        pdfCheckPageBreak(doc);
        pdfTableRow(doc, [r.grupo, r.curso, r.instructor, r.estado,
                          r.cupo_maximo, Number(r.inscritos), r.inicio, r.fin], widths);
      }

    } else if (tipo === 'certificados') {
      const [filas, total] = await Promise.all([
        ReporteData.consultarCertificados(fCert.filtro, fCert.params),
        ReporteData.consultarTotalCertificados(fCert.filtro, fCert.params),
      ]);
      pdfHeader(doc, 'Reporte de Certificados', `Período: ${periodo} · ${total} certificados emitidos`);
      pdfStatBox(doc, 'Total emitidos', total, 50, doc.y, 160);
      doc.y += 64;
      pdfSectionTitle(doc, 'Certificados Emitidos');
      const cols   = ['Código', 'Aspirante', 'Curso', 'Grupo', 'Fecha', 'Empresa'];
      const widths = [70, 120, 90, 80, 55, 80];
      pdfTableRow(doc, cols, widths, true);
      for (const r of filas) {
        pdfCheckPageBreak(doc);
        pdfTableRow(doc, [r.codigo, r.nombre_completo, r.curso, r.grupo, r.fecha_emision, r.empresa], widths);
      }
    }

    pdfFooter(doc, anio, mes);
    doc.end();
  } catch (e) {
    console.error(`[reporte.exportarPDF tipo=${tipo}]`, e.message);
    if (!res.headersSent) res.status(500).json({ error: 'Error al generar PDF.' });
  }
}

module.exports = { resumen, exportarExcel, exportarPDF };
