const reporteService = require('../services/reporteService');

const ventas = async (req, res) => {
  try {
    const result = await reporteService.reporteVentas(req.tenantId, req.query.desde, req.query.hasta);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const tributario = async (req, res) => {
  try {
    const result = await reporteService.reporteTributario(req.tenantId, req.query.periodo);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const productosMasVendidos = async (req, res) => {
  try {
    const result = await reporteService.productosMasVendidos(req.tenantId, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const clientesRanking = async (req, res) => {
  try {
    const result = await reporteService.clientesRanking(req.tenantId, req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const caja = async (req, res) => {
  try {
    const result = await reporteService.reporteCaja(req.tenantId, req.query.fecha);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const dashboardData = async (req, res) => {
  try {
    const result = await reporteService.dashboard(req.tenantId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { ventas, tributario, productosMasVendidos, clientesRanking, caja, dashboardData };
