const express = require('express');
const router = express.Router();
const tenantController = require('../../controllers/core/tenantController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/', tenantController.getTenant);
router.put('/', requireRole('dueño'), tenantController.updateTenant);
router.put('/sii-config', requireRole('dueño'), tenantController.updateSiiConfig);
router.post('/upload-certificado', requireRole('dueño'), tenantController.uploadCertificado);
router.post('/upload-logo', requireRole('dueño'), tenantController.uploadLogo);

module.exports = router;
