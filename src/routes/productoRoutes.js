const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/search', requireRole('dueño', 'administrador', 'vendedor', 'contador'), productoController.searchProductos);
router.post('/sync', requireRole('dueño', 'administrador'), productoController.syncProductos);

router.get('/', requireRole('dueño', 'administrador', 'vendedor', 'contador'), productoController.getAllProductos);
router.get('/:id', requireRole('dueño', 'administrador', 'vendedor', 'contador'), productoController.getProductoById);
router.post('/', requireRole('dueño', 'administrador'), productoController.createProducto);
router.put('/:id', requireRole('dueño', 'administrador'), productoController.updateProducto);
router.patch('/:id/stock', requireRole('dueño', 'administrador', 'vendedor'), productoController.updateStock);
router.delete('/:id', requireRole('dueño', 'administrador'), productoController.deleteProducto);

module.exports = router;
