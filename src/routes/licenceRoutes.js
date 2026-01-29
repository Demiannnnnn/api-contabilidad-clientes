const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');

// Obtener todas las licencias
router.get('/licences', licenceController.getAllLicences);

// Obtener una licencia por ID
router.get('/licences/:id', licenceController.getLicenceById);

// Actualizar una licencia existente
router.put('/licences/:id', licenceController.updateLicence);

module.exports = router;