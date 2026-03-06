const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/search', requireRole('dueño', 'admin', 'vendedor', 'contador'), productoController.searchProductos);
router.post('/sync', requireRole('dueño', 'admin'), productoController.syncProductos);

router.get('/', requireRole('dueño', 'admin', 'vendedor', 'contador'), productoController.getAllProductos);
router.get('/:id', requireRole('dueño', 'admin', 'vendedor', 'contador'), productoController.getProductoById);
router.post('/', requireRole('dueño', 'admin'), productoController.createProducto);
router.put('/:id', requireRole('dueño', 'admin'), productoController.updateProducto);
router.patch('/:id/stock', requireRole('dueño', 'admin', 'vendedor'), productoController.updateStock);
router.delete('/:id', requireRole('dueño', 'admin'), productoController.deleteProducto);

module.exports = router;
