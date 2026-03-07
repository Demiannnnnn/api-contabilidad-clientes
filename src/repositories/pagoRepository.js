const prisma = require('../config/database');

const findByDocumento = async (tenantId, documentoId) => {
  // Pago model doesn't exist yet — stub
  return [];
};

const findById = async (tenantId, id) => {
  return null;
};

const create = async (data) => {
  // Pago model doesn't exist yet — stub
  console.warn('[PagoRepository] Pago model not in schema yet');
  return data;
};

const remove = async (tenantId, id) => {
  return null;
};

const sumByDocumento = async (documentoId) => {
  return 0;
};

const findCuentasPorCobrar = async (tenantId) => {
  return [];
};

module.exports = { findByDocumento, findById, create, remove, sumByDocumento, findCuentasPorCobrar };
