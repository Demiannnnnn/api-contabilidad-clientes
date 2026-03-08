const folioService = require('../../services/facturacion/folioService');

const listFolios = async (req, res) => {
  try {
    const folios = await folioService.listFolios(req.tenantId);
    res.json({ success: true, data: folios });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const uploadCaf = async (req, res) => {
  try {
    const folio = await folioService.uploadCaf(req.tenantId, req.body);
    res.status(201).json({ success: true, data: folio });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getNextFolio = async (req, res) => {
  try {
    const result = await folioService.getNextFolio(req.tenantId, req.params.tipo);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { listFolios, uploadCaf, getNextFolio };
