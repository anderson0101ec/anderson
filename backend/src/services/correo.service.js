/**
 * Archivo: services/correo.service.js
 * Responsabilidad: Envío de correos electrónicos transaccionales con Nodemailer.
 * Conecta con: controllers/aspirante.controller.js, routes/correo.routes.js.
 * Lógica: Plantillas HTML por tipo (APROBACION, RECHAZO, ASIGNACION), log en BD.
 */
const nodemailer = require('nodemailer');
const { pool, CAT } = require('../config/db');

// ── Transporter SMTP (lazy — se crea cuando se usa por primera vez) ──────────
// Se crea de forma diferida para asegurar que las variables de entorno ya
// estén cargadas, y para poder re-intentar si faltan credenciales al inicio.
let _transporter = null;

function getTransporter() {
  if (!_transporter) {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.warn('[correo] ⚠️  MAIL_USER / MAIL_PASS no configurados en .env');
    }
    _transporter = nodemailer.createTransport({
      host:   process.env.MAIL_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.MAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    // Verificar conexión en background (no bloquea el arranque)
    _transporter.verify().then(() => {
      console.log('[correo] ✅ Conexión SMTP verificada correctamente');
    }).catch(err => {
      console.error('[correo] ❌ Error de conexión SMTP:', err.message);
      // Resetear para reintentar en el próximo envío
      _transporter = null;
    });
  }
  return _transporter;
}

// ── Logo SENA SVG inline (base64 compatible con clientes de correo) ──────────
const LOGO_SVG = `
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 8px auto;">
  <tr>
    <td style="background:#FF6719;border-radius:50%;width:56px;height:56px;text-align:center;vertical-align:middle;">
      <span style="color:#ffffff;font-size:22px;font-weight:900;font-family:Arial,sans-serif;letter-spacing:-1px;">M</span>
    </td>
  </tr>
</table>`;

// ── Wrapper HTML base ────────────────────────────────────────────────────────
function wrapHTML(contenido, colorAcento = '#FF6719') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MAYZER SENA</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

          <!-- ENCABEZADO -->
          <tr>
            <td style="background:linear-gradient(135deg,#FF6719 0%,#e05500 100%);padding:36px 40px 28px 40px;text-align:center;">
              ${LOGO_SVG}
              <h1 style="margin:0 0 4px 0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:3px;font-family:Arial,sans-serif;">MAYZER</h1>
              <p style="margin:0;color:rgba(255,255,255,0.88);font-size:13px;font-family:Arial,sans-serif;">Sistema de Gestión de Formación Complementaria</p>
              <p style="margin:6px 0 0 0;color:rgba(255,255,255,0.75);font-size:12px;font-family:Arial,sans-serif;">SENA &bull; Sede Palmira</p>
            </td>
          </tr>

          <!-- CONTENIDO -->
          <tr>
            <td style="padding:36px 40px 28px 40px;">
              ${contenido}
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #eeeeee;margin:0;">
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 40px 28px 40px;text-align:center;background-color:#fafafa;">
              <p style="margin:0 0 4px 0;color:#999999;font-size:12px;font-family:Arial,sans-serif;">
                ${process.env.SENA_NOMBRE || 'SENA Sede Palmira'} &bull; ${process.env.SENA_DIRECCION || 'Palmira, Valle del Cauca'}
              </p>
              <p style="margin:0;color:#bbbbbb;font-size:11px;font-family:Arial,sans-serif;">
                Este correo es generado automáticamente por el sistema MAYZER. Por favor no responda este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Componente de caja de datos ──────────────────────────────────────────────
function cajaInfo(filas) {
  const filasHTML = filas.map(({ label, valor }) =>
    `<tr>
      <td style="padding:8px 16px;color:#888888;font-size:13px;font-family:Arial,sans-serif;white-space:nowrap;vertical-align:top;width:40%;">${label}</td>
      <td style="padding:8px 16px 8px 0;color:#333333;font-size:13px;font-family:Arial,sans-serif;font-weight:700;vertical-align:top;">${valor}</td>
    </tr>`
  ).join('');

  return `
  <table cellpadding="0" cellspacing="0" border="0" width="100%"
    style="background-color:#fff8f4;border:1px solid #ffd4bc;border-radius:8px;margin:20px 0;overflow:hidden;">
    ${filasHTML}
  </table>`;
}

// ── Plantillas ───────────────────────────────────────────────────────────────
const plantillas = {

  APROBACION: d => wrapHTML(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#e8f5e9;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">✅</div>
    </div>
    <h2 style="margin:0 0 8px 0;color:#2e7d32;font-size:20px;font-family:Arial,sans-serif;text-align:center;">¡Ha sido pre-aprobado/a!</h2>
    <p style="margin:0 0 20px 0;color:#666666;font-size:13px;font-family:Arial,sans-serif;text-align:center;">Su solicitud de formación ha sido revisada exitosamente.</p>

    <p style="margin:0 0 8px 0;color:#333333;font-size:14px;font-family:Arial,sans-serif;">Estimado/a <strong>${d.nombre}</strong>,</p>
    <p style="margin:0 0 16px 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
      Nos complace informarle que su solicitud de formación complementaria ha sido <strong style="color:#2e7d32;">pre-aprobada</strong> por el equipo del SENA sede Palmira.
    </p>

    ${cajaInfo([
      { label: 'Curso solicitado', valor: d.cursoRequerido },
      { label: 'Empresa',         valor: d.empresa },
    ])}

    <p style="margin:16px 0 0 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
      En breve recibirá un nuevo correo con los detalles del grupo asignado, horarios e información sobre el inicio de la formación.
    </p>
    <p style="margin:20px 0 0 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;">Cordialmente,<br><strong>Maira &ndash; Administradora SENA Palmira</strong></p>
  `),

  RECHAZO: d => wrapHTML(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#fce8e8;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">❌</div>
    </div>
    <h2 style="margin:0 0 8px 0;color:#c62828;font-size:20px;font-family:Arial,sans-serif;text-align:center;">Solicitud no aprobada</h2>
    <p style="margin:0 0 20px 0;color:#666666;font-size:13px;font-family:Arial,sans-serif;text-align:center;">Le informamos el resultado de la revisión de su solicitud.</p>

    <p style="margin:0 0 8px 0;color:#333333;font-size:14px;font-family:Arial,sans-serif;">Estimado/a <strong>${d.nombre}</strong>,</p>
    <p style="margin:0 0 16px 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
      Lamentamos informarle que su solicitud de formación complementaria no ha podido ser aprobada en esta oportunidad.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%"
      style="background-color:#fff4f4;border:1px solid #ffcdd2;border-left:4px solid #c62828;border-radius:8px;margin:20px 0;overflow:hidden;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px 0;color:#c62828;font-size:12px;font-family:Arial,sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Motivo de no aprobación</p>
          <p style="margin:0;color:#333333;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">${d.motivo}</p>
        </td>
      </tr>
    </table>

    <p style="margin:16px 0 0 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
      Si desea mayor información o considera que existe un error, puede comunicarse directamente con nuestra oficina en la SENA sede Palmira.
    </p>
    <p style="margin:20px 0 0 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;">Cordialmente,<br><strong>Maira &ndash; Administradora SENA Palmira</strong></p>
  `),

  ASIGNACION: d => wrapHTML(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#e8f0fe;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;">📚</div>
    </div>
    <h2 style="margin:0 0 8px 0;color:#1565c0;font-size:20px;font-family:Arial,sans-serif;text-align:center;">¡Ha sido asignado/a a un curso!</h2>
    <p style="margin:0 0 20px 0;color:#666666;font-size:13px;font-family:Arial,sans-serif;text-align:center;">Su proceso de formación complementaria está listo para iniciar.</p>

    <p style="margin:0 0 8px 0;color:#333333;font-size:14px;font-family:Arial,sans-serif;">Estimado/a <strong>${d.nombre}</strong>,</p>
    <p style="margin:0 0 16px 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;line-height:1.6;">
      Ha sido asignado/a satisfactoriamente a un grupo de formación complementaria. A continuación encontrará los detalles de su curso:
    </p>

    ${cajaInfo([
      { label: 'Curso',       valor: d.curso },
      { label: 'Grupo',       valor: d.grupo },
      { label: 'Instructor',  valor: d.instructor },
      { label: 'Fecha inicio',valor: d.fechaInicio },
      { label: 'Fecha fin',   valor: d.fechaFin },
      { label: 'Horario',     valor: `${d.horaInicio} &ndash; ${d.horaFin}` },
      { label: 'Lugar',       valor: d.lugar },
    ])}

    <table cellpadding="0" cellspacing="0" border="0" width="100%"
      style="background-color:#e8f0fe;border:1px solid #bbdefb;border-radius:8px;margin:16px 0;">
      <tr>
        <td style="padding:14px 18px;">
          <p style="margin:0;color:#1565c0;font-size:13px;font-family:Arial,sans-serif;line-height:1.6;">
            <strong>Recuerde:</strong> Preséntese el primer día con su documento de identidad original y la documentación requerida. La puntualidad es fundamental.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:16px 0 0 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;">Cordialmente,<br><strong>Maira &ndash; Administradora SENA Palmira</strong></p>
  `),

  GENERAL: d => wrapHTML(`
    <h2 style="margin:0 0 16px 0;color:#333333;font-size:20px;font-family:Arial,sans-serif;">${d.titulo || 'Información SENA Palmira'}</h2>
    <div style="color:#555555;font-size:14px;font-family:Arial,sans-serif;line-height:1.7;white-space:pre-line;">${d.cuerpo || ''}</div>
    <p style="margin:20px 0 0 0;color:#555555;font-size:14px;font-family:Arial,sans-serif;">Cordialmente,<br><strong>Maira &ndash; Administradora SENA Palmira</strong></p>
  `),
};

// ── Función principal de envío ───────────────────────────────────────────────
async function enviarCorreo({ tipo, destinatario, datos, asunto, usuarioId, aspiranteId, empresaId }) {
  const html = plantillas[tipo] ? plantillas[tipo](datos) : plantillas.GENERAL(datos);

  const asuntoFinal = asunto || {
    APROBACION: `[SENA Palmira] Pre-aprobación – ${datos.cursoRequerido || ''}`,
    RECHAZO:    `[SENA Palmira] Respuesta a su solicitud`,
    ASIGNACION: `[SENA Palmira] Asignación al curso ${datos.curso || ''}`,
    GENERAL:    datos.titulo || '[SENA Palmira] Información importante',
  }[tipo] || '[SENA Palmira] Notificación';

  const tipo_id = CAT.correoTipo[tipo] ?? CAT.correoTipo.GENERAL;

  let estado = 'ENVIADO';
  let errorMsg = null;

  try {
    await getTransporter().sendMail({
      from:    process.env.MAIL_FROM || `MAYZER SENA <${process.env.MAIL_USER}>`,
      to:      destinatario,
      subject: asuntoFinal,
      html,
    });
    console.log(`[correo] ✅ Enviado a ${destinatario} (tipo: ${tipo})`);
  } catch (e) {
    estado   = 'ERROR';
    errorMsg = e.message;
    console.error(`[correo] ❌ Error al enviar a ${destinatario}:`, e.message);
  }

  // Registrar en BD independientemente del resultado
  try {
    await pool.execute(
      `INSERT INTO correo_log
         (aspirante_id, empresa_id, enviado_por, tipo_id, destinatario, asunto, cuerpo, estado, error_msg)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [aspiranteId || null, empresaId || null, usuarioId || null,
       tipo_id, destinatario, asuntoFinal, html, estado, errorMsg]
    );
  } catch (dbErr) {
    console.error('[correo] Error al registrar en BD:', dbErr.message);
  }

  return { estado, error: errorMsg };
}

module.exports = { enviarCorreo };
