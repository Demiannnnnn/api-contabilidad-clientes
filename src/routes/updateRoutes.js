const express = require('express');
const router = express.Router();
const updateController = require('../controllers/updateController');

// Actualizacion de app
router.get ('/update/check/', updateController.checkForUpdates);
router.get ('/update/download/:version?', updateController.downloadUpdate);

module.exports = router;