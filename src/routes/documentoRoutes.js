const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documentoController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.post('/sync', requireRole('dueño', 'administrador'), documentoController.syncDocumentos);

router.get('/', requireRole('dueño', 'administrador', 'vendedor', 'contador'), documentoController.getAllDocumentos);
router.get('/:id', requireRole('dueño', 'administrador', 'vendedor', 'contador'), documentoController.getDocumentoById);
router.get('/:id/pdf', requireRole('dueño', 'administrador', 'vendedor', 'contador'), documentoController.getDocumentoPdf);
router.get('/:id/xml', requireRole('dueño', 'administrador', 'vendedor', 'contador'), documentoController.getDocumentoXml);

router.post('/', requireRole('dueño', 'administrador', 'vendedor'), documentoController.createDocumento);
router.put('/:id', requireRole('dueño', 'administrador'), documentoController.updateDocumento);
router.patch('/:id/estado', requireRole('dueño', 'administrador'), documentoController.cambiarEstado);
router.delete('/:id', requireRole('dueño', 'administrador'), documentoController.deleteDocumento);

module.exports = router;
