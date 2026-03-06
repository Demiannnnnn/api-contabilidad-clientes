const express = require('express');
const router = express.Router();
const siiController = require('../controllers/siiController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.post('/enviar-dte', requireRole('dueño', 'admin'), siiController.enviarDte);
router.get('/consultar/:trackId', requireRole('dueño', 'admin'), siiController.consultarEstado);
router.post('/generar-pdf/:folio', requireRole('dueño', 'admin', 'vendedor'), siiController.generarPdf);
router.post('/firmar-xml', requireRole('dueño', 'admin'), siiController.firmarXml);
router.post('/obtener-token', requireRole('dueño', 'admin'), siiController.obtenerToken);

module.exports = router;
