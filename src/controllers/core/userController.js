const userService = require('../../services/core/userService');

const listUsers = async (req, res) => {
  try {
    const users = await userService.listUsers(req.tenantId);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await userService.getUser(req.tenantId, req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const user = await userService.createUser(req.tenantId, req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    const status = error.status || 500;
    const response = { success: false };
    if (error.errors) { response.errors = error.errors; response.error = 'Error de validación'; }
    else { response.error = error.message; }
    res.status(status).json(response);
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.tenantId, req.params.id, req.body);
    res.json({ success: true, data: user });
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
    const user = await userService.toggleActive(req.tenantId, req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const changeUserPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Contraseña debe tener mínimo 8 caracteres' });
    }
    await userService.changeUserPassword(req.tenantId, req.params.id, password);
    res.json({ success: true, message: 'Contraseña cambiada' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const { permisos } = req.body;
    const user = await userService.updatePermissions(req.tenantId, req.params.id, permisos);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.tenantId, req.params.id);
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { listUsers, getUser, createUser, updateUser, toggleActive, changeUserPassword, updatePermissions, deleteUser };
