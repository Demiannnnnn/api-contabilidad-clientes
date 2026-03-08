const express = require('express');
const router = express.Router();
const flowController = require('../../controllers/pagos/flowController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.post('/create-order', authenticate, tenantScope, requireRole('dueño'), flowController.createOrder);
router.get('/status/:orderId', authenticate, tenantScope, flowController.getStatus);
router.post('/webhook', flowController.webhook); // No auth — Flow sends this
router.get('/return', flowController.returnPage); // No auth — user redirect

module.exports = router;
