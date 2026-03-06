const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.post('/upload', requireRole('dueño', 'admin'), backupController.upload);
router.get('/', requireRole('dueño', 'admin'), backupController.list);
router.get('/:id/download', requireRole('dueño', 'admin'), backupController.download);
router.delete('/:id', requireRole('dueño'), backupController.remove);

module.exports = router;
