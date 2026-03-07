const prisma = require('../config/database');

// SyncQueue model doesn't exist in schema yet — stubs
const createEntry = async (data) => {
  console.warn('[SyncRepository] SyncQueue model not in schema yet');
  return { id: Date.now(), ...data };
};

const findPending = async (tenantId) => {
  return [];
};

const findById = async (id) => {
  return null;
};

const updateStatus = async (id, status, extra = {}) => {
  return null;
};

const getStats = async (tenantId) => {
  return {};
};

module.exports = { createEntry, findPending, findById, updateStatus, getStats };
