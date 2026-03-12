const express = require('express');
const router = express.Router();
const siiController = require('../../controllers/sistema/siiController');
const { authenticate, requireRole, tenantScope } = require('../../middleware/authMiddleware');

router.use(authenticate, tenantScope);

// Solo rutas de consulta/administración - NO para creación de documentos
// Los documentos se envían automáticamente desde POST /api/documentos

// Consultar estado de un documento ya enviado al SII
router.get('/documento/:documentoId/estado', requireRole('dueño', 'administrador', 'contador'), siiController.consultarEstadoDocumento);

// Reenviar un documento existente al SII (en caso de fallo)
router.post('/documento/:documentoId/reenviar', requireRole('dueño', 'administrador'), siiController.reenviarDocumento);

// Logs de comunicación con SII (debug/auditoría)
router.get('/logs', requireRole('dueño', 'administrador'), siiController.obtenerLogs);

module.exports = router;
