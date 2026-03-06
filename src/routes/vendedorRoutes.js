const express = require('express');
const router = express.Router();
const vendedorController = require('../controllers/vendedorController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/search', requireRole('dueño', 'admin', 'vendedor', 'contador'), vendedorController.searchVendedores);

router.get('/', requireRole('dueño', 'admin', 'vendedor', 'contador'), vendedorController.getAllVendedores);
router.get('/:id', requireRole('dueño', 'admin', 'vendedor', 'contador'), vendedorController.getVendedorById);
router.post('/', requireRole('dueño', 'admin'), vendedorController.createVendedor);
router.put('/:id', requireRole('dueño', 'admin'), vendedorController.updateVendedor);
router.patch('/:id/toggle-active', requireRole('dueño', 'admin'), vendedorController.toggleActive);
router.delete('/:id', requireRole('dueño', 'admin'), vendedorController.deleteVendedor);

module.exports = router;
