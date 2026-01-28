const express = require('express');
const router = express.Router();
const clienteService = require('../controllers/productoController');

// Obtener todos productos de un cliente
router.get('/cliente/:clienteId', productoController.getProductosByClienteId);

// Crear un nuevo producto
router.post('/', productoController.createProducto);

// Actualizar un producto existente
router.put('/:id', productoController.updateProducto);

// Eliminar un producto
router.delete('/:id', productoController.deleteProducto);
module.exports = router;