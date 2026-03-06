const prisma = require('../config/database');

const createEntry = async (data) => {
  return prisma.syncQueue.create({ data });
};

const findPending = async (tenantId) => {
  return prisma.syncQueue.findMany({
    where: { tenantId, status: 'pending' },
    orderBy: { queuedAt: 'asc' }
  });
};

const findById = async (id) => {
  return prisma.syncQueue.findFirst({ where: { id } });
};

const updateStatus = async (id, status, extra = {}) => {
  return prisma.syncQueue.update({
    where: { id },
    data: { status, ...extra }
  });
};

const getStats = async (tenantId) => {
  const stats = await prisma.syncQueue.groupBy({
    by: ['status'],
    where: { tenantId },
    _count: true
  });
  return stats.reduce((acc, s) => { acc[s.status] = s._count; return acc; }, {});
};

module.exports = { createEntry, findPending, findById, updateStatus, getStats };
