const express = require('express');
const router = express.Router();
const trabajadorController = require('../controllers/trabajadorController');
const authMiddleware = require('../middleware/authRequest');

router.use(authMiddleware); // Protege todas las rutas de trabajador con autenticación

///Rutas especificas
// Cliente obtiene backup de todos los trabajadores
router.get('/trabajadores/backup/all', trabajadorController.getTrabajadoresBackup);

// Cliente sincroniza sus trabajadores locales
router.post('/trabajadores/sync', trabajadorController.syncTrabajadores);

///Coleccion Trabajadores
//Cliente obtiene todos los trabajadores
router.get('/trabajadores', trabajadorController.getAllTrabajadores);

//Cliente crea un nuevo trabajador
router.post('/trabajadores', trabajadorController.createTrabajador);

///Recurso individual
// Cliente actualiza un trabajador existente
router.put('/trabajadores/:id', trabajadorController.updateTrabajador);

//Cliente elimina un trabajador por ID
router.delete('/trabajadores/:id', trabajadorController.deleteTrabajador);

module.exports = router;