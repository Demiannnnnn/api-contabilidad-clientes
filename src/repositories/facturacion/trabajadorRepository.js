const prisma = require('../../config/database');

const findAll = async (tenantId, { skip = 0, take = 50, where = {} } = {}) => {
  return prisma.trabajador.findMany({
    where: { userId: tenantId, ...where },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
};

const countAll = async (tenantId, where = {}) => {
  return prisma.trabajador.count({ where: { userId: tenantId, ...where } });
};

const findById = async (tenantId, id) => {
  return prisma.trabajador.findFirst({
    where: { id, userId: tenantId },
  });
};

const findByEmail = async (tenantId, email) => {
  return prisma.trabajador.findFirst({ where: { userId: tenantId, email } });
};

const search = async (tenantId, query) => {
  return prisma.trabajador.findMany({
    where: {
      userId: tenantId,
      OR: [
        { nombre: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 20,
    orderBy: { nombre: 'asc' }
  });
};

const create = async (data) => {
  return prisma.trabajador.create({ data });
};

const update = async (tenantId, id, data) => {
  const trabajador = await findById(tenantId, id);
  if (!trabajador) return null;
  return prisma.trabajador.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
};

const remove = async (tenantId, id) => {
  const trabajador = await findById(tenantId, id);
  if (!trabajador) return null;
  return prisma.trabajador.delete({ where: { id } });
};

module.exports = { findAll, countAll, findById, findByEmail, search, create, update, remove };
