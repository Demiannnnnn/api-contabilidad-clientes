const express = require('express');
const router = express.Router();
const siiController = require('../../controllers/sistema/siiController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.post('/enviar-dte', requireRole('dueño', 'administrador'), siiController.enviarDte);
router.get('/consultar/:trackId', requireRole('dueño', 'administrador'), siiController.consultarEstado);
router.post('/generar-pdf/:folio', requireRole('dueño', 'administrador', 'trabajador'), siiController.generarPdf);
router.post('/firmar-xml', requireRole('dueño', 'administrador'), siiController.firmarXml);
router.post('/obtener-token', requireRole('dueño', 'administrador'), siiController.obtenerToken);

module.exports = router;
