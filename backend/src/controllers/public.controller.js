/**
 * Archivo: controllers/public.controller.js
 * Responsabilidad: Lógica de negocio para el formulario público sin autenticación.
 * Conecta con: config/db.js (pool, CAT), utils/crypto.utils.js, utils/upload.utils.js.
 * Lógica: Catálogos públicos (cursos, ciudades), verificación de certificados,
 *         procesamiento de solicitud con aspirantes múltiples y archivos PDF.
 */
const fs   = require('fs');
const { pool, CAT } = require('../config/db');
const { cifrar }    = require('../utils/crypto.utils');

const TIPOS_ENTIDAD_VALIDOS = ['empresa', 'grupo SENA', 'persona'];
const MAX_ASPIRANTES        = 50;

// ── GET /api/public/cursos ────────────────────────────────
async function listarCursos(req, res) {
  try {
    const [filas] = await pool.execute(
      `SELECT id, nombre, descripcion, intensidad_horaria, requerimientos_inscripcion
       FROM curso WHERE activo = 1 AND deleted_at IS NULL ORDER BY nombre`
    );
    res.json(filas);
  } catch (e) {
    console.error('listarCursos:', e.message);
    res.status(500).json({ error: 'Error al cargar cursos' });
  }
}

// ── GET /api/public/ciudades ──────────────────────────────
async function listarCiudades(req, res) {
  try {
    const [filas] = await pool.execute('SELECT id, nombre, departamento FROM ciudad ORDER BY nombre');
    res.json(filas);
  } catch (e) {
    console.error('listarCiudades:', e.message);
    res.status(500).json({ error: 'Error al cargar ciudades' });
  }
}

// ── GET /api/public/verificar-certificado/:codigo ─────────
async function verificarCertificado(req, res) {
  try {
    const [filas] = await pool.execute(
      `SELECT cert.codigo_certificado,
              DATE_FORMAT(cert.fecha_emision, '%d/%m/%Y') AS fecha_emision,
              a.nombre_completo,
              c.nombre AS curso, g.nombre AS grupo,
              DATE_FORMAT(g.fecha_inicio, '%d/%m/%Y') AS fecha_inicio,
              DATE_FORMAT(g.fecha_fin,   '%d/%m/%Y') AS fecha_fin
       FROM certificado cert
       JOIN inscripcion i ON cert.inscripcion_id = i.id
       JOIN aspirante   a ON i.aspirante_id      = a.id
       JOIN grupo       g ON i.grupo_id          = g.id
       JOIN curso       c ON g.curso_id          = c.id
       WHERE cert.codigo_certificado = ?`,
      [req.params.codigo.toUpperCase()]
    );
    if (!filas.length) {
      return res.status(404).json({ valido: false, mensaje: 'Certificado no encontrado' });
    }
    res.json({ valido: true, certificado: filas[0] });
  } catch (e) {
    console.error('verificarCertificado:', e.message);
    res.status(500).json({ error: 'Error al verificar certificado' });
  }
}

// ── Validaciones de la solicitud pública ──────────────────

/** Valida los campos del bloque empresa/entidad. */
function validarEmpresa(empresa, tipo_entidad, aspirantes) {
  if (!TIPOS_ENTIDAD_VALIDOS.includes(tipo_entidad)) return 'Tipo de registro inválido';
  if (tipo_entidad === 'persona' && aspirantes?.length !== 1) return 'Registro persona: solo 1 aspirante';
  if (!empresa?.nombre?.trim())              return 'El nombre es obligatorio';
  if (!empresa?.nombre_contacto?.trim())     return 'El nombre del solicitante es obligatorio';
  if (!empresa?.nit?.trim())                 return 'El NIT/cédula es obligatorio';
  if (!empresa?.email?.includes('@'))        return 'El correo es inválido';
  if (!empresa?.telefono?.trim())            return 'El teléfono es obligatorio';
  if (!empresa?.ciudad_id)                   return 'La ciudad es obligatoria';
  return null;
}

/** Valida un aspirante individual y la presencia de su PDF. */
function validarAspirante(aspirante, indice, pdfMap) {
  const n = indice + 1;
  if (!aspirante.nombre1?.trim())            return `Aspirante ${n}: primer nombre obligatorio`;
  if (!aspirante.apellido1?.trim())          return `Aspirante ${n}: primer apellido obligatorio`;
  if (!aspirante.numero_documento?.trim())   return `Aspirante ${n}: documento obligatorio`;
  if (!aspirante.email?.includes('@'))       return `Aspirante ${n}: correo inválido`;
  if (!aspirante.telefono?.trim())           return `Aspirante ${n}: teléfono obligatorio`;
  if (!aspirante.fecha_nacimiento)           return `Aspirante ${n}: fecha de nacimiento obligatoria`;
  if (!pdfMap[String(indice)])               return `Aspirante ${n}: el documento PDF es obligatorio`;
  if (!aspirante.contacto?.nombre?.trim())   return `Aspirante ${n}: contacto de emergencia obligatorio`;
  if (!aspirante.contacto?.telefono?.trim()) return `Aspirante ${n}: teléfono de emergencia obligatorio`;
  if (!aspirante.laboral?.nivel_academico)   return `Aspirante ${n}: nivel académico obligatorio`;
  return null;
}

/** Inserta un aspirante y sus secciones médica, contacto y laboral en la BD. */
async function insertarAspirante(conn, aspirante, indice, pdfMap, solicitudId, empresaId) {
  const archivoPdf     = pdfMap[String(indice)];
  const nombreCompleto = [
    aspirante.nombre1?.trim(), aspirante.nombre2?.trim(),
    aspirante.apellido1?.trim(), aspirante.apellido2?.trim(),
  ].filter(Boolean).join(' ');

  const [resultadoAsp] = await conn.execute(
    `INSERT INTO aspirante
       (solicitud_id, nombre1, nombre2, apellido1, apellido2, nombre_completo,
        tipo_documento, numero_documento, email, telefono, fecha_nacimiento, estado_id, documento_pdf)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      solicitudId,
      aspirante.nombre1.trim(), aspirante.nombre2?.trim() || '',
      aspirante.apellido1.trim(), aspirante.apellido2?.trim() || '',
      nombreCompleto,
      aspirante.tipo_documento || 'CC',
      cifrar(aspirante.numero_documento.trim()),
      cifrar(aspirante.email.trim()),
      cifrar(aspirante.telefono.trim()),
      aspirante.fecha_nacimiento,
      CAT.aspEstado.PENDIENTE,
      archivoPdf.filename,
    ]
  );
  const aspiranteId = resultadoAsp.insertId;

  // Sección médica
  const med = aspirante.medico || {};
  await conn.execute(
    `INSERT INTO aspirante_medico (aspirante_id, tipo_sangre, eps, arl, antecedentes, medicamentos)
     VALUES (?,?,?,?,?,?)`,
    [
      aspiranteId,
      med.tipo_sangre   || null,
      med.eps           ? cifrar(med.eps)           : null,
      med.arl           ? cifrar(med.arl)           : null,
      med.antecedentes  ? cifrar(med.antecedentes)  : null,
      med.medicamentos  ? cifrar(med.medicamentos)  : null,
    ]
  );

  // Contacto de emergencia
  const contacto = aspirante.contacto || {};
  if (contacto.nombre?.trim()) {
    await conn.execute(
      `INSERT INTO aspirante_contacto_emergencia
         (aspirante_id, nombre, telefono, telefono_emergencia2, telefono_emergencia3)
       VALUES (?,?,?,?,?)`,
      [
        aspiranteId,
        contacto.nombre.trim(),
        contacto.telefono?.trim()             || '',
        contacto.telefono_emergencia2?.trim() || null,
        contacto.telefono_emergencia3?.trim() || null,
      ]
    );
  }

  // Información laboral
  const laboral = aspirante.laboral || {};
  if (laboral.nivel_academico) {
    await conn.execute(
      `INSERT INTO aspirante_laboral
         (aspirante_id, empresa_id, nivel_academico, cargo, area_trabajo, sector, vinculacion)
       VALUES (?,?,?,?,?,?,?)`,
      [
        aspiranteId, empresaId,
        laboral.nivel_academico,
        laboral.cargo       || null,
        laboral.area_trabajo || null,
        laboral.sector      || null,
        laboral.vinculacion || null,
      ]
    );
  }
}

// ── POST /api/public/solicitud ────────────────────────────
async function crearSolicitud(req, res) {
  let parsed;
  try { parsed = JSON.parse(req.body.data || '{}'); }
  catch { return res.status(400).json({ error: 'Datos JSON inválidos' }); }

  const { empresa, curso_id, aspirantes, tipo_entidad = 'empresa' } = parsed;

  // Validar empresa y aspirantes
  const errorEmpresa = validarEmpresa(empresa, tipo_entidad, aspirantes);
  if (errorEmpresa) return res.status(400).json({ error: errorEmpresa });
  if (!curso_id)             return res.status(400).json({ error: 'Selecciona el curso' });
  if (!aspirantes?.length)   return res.status(400).json({ error: 'Debe incluir al menos un aspirante' });
  if (aspirantes.length > MAX_ASPIRANTES) return res.status(400).json({ error: `Máximo ${MAX_ASPIRANTES} aspirantes` });

  // Indexar archivos PDF por índice de aspirante
  const pdfMap = {};
  for (const archivo of (req.files || [])) {
    const coincidencia = archivo.fieldname.match(/^pdf_(\d+)$/);
    if (coincidencia) pdfMap[coincidencia[1]] = archivo;
  }

  // Validar cada aspirante
  for (let i = 0; i < aspirantes.length; i++) {
    const error = validarAspirante(aspirantes[i], i, pdfMap);
    if (error) return res.status(400).json({ error });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Upsert empresa
    let empresaId;
    const [filasEmpresa] = await conn.execute('SELECT id FROM empresa WHERE nit = ?', [empresa.nit.trim()]);
    if (filasEmpresa.length) {
      empresaId = filasEmpresa[0].id;
      await conn.execute(
        `UPDATE empresa
           SET nombre=?, email=?, telefono=?, nombre_contacto=?, cargo_contacto=?,
               ciudad_id=?, direccion=?, tipo_entidad=?
         WHERE id=?`,
        [
          empresa.nombre.trim(), empresa.email.trim(), empresa.telefono || null,
          empresa.nombre_contacto || null, empresa.cargo_contacto || null,
          Number(empresa.ciudad_id), empresa.direccion || null, tipo_entidad, empresaId,
        ]
      );
    } else {
      const [resultado] = await conn.execute(
        `INSERT INTO empresa
           (nombre, nit, email, telefono, nombre_contacto, cargo_contacto, ciudad_id, direccion, tipo_entidad)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          empresa.nombre.trim(), empresa.nit.trim(), empresa.email.trim(),
          empresa.telefono || null, empresa.nombre_contacto || null, empresa.cargo_contacto || null,
          Number(empresa.ciudad_id), empresa.direccion || null, tipo_entidad,
        ]
      );
      empresaId = resultado.insertId;
    }

    // 2. Crear solicitud
    const [resultadoSolicitud] = await conn.execute(
      'INSERT INTO solicitud (empresa_id, curso_id, num_aspirantes, estado_id) VALUES (?,?,?,?)',
      [empresaId, Number(curso_id), aspirantes.length, CAT.solEstado.PENDIENTE]
    );
    const solicitudId = resultadoSolicitud.insertId;

    // 3. Insertar aspirantes con sus secciones
    for (let i = 0; i < aspirantes.length; i++) {
      await insertarAspirante(conn, aspirantes[i], i, pdfMap, solicitudId, empresaId);
    }

    await conn.commit();
    res.status(201).json({
      mensaje: '✅ Solicitud enviada correctamente. SENA Palmira revisará los datos y notificará por correo.',
      solicitud_id: solicitudId,
      empresa: empresa.nombre.trim(),
      aspirantes: aspirantes.length,
    });
  } catch (e) {
    await conn.rollback();
    for (const archivo of (req.files || [])) {
      try { fs.unlinkSync(archivo.path); } catch {}
    }
    console.error('Error solicitud pública:', e.message);
    res.status(500).json({ error: e.message || 'Error al procesar la solicitud.' });
  } finally {
    conn.release();
  }
}

module.exports = { listarCursos, listarCiudades, verificarCertificado, crearSolicitud };
