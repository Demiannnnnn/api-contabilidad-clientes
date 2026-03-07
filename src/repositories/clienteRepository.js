const prisma = require('../config/database');

class ClienteRepository {
  async findAll(userId, { skip, limit } = {}) {
    return prisma.cliente.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: skip || 0,
      take: limit || 50,
    });
  }

  async countAll(userId) {
    return prisma.cliente.count({ where: { userId } });
  }

  async findById(userId, id) {
    return prisma.cliente.findFirst({
      where: { id, userId },
      include: { documentos: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
  }

  async findByRut(userId, rut) {
    return prisma.cliente.findFirst({ where: { userId, rut } });
  }

  async search(userId, q) {
    return prisma.cliente.findMany({
      where: {
        userId,
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

  async update(userId, id, data) {
    return prisma.cliente.update({ where: { id }, data });
  }

  async delete(userId, id) {
    return prisma.cliente.delete({ where: { id } });
  }

  async createMany(userId, clientes) {
    return prisma.cliente.createMany({ data: clientes.map(c => ({ ...c, userId })) });
  }
}

module.exports = new ClienteRepository();
