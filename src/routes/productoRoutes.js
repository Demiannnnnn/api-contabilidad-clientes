const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas de productos
router.use(authMiddleware);

///Rutas especificas
// Cliente obtiene backup de todos los productos
router.get('/productos/backup/all', productoController.getProductosBackup);

// Cliente sincroniza sus productos locales
router.post('/productos/sync', productoController.syncProductos);

///Coleccion Productos
//Cliente obtiene todos los productos
router.get('/productos', productoController.getAllProductos);

//Cliente crea un nuevo producto
router.post('/productos', productoController.createProducto);

///Recurso individual
// Cliente actualiza un producto existente
router.put('/productos/:id', productoController.updateProducto);

//Cliente elimina un producto por ID
router.delete('/productos/:id', productoController.deleteProducto);


module.exports = router;