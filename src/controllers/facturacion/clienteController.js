const clienteService = require('../../services/facturacion/clienteService');

const getAllClientes = async (req, res) => {
  try {
    const result = await clienteService.listClientes(req.userId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getClienteById = async (req, res) => {
  try {
    const cliente = await clienteService.getCliente(req.userId, req.params.id);
    res.json({ success: true, data: cliente });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const searchClientes = async (req, res) => {
  try {
    const clientes = await clienteService.searchClientes(req.userId, req.query.q);
    res.json({ success: true, data: clientes });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const createCliente = async (req, res) => {
  try {
    const cliente = await clienteService.createCliente(req.userId, req.body);
    res.status(201).json({ success: true, data: cliente });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const updateCliente = async (req, res) => {
  try {
    const cliente = await clienteService.updateCliente(req.userId, req.params.id, req.body);
    res.json({ success: true, data: cliente });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const deleteCliente = async (req, res) => {
  try {
    await clienteService.deleteCliente(req.userId, req.params.id);
    res.json({ success: true, message: 'Cliente eliminado' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getEstadoCuenta = async (req, res) => {
  try {
    const data = await clienteService.getEstadoCuenta(req.userId, req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const syncClientes = async (req, res) => {
  try {
    const { clientes } = req.body;
    if (!Array.isArray(clientes)) {
      return res.status(400).json({ success: false, error: 'Se esperaba un array de clientes' });
    }
    const result = await clienteService.syncClientes(req.userId, clientes);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllClientes, getClienteById, searchClientes, createCliente, updateCliente, deleteCliente, getEstadoCuenta, syncClientes };
