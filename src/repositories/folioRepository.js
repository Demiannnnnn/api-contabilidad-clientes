const prisma = require('../config/database');

const findAll = async (tenantId, where = {}) => {
  return prisma.folioCaf.findMany({
    where: { tenantId, ...where },
    orderBy: [{ tipoDocumento: 'asc' }, { desde: 'asc' }]
  });
};

const findById = async (tenantId, id) => {
  return prisma.folioCaf.findFirst({ where: { id, tenantId } });
};

const findActive = async (tenantId, tipoDocumento) => {
  return prisma.folioCaf.findFirst({
    where: { tenantId, tipoDocumento, estado: 'activo' },
    orderBy: { desde: 'asc' }
  });
};

const create = async (data) => {
  return prisma.folioCaf.create({ data });
};

const update = async (id, data) => {
  return prisma.folioCaf.update({ where: { id }, data: { ...data, updatedAt: new Date() } });
};

const incrementActual = async (id) => {
  return prisma.folioCaf.update({
    where: { id },
    data: { actual: { increment: 1 }, updatedAt: new Date() }
  });
};

module.exports = { findAll, findById, findActive, create, update, incrementActual };
