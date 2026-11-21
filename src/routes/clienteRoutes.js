const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { authenticate, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/search', clienteController.searchClientes);
router.post('/sync', clienteController.syncClientes);
router.get('/', clienteController.getAllClientes);
router.post('/', clienteController.createCliente);
router.get('/:id', clienteController.getClienteById);
router.get('/:id/estado-cuenta', clienteController.getEstadoCuenta);
router.put('/:id', clienteController.updateCliente);
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;
