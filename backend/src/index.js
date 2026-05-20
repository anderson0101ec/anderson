/**
 * Archivo: index.js  (punto de entrada del servidor)
 * Responsabilidad: Inicializar Express, registrar middlewares globales y montar todas las rutas.
 * Conecta con: config/db.js, routes/*.routes.js, todos los archivos de rutas.
 * Lógica: Configuración de CORS, Helmet, rate limiting, rutas y arranque del servidor.
 */
require('dotenv').config();
const { version } = require('../package.json');

// ── Validación de variables de entorno obligatorias ──
const ENV_REQUERIDAS = ['JWT_SECRET'];
const faltantes = ENV_REQUERIDAS.filter(k => !process.env[k]);
if (faltantes.length) {
  console.error('\n❌ ERROR: Variables de entorno faltantes:', faltantes.join(', '));
  console.error('   Crea el archivo  backend/.env  basándote en  backend/.env.example\n');
  process.exit(1);
}

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const compression = require('compression');
const { testConnection } = require('./config/db');

// Rutas
const authRoutes = require('./routes/auth.routes');
const solicitudRoutes = require('./routes/solicitud.routes');
const aspiranteRoutes = require('./routes/aspirante.routes');
const cursoRoutes = require('./routes/curso.routes');
const instructorRoutes = require('./routes/instructor.routes');
const grupoRoutes = require('./routes/grupo.routes');
const eventoRoutes = require('./routes/evento.routes');
const certificadoRoutes = require('./routes/certificado.routes');
const reporteRoutes = require('./routes/reporte.routes');
const empresaRoutes = require('./routes/empresa.routes');
const correoRoutes = require('./routes/correo.routes');
const publicRoutes       = require('./routes/public.routes');
const adminUsuariosRoutes = require('./routes/usuario-admin.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Seguridad básica
app.use(helmet({
  contentSecurityPolicy: false, // React maneja esto
}));

// ── Compresión gzip/brotli — reduce transferencia JSON/HTML hasta 70 %
app.use(compression({
  level: 6,          // balance velocidad/compresión (1-9)
  threshold: 1024,   // no comprimir respuestas < 1KB
}));

// ── CORS (solo permite el frontend)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parseo JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  message: { error: 'Demasiadas solicitudes, intenta en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Rate limiting estricto para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' },
  skipSuccessfulRequests: true,
});
app.use('/api/auth/login', loginLimiter);

// ── Rutas públicas (sin autenticación)
app.use('/api/public', publicRoutes);

// ── Rutas de autenticación
app.use('/api/auth', authRoutes);

// ── Rutas protegidas (requieren JWT)
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/aspirantes', aspiranteRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/instructores', instructorRoutes);
app.use('/api/grupos', grupoRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/certificados', certificadoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/empresas', empresaRoutes);
app.use('/api/correos', correoRoutes);
app.use('/api/admin-usuarios', adminUsuariosRoutes);

// ── Archivos estáticos (PDFs subidos)
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// ── Health check
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status:   'ok',
    sistema:  'Mayzer SENA Palmira',
    version,
    uptime:   `${Math.floor(process.uptime())}s`,
    memoria:  `${Math.round(mem.rss / 1024 / 1024)} MB`,
    entorno:  process.env.NODE_ENV || 'development',
  });
});

// ── Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message,
  });
});

// ── Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Iniciar servidor
let server;

async function start() {
  await testConnection();
  server = app.listen(PORT, () => {
    console.log(`✅ Mayzer corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}

start();

// ── Graceful shutdown ─────────────────────────────────────
// Permite que Docker / Kubernetes envíen SIGTERM y el servidor
// termine ordenadamente: deja de aceptar nuevas conexiones y
// espera a que las en curso terminen antes de salir.
function shutdown(signal) {
  console.log(`\n[${signal}] Cerrando servidor ordenadamente...`);
  if (!server) return process.exit(0);
  server.close(() => {
    console.log('✅ Servidor cerrado.');
    process.exit(0);
  });
  setTimeout(() => { console.error('⚠️  Forzando salida.'); process.exit(1); }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
