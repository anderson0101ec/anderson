/**
 * Archivo: utils/upload.utils.js
 * Responsabilidad: Configuración de Multer para la subida de archivos PDF.
 * Conecta con: routes/public.routes.js (usa upload.any()).
 * Lógica: Storage en disco, filtro de tipo MIME, límite de 10 MB por archivo.
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/documentos');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const stamp = Date.now();
    const rand  = Math.random().toString(36).substring(2, 8);
    cb(null, `doc_${stamp}_${rand}.pdf`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === 'application/pdf') cb(null, true);
  else cb(new Error('Solo se permiten archivos PDF'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = { upload };
