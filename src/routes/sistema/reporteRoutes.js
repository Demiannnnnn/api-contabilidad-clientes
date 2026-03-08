const express = require('express');
const router = express.Router();
const reporteController = require('../../controllers/sistema/reporteController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.get('/ventas', requireRole('dueño', 'administrador', 'contador'), reporteController.ventas);
router.get('/tributario', requireRole('dueño', 'administrador', 'contador'), reporteController.tributario);
router.get('/productos/mas-vendidos', requireRole('dueño', 'administrador', 'contador'), reporteController.productosMasVendidos);
router.get('/clientes/ranking', requireRole('dueño', 'administrador', 'contador'), reporteController.clientesRanking);
router.get('/caja', requireRole('dueño', 'administrador', 'cajero'), reporteController.caja);
router.get('/dashboard', requireRole('dueño', 'administrador', 'trabajador', 'contador'), reporteController.dashboardData);

module.exports = router;
