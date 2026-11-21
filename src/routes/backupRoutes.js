const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.post('/upload', requireRole('dueño', 'administrador'), backupController.upload);
router.get('/', requireRole('dueño', 'administrador'), backupController.list);
router.get('/:id/download', requireRole('dueño', 'administrador'), backupController.download);
router.delete('/:id', requireRole('dueño'), backupController.remove);

module.exports = router;
