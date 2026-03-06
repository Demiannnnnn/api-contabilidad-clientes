const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporteController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/ventas', requireRole('dueño', 'admin', 'contador'), reporteController.ventas);
router.get('/tributario', requireRole('dueño', 'admin', 'contador'), reporteController.tributario);
router.get('/productos/mas-vendidos', requireRole('dueño', 'admin', 'contador'), reporteController.productosMasVendidos);
router.get('/clientes/ranking', requireRole('dueño', 'admin', 'contador'), reporteController.clientesRanking);
router.get('/caja', requireRole('dueño', 'admin', 'cajero'), reporteController.caja);
router.get('/dashboard', requireRole('dueño', 'admin', 'vendedor', 'contador'), reporteController.dashboardData);

module.exports = router;
