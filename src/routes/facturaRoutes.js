const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');

///Rutas especificas

// Cliente obtiene backup de todas las facturas
router.get('/facturas/backup/all', facturaController.getFacturasBackup);

// Cliente sincroniza sus facturas locales
router.post('/facturas/sync', facturaController.syncFacturas);


///Coleccion Facturas


//Cliente obtiene todas las facturas
router.get('/facturas', facturaController.getAllFacturas);

// Cliente crea una nueva factura
router.post('/facturas', facturaController.createFactura);

///Recurso individual



// Cliente actualiza una factura existente
router.put('/facturas/:id', facturaController.updateFactura);

//Cliente elimina una factura por ID
router.delete('/facturas/:id', facturaController.deleteFactura);


module.exports = router;