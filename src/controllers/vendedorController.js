const vendedorService = require('../services/vendedorService');

const getAllVendedores = async (req, res) => {
  try {
    const result = await vendedorService.listVendedores(req.tenantId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getVendedorById = async (req, res) => {
  try {
    const vendedor = await vendedorService.getVendedor(req.tenantId, req.params.id);
    res.json({ success: true, data: vendedor });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const searchVendedores = async (req, res) => {
  try {
    const vendedores = await vendedorService.searchVendedores(req.tenantId, req.query.q);
    res.json({ success: true, data: vendedores });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const createVendedor = async (req, res) => {
  try {
    const vendedor = await vendedorService.createVendedor(req.tenantId, req.body);
    res.status(201).json({ success: true, data: vendedor });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const updateVendedor = async (req, res) => {
  try {
    const vendedor = await vendedorService.updateVendedor(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data: vendedor });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const toggleActive = async (req, res) => {
  try {
    const vendedor = await vendedorService.toggleActive(req.tenantId, req.params.id);
    res.json({ success: true, data: vendedor });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const deleteVendedor = async (req, res) => {
  try {
    await vendedorService.deleteVendedor(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Vendedor eliminado' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllVendedores, getVendedorById, searchVendedores, createVendedor, updateVendedor, toggleActive, deleteVendedor };
