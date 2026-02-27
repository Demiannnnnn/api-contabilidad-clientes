const express = require('express');
const server = express();
require('dotenv').config();


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';


const logger = require('./utils/logger');
// Middleware de logging detallado
server.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const ms = (duration[0] * 1e3 + duration[1] / 1e6).toFixed(2);
    logger.info(`---\n[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    logger.info('Query:', req.query);
    logger.info('Body:', req.body);
    logger.info('Status:', res.statusCode);
    logger.info('Tiempo de respuesta:', ms + 'ms');
    logger.info('---');
  });
  next();
});

//middlewares globales
server.use(express.json());
server.use(express.urlencoded({ extended: true }));



//importar rutas
const authRoutes = require('./routes/authRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const productoRoutes = require('./routes/productoRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const licenceRoutes = require('./routes/licenceRoutes');
const updateRoutes = require('./routes/updateRoutes');

//Usar rutas
server.use('/api/auth', authRoutes);
server.use('/api', clienteRoutes);
server.use('/api', productoRoutes);
server.use('/api', documentoRoutes);
server.use('/api', licenceRoutes);
server.use('/api', updateRoutes);


//ruta prueba
server.get('/', (req, res) => {
  res.send('Servidor de API funcionando correctamente');
});


//manejo de errores globales
server.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});


server.listen(PORT, HOST, () => {
  logger.info(`Server running at http://${HOST}:${PORT}/`);
});

