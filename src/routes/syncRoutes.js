const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { authenticate, tenantScope } = require('../middleware/authMiddleware');
const { syncLimiter } = require('../middleware/rateLimiter');

router.use(authenticate, tenantScope);

router.post('/push', syncLimiter, syncController.push);
router.get('/pull', syncController.pull);
router.post('/resolve-conflict', syncController.resolveConflict);
router.get('/status', syncController.getStatus);

module.exports = router;
