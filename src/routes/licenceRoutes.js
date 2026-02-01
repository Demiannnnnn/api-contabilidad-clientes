const express = require('express');
const router = express.Router();
const licenceController = require('../controllers/licenceController');


///Rutas especificas

//Cliente envia su licencia para validacion
router.post('/licence/validate', licenceController.validateLicence);

//Colececion Licencias

//Cliente obtiene licencia
router.get('/licence', licenceController.getLicence);


//Recurso individual


//Cliente actualiza su licencia
router.put('/licence/:id', licenceController.updateLicence);





module.exports = router;