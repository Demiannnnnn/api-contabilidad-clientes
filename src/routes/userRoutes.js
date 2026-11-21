const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/', requireRole('administrador'), userController.listUsers);
router.get('/:id', requireRole('administrador'), userController.getUser);
router.post('/', requireRole('dueño', 'administrador'), userController.createUser);
router.put('/:id', requireRole('dueño', 'administrador'), userController.updateUser);
router.patch('/:id/toggle-active', requireRole('dueño', 'administrador'), userController.toggleActive);
router.patch('/:id/password', requireRole('dueño'), userController.changeUserPassword);
router.patch('/:id/permissions', requireRole('dueño'), userController.updatePermissions);
router.delete('/:id', requireRole('dueño'), userController.deleteUser);

module.exports = router;
