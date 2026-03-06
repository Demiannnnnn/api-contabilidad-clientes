const prisma = require('../config/database');

const findAll = async (tenantId, { skip = 0, take = 50, where = {} } = {}) => {
  return prisma.documento.findMany({
    where: { tenantId, ...where },
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      cliente: { select: { id: true, rut: true, razonSocial: true } },
      vendedor: { select: { id: true, nombre: true, apellido: true } },
      _count: { select: { items: true, pagos: true } }
    }
  });
};

const countAll = async (tenantId, where = {}) => {
  return prisma.documento.count({ where: { tenantId, ...where } });
};

const findById = async (tenantId, id) => {
  return prisma.documento.findFirst({
    where: { id, tenantId },
    include: {
      cliente: true,
      vendedor: true,
      items: { orderBy: { numeroLinea: 'asc' }, include: { producto: { select: { id: true, codigo: true, nombre: true } } } },
      referencias: true,
      pagos: true
    }
  });
};

const findByFolio = async (tenantId, tipoDocumento, folio) => {
  return prisma.documento.findFirst({
    where: { tenantId, tipoDocumento, folio }
  });
};

const create = async (data, items = [], referencias = []) => {
  return prisma.$transaction(async (tx) => {
    const documento = await tx.documento.create({ data });

    if (items.length > 0) {
      await tx.documentoItem.createMany({
        data: items.map(item => ({ ...item, documentoId: documento.id }))
      });
    }

    if (referencias.length > 0) {
      await tx.referenciaDocumento.createMany({
        data: referencias.map(ref => ({ ...ref, documentoId: documento.id }))
      });
    }

    return tx.documento.findFirst({
      where: { id: documento.id },
      include: {
        items: { orderBy: { numeroLinea: 'asc' } },
        referencias: true,
        cliente: true,
        vendedor: true
      }
    });
  });
};

const update = async (tenantId, id, data, items = null, referencias = null) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.documento.findFirst({ where: { id, tenantId } });
    if (!existing) return null;

    const documento = await tx.documento.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });

    if (items !== null) {
      await tx.documentoItem.deleteMany({ where: { documentoId: id } });
      if (items.length > 0) {
        await tx.documentoItem.createMany({
          data: items.map(item => ({ ...item, documentoId: id }))
        });
      }
    }

    if (referencias !== null) {
      await tx.referenciaDocumento.deleteMany({ where: { documentoId: id } });
      if (referencias.length > 0) {
        await tx.referenciaDocumento.createMany({
          data: referencias.map(ref => ({ ...ref, documentoId: id }))
        });
      }
    }

    return tx.documento.findFirst({
      where: { id },
      include: {
        items: { orderBy: { numeroLinea: 'asc' } },
        referencias: true,
        cliente: true,
        vendedor: true,
        pagos: true
      }
    });
  });
};

const updateEstado = async (tenantId, id, estado) => {
  const doc = await prisma.documento.findFirst({ where: { id, tenantId } });
  if (!doc) return null;
  return prisma.documento.update({
    where: { id },
    data: { estado, updatedAt: new Date() }
  });
};

const updateSiiStatus = async (id, siiData) => {
  return prisma.documento.update({
    where: { id },
    data: { ...siiData, updatedAt: new Date() }
  });
};

const remove = async (tenantId, id) => {
  const doc = await prisma.documento.findFirst({ where: { id, tenantId } });
  if (!doc) return null;
  return prisma.documento.delete({ where: { id } });
};

// Aggregations for reports
const sumByPeriod = async (tenantId, desde, hasta, where = {}) => {
  return prisma.documento.aggregate({
    where: {
      tenantId,
      fechaEmision: { gte: new Date(desde), lte: new Date(hasta) },
      estado: { notIn: ['anulada', 'rechazada', 'borrador'] },
      ...where
    },
    _sum: { subtotal: true, iva: true, total: true, montoExento: true },
    _count: true
  });
};

const groupByTipo = async (tenantId, desde, hasta) => {
  return prisma.documento.groupBy({
    by: ['tipoDocumento'],
    where: {
      tenantId,
      fechaEmision: { gte: new Date(desde), lte: new Date(hasta) },
      estado: { notIn: ['anulada', 'rechazada', 'borrador'] }
    },
    _sum: { total: true },
    _count: true
  });
};

const groupByEstado = async (tenantId) => {
  return prisma.documento.groupBy({
    by: ['estado'],
    where: { tenantId },
    _count: true
  });
};

const findPendingSync = async (tenantId) => {
  return prisma.documento.findMany({
    where: { tenantId, syncStatus: 'pending' },
    orderBy: { queuedAt: 'asc' }
  });
};

module.exports = {
  findAll, countAll, findById, findByFolio, create, update, updateEstado,
  updateSiiStatus, remove, sumByPeriod, groupByTipo, groupByEstado, findPendingSync
};
