const vinculacionService = require('../../services/core/vinculacionService');

const buscarUsuarios = async (req, res) => {
  try {
    const usuarios = await vinculacionService.buscarUsuarios(req.user.id, req.user.rol, req.query.q);
    res.json({ success: true, data: usuarios });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const enviarSolicitud = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'targetUserId es requerido' });
    }
    const solicitud = await vinculacionService.enviarSolicitud(req.user.id, req.user.rol, parseInt(targetUserId));
    res.status(201).json({ success: true, data: solicitud });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getPendientesRecibidas = async (req, res) => {
  try {
    const solicitudes = await vinculacionService.getPendientesRecibidas(req.user.id);
    res.json({ success: true, data: solicitudes });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getPendientesEnviadas = async (req, res) => {
  try {
    const solicitudes = await vinculacionService.getPendientesEnviadas(req.user.id);
    res.json({ success: true, data: solicitudes });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getVinculosActivos = async (req, res) => {
  try {
    const vinculos = await vinculacionService.getVinculosActivos(req.user.id);
    res.json({ success: true, data: vinculos });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const aceptarSolicitud = async (req, res) => {
  try {
    const solicitud = await vinculacionService.aceptarSolicitud(req.user.id, parseInt(req.params.id));
    res.json({ success: true, data: solicitud });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const rechazarSolicitud = async (req, res) => {
  try {
    const solicitud = await vinculacionService.rechazarSolicitud(req.user.id, parseInt(req.params.id));
    res.json({ success: true, data: solicitud });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const eliminarVinculo = async (req, res) => {
  try {
    const result = await vinculacionService.eliminarVinculo(req.user.id, parseInt(req.params.id));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = {
  buscarUsuarios,
  enviarSolicitud,
  getPendientesRecibidas,
  getPendientesEnviadas,
  getVinculosActivos,
  aceptarSolicitud,
  rechazarSolicitud,
  eliminarVinculo,
};
