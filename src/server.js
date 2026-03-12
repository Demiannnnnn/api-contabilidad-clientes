const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const server = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const logger = require('./utils/logger');

// ─── Security & Performance Middleware ─────────────────
server.use(helmet());
server.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
server.use(compression());

// ─── Body Parsing ──────────────────────────────────────
server.use(express.json({ limit: '5mb' }));
server.use(express.urlencoded({ extended: true }));

// ─── Request Logging ───────────────────────────────────
const SENSITIVE_KEYS = ['password', 'passwordHash', 'password_hash', 'token', 'refreshToken', 'accessToken', 'certificadoDigital', 'claveCertificado', 'flowSecretKey'];
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const key of SENSITIVE_KEYS) {
    if (sanitized[key] !== undefined) sanitized[key] = '[REDACTED]';
  }
  return sanitized;
}

server.use((req, res, next) => {
  const start = process.hrtime();

  // Intercept res.json to capture response body for error logging
  const originalJson = res.json.bind(res);
  let responseBody;
  res.json = (body) => {
    responseBody = body;
    return originalJson(body);
  };

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const ms = (duration[0] * 1e3 + duration[1] / 1e6).toFixed(2);
    const statusCode = res.statusCode;
    const line = `${req.method} ${req.originalUrl} ${statusCode} ${ms}ms`;

    if (statusCode >= 400) {
      const bodyStr = req.body && Object.keys(req.body).length
        ? ` | body=${JSON.stringify(sanitizeBody(req.body))}` : '';
      const errStr = responseBody
        ? ` | response=${JSON.stringify(responseBody)}` : '';
      logger.error(`${line}${bodyStr}${errStr}`);
    } else {
      logger.info(line);
    }
  });
  next();
});

// ─── Rate Limiting ─────────────────────────────────────
const { apiLimiter } = require('./middleware/rateLimiter');
server.use('/api', apiLimiter);

// ─── Health Check ──────────────────────────────────────
server.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.get('/', (req, res) => {
  res.json({ message: 'API Sistema Contabilidad', version: '2.0.0' });
});

// ─── Import Routes ─────────────────────────────────────
// Core
const authRoutes = require('./routes/core/authRoutes');
const tenantRoutes = require('./routes/core/tenantRoutes');
const userRoutes = require('./routes/core/userRoutes');
const vinculacionRoutes = require('./routes/core/vinculacionRoutes');
// Facturación
const clienteRoutes = require('./routes/facturacion/clienteRoutes');
const productoRoutes = require('./routes/facturacion/productoRoutes');
const trabajadorRoutes = require('./routes/facturacion/trabajadorRoutes');
const documentoRoutes = require('./routes/facturacion/documentoRoutes');
const folioRoutes = require('./routes/facturacion/folioRoutes');
// Pagos
const pagoRoutes = require('./routes/pagos/pagoRoutes');
const flowRoutes = require('./routes/pagos/flowRoutes');
// Sistema
const syncRoutes = require('./routes/sistema/syncRoutes');
const reporteRoutes = require('./routes/sistema/reporteRoutes');
const siiRoutes = require('./routes/sistema/siiRoutes');
const licenciaRoutes = require('./routes/sistema/licenciaRoutes');
const backupRoutes = require('./routes/sistema/backupRoutes');

// ─── Mount Routes ──────────────────────────────────────
server.use('/api/auth', authRoutes);
server.use('/api/tenant', tenantRoutes);
server.use('/api/users', userRoutes);
server.use('/api/vinculaciones', vinculacionRoutes);
server.use('/api/clientes', clienteRoutes);
server.use('/api/productos', productoRoutes);
server.use('/api/trabajadores', trabajadorRoutes);
server.use('/api/documentos', documentoRoutes);
server.use('/api/pagos', pagoRoutes);
server.use('/api/folios', folioRoutes);
server.use('/api/sync', syncRoutes);
server.use('/api/reportes', reporteRoutes);
server.use('/api/sii', siiRoutes);
server.use('/api/licencias', licenciaRoutes);
server.use('/api/flow', flowRoutes);
server.use('/api/backups', backupRoutes);

// ─── 404 Handler ───────────────────────────────────────
server.use((req, res) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// ─── Global Error Handler ──────────────────────────────
server.use((err, req, res, next) => {
  logger.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

// ─── Start Server ──────────────────────────────────────
const srv = server.listen(PORT, HOST, () => {
  logger.info(`Server running at http://${HOST}:${PORT}/`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

srv.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Puerto ${PORT} ya está en uso. Cierra el otro proceso o cambia el puerto.`);
  } else {
    logger.error(`Error al iniciar servidor: ${err.message}`);
  }
  process.exit(1);
});

