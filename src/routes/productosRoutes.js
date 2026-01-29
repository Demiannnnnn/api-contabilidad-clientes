const express = require('express');
const router = express.Router();
const clienteService = require('../controllers/productoController');

/// Ruta para obtener todos los productos
router.get('/productos', clienteService.getAllProductos);

// Ruta para obtener un producto por ID
router.get('/productos/:id', clienteService.getProductoById);

// Ruta para hacer backup de todos los productos
router.post('/productos/backup/all', clienteService.getProductosBackup);

module.exports = router;