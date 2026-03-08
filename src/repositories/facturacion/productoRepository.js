const prisma = require('../../config/database');

class ProductoRepository {
  async findAll(tenantId, { skip, limit } = {}) {
    return prisma.producto.findMany({
      where: { userId: tenantId },
      orderBy: { createdAt: 'desc' },
      skip: skip || 0,
      take: limit || 50,
    });
  }

  async countAll(tenantId) {
    return prisma.producto.count({ where: { userId: tenantId } });
  }

  async findById(tenantId, id) {
    return prisma.producto.findFirst({ where: { id, userId: tenantId } });
  }

  async findByCodigo(tenantId, codigo) {
    return prisma.producto.findFirst({ where: { userId: tenantId, codigo } });
  }

  async search(tenantId, q) {
    return prisma.producto.findMany({
      where: {
        userId: tenantId,
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { codigo: { contains: q, mode: 'insensitive' } },
          { descripcion: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 50,
    });
  }

  async create(data) {
    return prisma.producto.create({ data });
  }

  async update(tenantId, id, data) {
    return prisma.producto.update({ where: { id }, data });
  }

  async delete(tenantId, id) {
    return prisma.producto.delete({ where: { id } });
  }
}

module.exports = new ProductoRepository();
