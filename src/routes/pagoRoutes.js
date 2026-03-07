const express = require('express');
const router = express.Router();
const pagoController = require('../controllers/pagoController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/cuentas-por-cobrar', requireRole('dueño', 'administrador', 'contador'), pagoController.getCuentasPorCobrar);
router.post('/sync', requireRole('dueño', 'administrador'), pagoController.syncPagos);
router.get('/documento/:docId', requireRole('dueño', 'administrador', 'vendedor', 'contador'), pagoController.getPagosByDocumento);
router.post('/', requireRole('dueño', 'administrador', 'vendedor'), pagoController.createPago);
router.delete('/:id', requireRole('dueño', 'administrador'), pagoController.deletePago);

module.exports = router;
