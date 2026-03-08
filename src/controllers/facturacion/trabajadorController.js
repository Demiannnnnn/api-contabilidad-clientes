const trabajadorService = require('../../services/facturacion/trabajadorService');

const getAllTrabajadores = async (req, res) => {
  try {
    const result = await trabajadorService.listTrabajadores(req.tenantId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getTrabajadorById = async (req, res) => {
  try {
    const trabajador = await trabajadorService.getTrabajador(req.tenantId, req.params.id);
    res.json({ success: true, data: trabajador });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const searchTrabajadores = async (req, res) => {
  try {
    const trabajadores = await trabajadorService.searchTrabajadores(req.tenantId, req.query.q);
    res.json({ success: true, data: trabajadores });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const createTrabajador = async (req, res) => {
  try {
    const trabajador = await trabajadorService.createTrabajador(req.tenantId, req.body);
    res.status(201).json({ success: true, data: trabajador });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const updateTrabajador = async (req, res) => {
  try {
    const trabajador = await trabajadorService.updateTrabajador(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data: trabajador });
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
    const trabajador = await trabajadorService.toggleActive(req.tenantId, req.params.id);
    res.json({ success: true, data: trabajador });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const deleteTrabajador = async (req, res) => {
  try {
    await trabajadorService.deleteTrabajador(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Trabajador eliminado' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllTrabajadores, getTrabajadorById, searchTrabajadores, createTrabajador, updateTrabajador, toggleActive, deleteTrabajador };
