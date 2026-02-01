const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');



///Rutas especificas

// Cliente obtiene backup de todos los clientes
router.get('/clientes/backup/all', clienteController.getClientesBackup);

// Cliente sincroniza sus clientes locales
router.post('/clientes/sync', clienteController.syncClientes);


///Coleccion Clientes


//Cliente obtiene todos los clientes
router.get('/clientes', clienteController.getAllClientes);

//Cliente crea un nuevo cliente
router.post('/clientes', clienteController.createCliente);


///Recurso individual

// Cliente actualiza un cliente existente
router.put('/clientes/:id', clienteController.updateCliente);

//Cliente elimina un cliente por ID
router.delete('/clientes/:id', clienteController.deleteCliente);





module.exports = router;