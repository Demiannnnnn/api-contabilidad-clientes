const express = require('express');
const router = express.Router();
const updateController = require('../controllers/updateController');

// Route to handle updating a resource
router.get ('/update/check/', updateController.checkForUpdates);
router.get ('/update/download/', updateController.downloadUpdate);


module.exports = router;