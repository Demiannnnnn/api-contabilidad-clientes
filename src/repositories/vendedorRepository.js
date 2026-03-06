const prisma = require('../config/database');

const findAll = async (tenantId, { skip = 0, take = 50, where = {} } = {}) => {
  return prisma.vendedor.findMany({
    where: { tenantId, ...where },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { documentos: true } } }
  });
};

const countAll = async (tenantId, where = {}) => {
  return prisma.vendedor.count({ where: { tenantId, ...where } });
};

const findById = async (tenantId, id) => {
  return prisma.vendedor.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { documentos: true } } }
  });
};

const findByEmail = async (tenantId, email) => {
  return prisma.vendedor.findFirst({ where: { tenantId, email } });
};

const search = async (tenantId, query) => {
  return prisma.vendedor.findMany({
    where: {
      tenantId,
      OR: [
        { nombre: { contains: query, mode: 'insensitive' } },
        { apellido: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 20,
    orderBy: { nombre: 'asc' }
  });
};

const create = async (data) => {
  return prisma.vendedor.create({ data });
};

const update = async (tenantId, id, data) => {
  const vendedor = await findById(tenantId, id);
  if (!vendedor) return null;
  return prisma.vendedor.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
};

const remove = async (tenantId, id) => {
  const vendedor = await findById(tenantId, id);
  if (!vendedor) return null;
  return prisma.vendedor.delete({ where: { id } });
};

module.exports = { findAll, countAll, findById, findByEmail, search, create, update, remove };
