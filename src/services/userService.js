const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');
const { validate, schemas } = require('./validationService');
const { sanitizeEmail, limpiarRut } = require('../utils/helpers');

const SALT_ROUNDS = 10;

class UserService {
  async listUsers(tenantId) {
    return userRepository.findAll(tenantId);
  }

  async getUser(tenantId, id) {
    const user = await userRepository.findById(tenantId, id);
    if (!user) {
      const err = new Error('Usuario no encontrado');
      err.status = 404;
      throw err;
    }
    return user;
  }

  async createUser(tenantId, data) {
    const validated = validate(schemas.createUser, data);
    const email = sanitizeEmail(validated.email);

    // Check duplicate email
    const existing = await userRepository.findByEmail(tenantId, email);
    if (existing) {
      const err = new Error('Ya existe un usuario con ese email');
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);

    return userRepository.create({
      email,
      passwordHash,
      nombre: validated.nombre,
      rut: validated.rut ? limpiarRut(validated.rut) : null,
      rol: validated.rol,
      permisos: typeof validated.permisos === 'object' ? JSON.stringify(validated.permisos) : validated.permisos || '{}',
    });
  }

  async updateUser(tenantId, id, data) {
    await this.getUser(tenantId, id); // verify exists
    const validated = validate(schemas.updateUser, data);

    const updateData = {};
    if (validated.email) updateData.email = sanitizeEmail(validated.email);
    if (validated.nombre) updateData.nombre = validated.nombre;
    if (validated.rut) updateData.rut = limpiarRut(validated.rut);
    if (validated.rol) updateData.rol = validated.rol;
    if (validated.permisos) updateData.permisos = validated.permisos;

    return userRepository.update(tenantId, id, updateData);
  }

  async toggleActive(tenantId, id) {
    const user = await this.getUser(tenantId, id);
    if (user.rol === 'dueño') {
      const err = new Error('No se puede desactivar al dueño');
      err.status = 400;
      throw err;
    }
    return userRepository.update(tenantId, id, { activo: !user.activo });
  }

  async changeUserPassword(tenantId, id, newPassword) {
    await this.getUser(tenantId, id);
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return userRepository.update(tenantId, id, { passwordHash });
  }

  async updatePermissions(tenantId, id, permisos) {
    await this.getUser(tenantId, id);
    return userRepository.update(tenantId, id, { permisos });
  }

  async deleteUser(tenantId, id) {
    const user = await this.getUser(tenantId, id);
    if (user.rol === 'dueño') {
      const err = new Error('No se puede eliminar al dueño');
      err.status = 400;
      throw err;
    }
    return userRepository.delete(tenantId, id);
  }
}

module.exports = new UserService();
