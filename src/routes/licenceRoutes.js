const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas de licencias
router.use(authMiddleware);

///Rutas especificas

//Cliente envia su licencia para validacion
router.post('/licence/validate', licenceController.validateLicence);

//Cliente verifica el estado de su licencia
router.get('/licence/status', licenceController.getLicenceStatus);


///Recurso unico

//Cliente obtiene licencia
router.get('/licence', licenceController.getLicence);

//Cliente actualiza su licencia
router.put('/licence', licenceController.updateLicence);





module.exports = router;