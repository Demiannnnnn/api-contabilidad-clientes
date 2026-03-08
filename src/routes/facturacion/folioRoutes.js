const express = require('express');
const router = express.Router();
const folioController = require('../../controllers/facturacion/folioController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/', requireRole('dueño', 'administrador'), folioController.listFolios);
router.post('/upload-caf', requireRole('dueño', 'administrador'), folioController.uploadCaf);
router.get('/:tipo/next', requireRole('dueño', 'administrador', 'trabajador'), folioController.getNextFolio);

module.exports = router;
