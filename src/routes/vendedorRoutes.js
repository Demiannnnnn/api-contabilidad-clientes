const express = require('express');
const router = express.Router();
const vendedorController = require('../controllers/vendedorController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/search', requireRole('dueño', 'administrador', 'vendedor', 'contador'), vendedorController.searchVendedores);

router.get('/', requireRole('dueño', 'administrador', 'vendedor', 'contador'), vendedorController.getAllVendedores);
router.get('/:id', requireRole('dueño', 'administrador', 'vendedor', 'contador'), vendedorController.getVendedorById);
router.post('/', requireRole('dueño', 'administrador'), vendedorController.createVendedor);
router.put('/:id', requireRole('dueño', 'administrador'), vendedorController.updateVendedor);
router.patch('/:id/toggle-active', requireRole('dueño', 'administrador'), vendedorController.toggleActive);
router.delete('/:id', requireRole('dueño', 'administrador'), vendedorController.deleteVendedor);

module.exports = router;
