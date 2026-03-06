const prisma = require('../config/database');

class UserRepository {
  async findAll(tenantId) {
    return prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, tenantId: true, email: true, rut: true, nombre: true,
        rol: true, permisos: true, activo: true, ultimoAcceso: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async findById(tenantId, id) {
    return prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        id: true, tenantId: true, email: true, rut: true, nombre: true,
        rol: true, permisos: true, activo: true, ultimoAcceso: true,
        createdAt: true, updatedAt: true,
      },
    });
  }

  async findByEmail(tenantId, email) {
    return prisma.user.findFirst({
      where: { tenantId, email: { equals: email, mode: 'insensitive' } },
    });
  }

  async create(data) {
    return prisma.user.create({
      data,
      select: {
        id: true, tenantId: true, email: true, rut: true, nombre: true,
        rol: true, permisos: true, activo: true, createdAt: true,
      },
    });
  }

  async update(tenantId, id, data) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, tenantId: true, email: true, rut: true, nombre: true,
        rol: true, permisos: true, activo: true, updatedAt: true,
      },
    });
  }

  async delete(tenantId, id) {
    return prisma.user.delete({ where: { id } });
  }

  async countByTenant(tenantId) {
    return prisma.user.count({ where: { tenantId } });
  }
}

module.exports = new UserRepository();
