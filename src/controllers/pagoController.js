const pagoService = require('../services/pagoService');

const getPagosByDocumento = async (req, res) => {
  try {
    const result = await pagoService.getPagosByDocumento(req.tenantId, req.params.docId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const createPago = async (req, res) => {
  try {
    const pago = await pagoService.createPago(req.tenantId, req.body);
    res.status(201).json({ success: true, data: pago });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const deletePago = async (req, res) => {
  try {
    await pagoService.deletePago(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Pago eliminado' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getCuentasPorCobrar = async (req, res) => {
  try {
    const result = await pagoService.getCuentasPorCobrar(req.tenantId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const syncPagos = async (req, res) => {
  try {
    const { pagos } = req.body;
    if (!Array.isArray(pagos)) return res.status(400).json({ success: false, error: 'Se esperaba un array de pagos' });
    const result = await pagoService.syncPagos(req.tenantId, pagos);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { getPagosByDocumento, createPago, deletePago, getCuentasPorCobrar, syncPagos };
