const express = require('express');
const router = express.Router();
const clienteService = require('../controllers/productoController');

/// Rutas para sincronizar datos entre cliente y servidor (app estuvo funcionando offline)

// Ruta para enviar datos desde el cliente al servidor
router.post('/sync/upload', clienteService.uploadData);

// Ruta para obtener datos del servidor al cliente
router.get('/sync/download', clienteService.downloadData);

module.exports = router;