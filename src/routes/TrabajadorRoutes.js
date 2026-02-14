const express = require('express');
const router = express.Router();
const trabajadorController = require('../controllers/trabajadorController');
const authMiddleware = require('../middleware/auth');

// Aplicar middleware de autenticación a todas las rutas de trabajadores
router.use(authMiddleware);

///Rutas especificas

//Cliente obtiene backup de todos los trabajadores
router.get('/trabajadores/backup', trabajadorController.getTrabajadoresBackup);

//Cliente obtiene un trabajador por su ID
router.get('/trabajadores/:id', trabajadorController.getTrabajadorById);

//Cliente actualiza un trabajador por su ID
router.put('/trabajadores/:id', trabajadorController.updateTrabajadorById);

//Cliente elimina un trabajador por su ID
router.delete('/trabajadores/:id', trabajadorController.deleteTrabajadorById);

///Recurso unico

//Cliente obtiene su propio perfil de trabajador
router.get('/trabajador', trabajadorController.getMyProfile);

//Cliente actualiza su propio perfil de trabajador
router.put('/trabajador', trabajadorController.updateMyProfile);

//Cliente elimina su propio perfil de trabajador
router.delete('/trabajador', trabajadorController.deleteMyProfile);

module.exports = router;