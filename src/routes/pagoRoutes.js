const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/cuentas-por-cobrar', requireRole('dueño', 'admin', 'contador'), pagoController.getCuentasPorCobrar);
router.post('/sync', requireRole('dueño', 'admin'), pagoController.syncPagos);
router.get('/documento/:docId', requireRole('dueño', 'admin', 'vendedor', 'contador'), pagoController.getPagosByDocumento);
router.post('/', requireRole('dueño', 'admin', 'vendedor'), pagoController.createPago);
router.delete('/:id', requireRole('dueño', 'admin'), pagoController.deletePago);

module.exports = router;
