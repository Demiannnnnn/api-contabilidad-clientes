const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documentoController');
const authMiddleware = require('../middleware/authRequest');

router.use(authMiddleware); // Protege todas las rutas de documento con autenticación
///Rutas especificas

// Cliente obtiene backup de todas las documentos
router.get('/documentos/backup/all', documentoController.getFacturasBackup);

// Cliente sincroniza sus documentos locales
router.post('/documentos/sync', documentoController.syncFacturas);


///Coleccion Facturas


//Cliente obtiene todas las documentos
router.get('/documentos', documentoController.getAllFacturas);

// Cliente crea una nueva documento
router.post('/documentos', documentoController.createFactura);

///Recurso individual



// Cliente actualiza una documento existente
router.put('/documentos/:id', documentoController.updateFactura);

//Cliente elimina una documento por ID
router.delete('/documentos/:id', documentoController.deleteFactura);


module.exports = router;