const prisma = require('../config/database');

class ClienteRepository {
  async findAll(tenantId, { skip, limit } = {}) {
    return prisma.cliente.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip: skip || 0,
      take: limit || 50,
    });
  }

  async countAll(tenantId) {
    return prisma.cliente.count({ where: { tenantId } });
  }

  async findById(tenantId, id) {
    return prisma.cliente.findFirst({
      where: { id, tenantId },
      include: { documentos: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async findByRut(tenantId, rut) {
    return prisma.cliente.findFirst({ where: { tenantId, rut } });
  }

  async search(tenantId, q) {
    return prisma.cliente.findMany({
      where: {
        tenantId,
        OR: [
          { razonSocial: { contains: q, mode: 'insensitive' } },
          { rut: { contains: q, mode: 'insensitive' } },
          { nombreFantasia: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 50,
    });
  }

  async create(data) {
    return prisma.cliente.create({ data });
  }

  async update(tenantId, id, data) {
    return prisma.cliente.update({ where: { id }, data });
  }

  async delete(tenantId, id) {
    return prisma.cliente.delete({ where: { id } });
  }

  async createMany(tenantId, clientes) {
    return prisma.cliente.createMany({ data: clientes.map(c => ({ ...c, tenantId })) });
  }
}

module.exports = new ClienteRepository();
