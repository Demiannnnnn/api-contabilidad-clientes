const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authRequest');
const {validateRegister, validateLogin, validateChangePassword} = require('../middleware/validateRequest');

// Ruta para el registro de usuarios
router.post('/register', validateRegister, authController.register);

// Ruta para el inicio de sesión
router.post('/login', validateLogin, authController.login);

// Ruta para el cambio de contraseña
router.post('/change-password', authMiddleware, validateChangePassword, authController.changePassword);

// Ruta para obtener el perfil del usuario autenticado
router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;



