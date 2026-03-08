const express = require('express');
const router = express.Router();
const pagoController = require('../../controllers/pagos/pagoController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/cuentas-por-cobrar', requireRole('dueño', 'administrador', 'contador'), pagoController.getCuentasPorCobrar);
router.post('/sync', requireRole('dueño', 'administrador'), pagoController.syncPagos);
router.get('/documento/:docId', requireRole('dueño', 'administrador', 'trabajador', 'contador'), pagoController.getPagosByDocumento);
router.post('/', requireRole('dueño', 'administrador', 'trabajador'), pagoController.createPago);
router.delete('/:id', requireRole('dueño', 'administrador'), pagoController.deletePago);

module.exports = router;
