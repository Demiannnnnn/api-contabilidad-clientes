const vendedorRepository = require('../repositories/vendedorRepository');
const { validate, vendedorSchema, vendedorUpdateSchema } = require('./validationService');
const { generateSyncHash, parsePagination } = require('../utils/helpers');

const listVendedores = async (tenantId, query) => {
  const { skip, take, page, limit } = parsePagination(query);
  const where = {};
  if (query.activo !== undefined) where.activo = query.activo === 'true';

  const [vendedores, total] = await Promise.all([
    vendedorRepository.findAll(tenantId, { skip, take, where }),
    vendedorRepository.countAll(tenantId, where)
  ]);

  return {
    data: vendedores,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  };
};

const getVendedor = async (tenantId, id) => {
  const vendedor = await vendedorRepository.findById(tenantId, id);
  if (!vendedor) {
    const error = new Error('Vendedor no encontrado');
    error.status = 404;
    throw error;
  }
  return vendedor;
};

const searchVendedores = async (tenantId, query) => {
  if (!query || query.length < 2) {
    const error = new Error('La búsqueda debe tener al menos 2 caracteres');
    error.status = 400;
    throw error;
  }
  return vendedorRepository.search(tenantId, query);
};

const createVendedor = async (tenantId, data) => {
  const validated = validate(vendedorSchema, data);

  if (validated.email) {
    const existing = await vendedorRepository.findByEmail(tenantId, validated.email);
    if (existing) {
      const error = new Error('Ya existe un vendedor con este email');
      error.status = 409;
      throw error;
    }
  }

  const vendedorData = {
    userId: tenantId,
    nombre: validated.nombre,
    rut: validated.rut || '',
    cargo: validated.cargo || null,
    email: validated.email || null,
    activo: validated.activo !== undefined ? validated.activo : true,
  };

  return vendedorRepository.create(vendedorData);
};

const updateVendedor = async (tenantId, id, data) => {
  const validated = validate(vendedorUpdateSchema, data);

  const existing = await vendedorRepository.findById(tenantId, id);
  if (!existing) {
    const error = new Error('Vendedor no encontrado');
    error.status = 404;
    throw error;
  }

  if (validated.email && validated.email !== existing.email) {
    const emailExists = await vendedorRepository.findByEmail(tenantId, validated.email);
    if (emailExists) {
      const error = new Error('Ya existe un vendedor con este email');
      error.status = 409;
      throw error;
    }
  }

  const updateData = {};
  if (validated.nombre !== undefined) updateData.nombre = validated.nombre;
  if (validated.apellido !== undefined) updateData.apellido = validated.apellido;
  if (validated.email !== undefined) updateData.email = validated.email;
  if (validated.telefono !== undefined) updateData.telefono = validated.telefono;
  if (validated.comision !== undefined) updateData.comision = validated.comision;
  if (validated.activo !== undefined) updateData.activo = validated.activo;
  updateData.syncHash = generateSyncHash({ ...existing, ...updateData });

  return vendedorRepository.update(tenantId, id, updateData);
};

const toggleActive = async (tenantId, id) => {
  const vendedor = await vendedorRepository.findById(tenantId, id);
  if (!vendedor) {
    const error = new Error('Vendedor no encontrado');
    error.status = 404;
    throw error;
  }
  return vendedorRepository.update(tenantId, id, { activo: !vendedor.activo });
};

const deleteVendedor = async (tenantId, id) => {
  const vendedor = await vendedorRepository.findById(tenantId, id);
  if (!vendedor) {
    const error = new Error('Vendedor no encontrado');
    error.status = 404;
    throw error;
  }
  if (vendedor._count && vendedor._count.documentos > 0) {
    const error = new Error('No se puede eliminar un vendedor con documentos asociados');
    error.status = 409;
    throw error;
  }
  return vendedorRepository.remove(tenantId, id);
};

module.exports = { listVendedores, getVendedor, searchVendedores, createVendedor, updateVendedor, toggleActive, deleteVendedor };
