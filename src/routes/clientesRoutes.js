const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
// Ruta para obtener todos los clientes
router.get('/clientes', clienteController.getAllClientes);

// Ruta para obtener un cliente por ID
router.get('/clientes/:id', clienteController.getClienteById);

// Ruta para crear un nuevo cliente
router.post('/clientes', clienteController.createCliente);

// Ruta para actualizar un cliente existente
router.put('/clientes/:id', clienteController.updateCliente);

// Ruta para eliminar un cliente
router.delete('/clientes/:id', clienteController.deleteCliente);
module.exports = router;