const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/facturasController');


// Ruta para obtener todas las facturas
router.get('/facturas', clienteController.getAllFacturas);

// Ruta para obtener una factura por ID
router.get('/facturas/:id', clienteController.getFacturaById);

// Ruta para hacer backup de todas las facturas
router.post('/facturas/backup/all', clienteController.getFacturasBackup);



module.exports = router;