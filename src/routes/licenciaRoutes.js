const express = require('express');
const router = express.Router();
const licenciaController = require('../controllers/licenciaController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.post('/validate', licenciaController.validate);
router.get('/status', licenciaController.status);
router.post('/activate', requireRole('dueño'), licenciaController.activate);

module.exports = router;
