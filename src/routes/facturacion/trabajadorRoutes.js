const express = require('express');
const router = express.Router();
const trabajadorController = require('../../controllers/facturacion/trabajadorController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/search', requireRole('dueño', 'administrador', 'trabajador', 'contador'), trabajadorController.searchTrabajadores);

router.get('/', requireRole('dueño', 'administrador', 'trabajador', 'contador'), trabajadorController.getAllTrabajadores);
router.get('/:id', requireRole('dueño', 'administrador', 'trabajador', 'contador'), trabajadorController.getTrabajadorById);
router.post('/', requireRole('dueño', 'administrador'), trabajadorController.createTrabajador);
router.put('/:id', requireRole('dueño', 'administrador'), trabajadorController.updateTrabajador);
router.patch('/:id/toggle-active', requireRole('dueño', 'administrador'), trabajadorController.toggleActive);
router.delete('/:id', requireRole('dueño', 'administrador'), trabajadorController.deleteTrabajador);

module.exports = router;
