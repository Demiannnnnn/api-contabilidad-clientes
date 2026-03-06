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
server.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const ms = (duration[0] * 1e3 + duration[1] / 1e6).toFixed(2);
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
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
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const userRoutes = require('./routes/userRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const productoRoutes = require('./routes/productoRoutes');
const vendedorRoutes = require('./routes/vendedorRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const folioRoutes = require('./routes/folioRoutes');
const syncRoutes = require('./routes/syncRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const siiRoutes = require('./routes/siiRoutes');
const licenciaRoutes = require('./routes/licenciaRoutes');
const flowRoutes = require('./routes/flowRoutes');
const backupRoutes = require('./routes/backupRoutes');

// ─── Mount Routes ──────────────────────────────────────
server.use('/api/auth', authRoutes);
server.use('/api/tenant', tenantRoutes);
server.use('/api/users', userRoutes);
server.use('/api/clientes', clienteRoutes);
server.use('/api/productos', productoRoutes);
server.use('/api/vendedores', vendedorRoutes);
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
server.listen(PORT, HOST, () => {
  logger.info(`Server running at http://${HOST}:${PORT}/`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

