const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) {
      response.errors = error.errors;
      response.error = 'Error de validación';
    } else {
      response.error = error.message || 'Error al registrar';
    }
    res.status(status).json(response);
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message || 'Error al iniciar sesión' });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, ...result });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message || 'Error renovando token' });
  }
};

const logout = async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al cerrar sesión' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) {
      response.errors = error.errors;
      response.error = 'Error de validación';
    } else {
      response.error = error.message || 'Error al cambiar contraseña';
    }
    res.status(status).json(response);
  }
};

module.exports = { register, login, refresh, logout, getProfile, changePassword };
