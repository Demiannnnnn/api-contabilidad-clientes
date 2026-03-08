const documentoService = require('../../services/facturacion/documentoService');

const getAllDocumentos = async (req, res) => {
  try {
    const result = await documentoService.listDocumentos(req.tenantId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getDocumentoById = async (req, res) => {
  try {
    const doc = await documentoService.getDocumento(req.tenantId, req.params.id);
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const createDocumento = async (req, res) => {
  try {
    const doc = await documentoService.createDocumento(req.tenantId, req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const updateDocumento = async (req, res) => {
  try {
    const doc = await documentoService.updateDocumento(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data: doc });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ success: false, error: 'Se requiere el campo estado' });
    const doc = await documentoService.cambiarEstado(req.tenantId, req.params.id, estado);
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const deleteDocumento = async (req, res) => {
  try {
    await documentoService.deleteDocumento(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Documento eliminado' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const syncDocumentos = async (req, res) => {
  try {
    const { documentos } = req.body;
    if (!Array.isArray(documentos)) {
      return res.status(400).json({ success: false, error: 'Se esperaba un array de documentos' });
    }
    const result = await documentoService.syncDocumentos(req.tenantId, documentos);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getDocumentoPdf = async (req, res) => {
  try {
    const doc = await documentoService.getDocumento(req.tenantId, req.params.id);
    if (!doc.pdfUrl) {
      return res.status(404).json({ success: false, error: 'PDF no disponible' });
    }
    res.json({ success: true, data: { pdfUrl: doc.pdfUrl } });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getDocumentoXml = async (req, res) => {
  try {
    const doc = await documentoService.getDocumento(req.tenantId, req.params.id);
    if (!doc.xmlContent) {
      return res.status(404).json({ success: false, error: 'XML no disponible' });
    }
    res.set('Content-Type', 'application/xml');
    res.send(doc.xmlContent);
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllDocumentos, getDocumentoById, createDocumento, updateDocumento,
  cambiarEstado, deleteDocumento, syncDocumentos, getDocumentoPdf, getDocumentoXml
};
