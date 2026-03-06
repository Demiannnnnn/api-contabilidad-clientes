const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documentoController');
const { authenticate, requireRole, tenantScope } = require('../middleware/authMiddleware');

router.use(authenticate, tenantScope);

router.post('/sync', requireRole('dueño', 'admin'), documentoController.syncDocumentos);

router.get('/', requireRole('dueño', 'admin', 'vendedor', 'contador'), documentoController.getAllDocumentos);
router.get('/:id', requireRole('dueño', 'admin', 'vendedor', 'contador'), documentoController.getDocumentoById);
router.get('/:id/pdf', requireRole('dueño', 'admin', 'vendedor', 'contador'), documentoController.getDocumentoPdf);
router.get('/:id/xml', requireRole('dueño', 'admin', 'vendedor', 'contador'), documentoController.getDocumentoXml);

router.post('/', requireRole('dueño', 'admin', 'vendedor'), documentoController.createDocumento);
router.put('/:id', requireRole('dueño', 'admin'), documentoController.updateDocumento);
router.patch('/:id/estado', requireRole('dueño', 'admin'), documentoController.cambiarEstado);
router.delete('/:id', requireRole('dueño', 'admin'), documentoController.deleteDocumento);

module.exports = router;
