const productoService = require('../services/productoService');

const getAllProductos = async (req, res) => {
  try {
    const result = await productoService.listProductos(req.tenantId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getProductoById = async (req, res) => {
  try {
    const producto = await productoService.getProducto(req.tenantId, req.params.id);
    res.json({ success: true, data: producto });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const searchProductos = async (req, res) => {
  try {
    const productos = await productoService.searchProductos(req.tenantId, req.query.q);
    res.json({ success: true, data: productos });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const createProducto = async (req, res) => {
  try {
    const producto = await productoService.createProducto(req.tenantId, req.body);
    res.status(201).json({ success: true, data: producto });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const updateProducto = async (req, res) => {
  try {
    const producto = await productoService.updateProducto(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data: producto });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const updateStock = async (req, res) => {
  try {
    const producto = await productoService.updateStock(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data: producto });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const deleteProducto = async (req, res) => {
  try {
    await productoService.deleteProducto(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const syncProductos = async (req, res) => {
  try {
    const { productos } = req.body;
    if (!Array.isArray(productos)) {
      return res.status(400).json({ success: false, error: 'Se esperaba un array de productos' });
    }
    const result = await productoService.syncProductos(req.tenantId, productos);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { getAllProductos, getProductoById, searchProductos, createProducto, updateProducto, updateStock, deleteProducto, syncProductos };
