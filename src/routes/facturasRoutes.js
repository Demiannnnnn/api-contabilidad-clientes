const express = require('express');
const router = express.Router();
const clienteService = require('../controllers/facturaController');

// Obtener las facturas de un cliente por ID
router.get('/cliente/:clienteId', facturaController.getFacturasByClienteId);

// Crear una nueva factura
router.post('/', facturaController.createFactura);

// Actualizar una factura existente
router.put('/:id', facturaController.updateFactura);

// Eliminar una factura
router.delete('/:id', facturaController.deleteFactura);
module.exports = router;