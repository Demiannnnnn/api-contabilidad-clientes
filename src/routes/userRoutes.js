const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('ADMIN'));

router.get('/', userController.getAll);           // Ver todos los users
router.get('/:id', userController.getById);       // Ver un user
router.post('/', userController.create);          // Crear user
router.put('/:id', userController.update);        // Editar user
router.delete('/:id', userController.delete); 


module.exports = router;