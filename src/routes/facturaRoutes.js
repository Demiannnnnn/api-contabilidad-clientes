const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');

///Rutas especificas

// Cliente obtiene backup de todas las facturas
router.get('/facturas/backup/all', facturasController.getFacturasBackup);

// Cliente sincroniza sus facturas locales
router.post('/facturas/sync', facturasController.syncFacturas);


///Coleccion Facturas


//Cliente obtiene todas las facturas
router.get('/facturas', facturasController.getAllFacturas);

// Cliente crea una nueva factura
router.post('/facturas', facturasController.createFactura);

///Recurso individual



// Cliente actualiza una factura existente
router.put('/facturas/:id', facturasController.updateFactura);

//Cliente elimina una factura por ID
router.delete('/facturas/:id', facturasController.deleteFactura);


module.exports = router;