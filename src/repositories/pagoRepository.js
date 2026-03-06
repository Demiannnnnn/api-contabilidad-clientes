const prisma = require('../config/database');

const findByDocumento = async (tenantId, documentoId) => {
  return prisma.pago.findMany({
    where: { tenantId, documentoId },
    orderBy: { fechaPago: 'desc' }
  });
};

const findById = async (tenantId, id) => {
  return prisma.pago.findFirst({
    where: { id, tenantId },
    include: { documento: { select: { id: true, tipoDocumento: true, folio: true, total: true, estado: true } } }
  });
};

const create = async (data) => {
  return prisma.pago.create({ data });
};

const remove = async (tenantId, id) => {
  const pago = await findById(tenantId, id);
  if (!pago) return null;
  return prisma.pago.delete({ where: { id } });
};

const sumByDocumento = async (documentoId) => {
  const result = await prisma.pago.aggregate({
    where: { documentoId },
    _sum: { monto: true }
  });
  return result._sum.monto || 0;
};

const findCuentasPorCobrar = async (tenantId) => {
  return prisma.documento.findMany({
    where: {
      tenantId,
      estado: { in: ['emitida', 'parcial'] },
      tipoDocumento: { in: [33, 34] } // Facturas
    },
    include: {
      cliente: { select: { id: true, rut: true, razonSocial: true } },
      pagos: true
    },
    orderBy: { fechaVencimiento: 'asc' }
  });
};

module.exports = { findByDocumento, findById, create, remove, sumByDocumento, findCuentasPorCobrar };
