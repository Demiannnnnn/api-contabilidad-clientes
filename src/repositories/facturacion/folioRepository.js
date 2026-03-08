const prisma = require('../../config/database');

// FolioCaf model doesn't exist in schema yet — stubs
const findAll = async (tenantId, where = {}) => {
  return [];
};

const findById = async (tenantId, id) => {
  return null;
};

const findActive = async (tenantId, tipoDocumento) => {
  return null;
};

const create = async (data) => {
  console.warn('[FolioRepository] FolioCaf model not in schema yet');
  return data;
};

const update = async (id, data) => {
  return null;
};

const incrementActual = async (id) => {
  return null;
};

module.exports = { findAll, findById, findActive, create, update, incrementActual };
