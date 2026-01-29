const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
// Ruta para recibir todos los clientes
router.post('/clientes', clienteController.getAllClientes);

// Ruta para recibir un cliente por ID
router.post('/clientes/:id', clienteController.getClienteById);

// Ruta para enviar backup de todos los clientes
router.get('/clientes/backup/all', clienteController.getClientesBackup);

