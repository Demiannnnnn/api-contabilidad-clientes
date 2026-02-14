const express = require('express');
const router = express.Router();
const updateController = require('../controllers/updateController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas de actualización
router.use(authMiddleware);

// Actualizacion de app
router.get ('/update/check/', updateController.checkForUpdates);
router.get ('/update/download/:version', updateController.downloadUpdate);
router.get ('/update/download', updateController.downloadUpdate);

module.exports = router;