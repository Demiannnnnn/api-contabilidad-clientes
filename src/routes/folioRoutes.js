const express = require('express');
const router = express.Router();
const folioController = require('../controllers/folioController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/', requireRole('dueño', 'admin'), folioController.listFolios);
router.post('/upload-caf', requireRole('dueño', 'admin'), folioController.uploadCaf);
router.get('/:tipo/next', requireRole('dueño', 'admin', 'vendedor'), folioController.getNextFolio);

module.exports = router;
