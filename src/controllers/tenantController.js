const tenantService = require('../services/tenantService');

const getTenant = async (req, res) => {
  try {
    const tenant = await tenantService.getTenant(req.tenantId);
    res.json({ success: true, data: tenant });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const updateTenant = async (req, res) => {
  try {
    const tenant = await tenantService.updateTenant(req.tenantId, req.body);
    res.json({ success: true, data: tenant });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message || 'Error al actualizar tenant'; }
    res.status(status).json(response);
  }
};

const updateSiiConfig = async (req, res) => {
  try {
    const tenant = await tenantService.updateSiiConfig(req.tenantId, req.body);
    res.json({ success: true, data: tenant });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const uploadCertificado = async (req, res) => {
  // TODO: Implement certificate upload with file handling
  res.status(501).json({ success: false, error: 'No implementado aún' });
};

const uploadLogo = async (req, res) => {
  // TODO: Implement logo upload
  res.status(501).json({ success: false, error: 'No implementado aún' });
};

module.exports = { getTenant, updateTenant, updateSiiConfig, uploadCertificado, uploadLogo };
