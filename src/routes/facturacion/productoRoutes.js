const express = require('express');
const router = express.Router();
const productoController = require('../../controllers/facturacion/productoController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/search', requireRole('dueño', 'administrador', 'trabajador', 'contador'), productoController.searchProductos);
router.post('/sync', requireRole('dueño', 'administrador'), productoController.syncProductos);

router.get('/', requireRole('dueño', 'administrador', 'trabajador', 'contador'), productoController.getAllProductos);
router.get('/:id', requireRole('dueño', 'administrador', 'trabajador', 'contador'), productoController.getProductoById);
router.post('/', requireRole('dueño', 'administrador'), productoController.createProducto);
router.put('/:id', requireRole('dueño', 'administrador'), productoController.updateProducto);
router.patch('/:id/stock', requireRole('dueño', 'administrador', 'trabajador'), productoController.updateStock);
router.delete('/:id', requireRole('dueño', 'administrador'), productoController.deleteProducto);

module.exports = router;
