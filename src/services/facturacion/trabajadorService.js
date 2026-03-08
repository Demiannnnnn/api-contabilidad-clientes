const trabajadorRepository = require('../../repositories/facturacion/trabajadorRepository');
const { validate, trabajadorSchema, trabajadorUpdateSchema } = require('../core/validationService');
const { generateSyncHash, parsePagination } = require('../../utils/helpers');

const listTrabajadores = async (tenantId, query) => {
  const { skip, take, page, limit } = parsePagination(query);
  const where = {};
  if (query.activo !== undefined) where.activo = query.activo === 'true';

  const [trabajadores, total] = await Promise.all([
    trabajadorRepository.findAll(tenantId, { skip, take, where }),
    trabajadorRepository.countAll(tenantId, where)
  ]);

  return {
    data: trabajadores,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  };
};

const getTrabajador = async (tenantId, id) => {
  const trabajador = await trabajadorRepository.findById(tenantId, id);
  if (!trabajador) {
    const error = new Error('Trabajador no encontrado');
    error.status = 404;
    throw error;
  }
  return trabajador;
};

const searchTrabajadores = async (tenantId, query) => {
  if (!query || query.length < 2) {
    const error = new Error('La búsqueda debe tener al menos 2 caracteres');
    error.status = 400;
    throw error;
  }
  return trabajadorRepository.search(tenantId, query);
};

const createTrabajador = async (tenantId, data) => {
  const validated = validate(trabajadorSchema, data);

  if (validated.email) {
    const existing = await trabajadorRepository.findByEmail(tenantId, validated.email);
    if (existing) {
      const error = new Error('Ya existe un trabajador con este email');
      error.status = 409;
      throw error;
    }
  }

  const trabajadorData = {
    userId: tenantId,
    nombre: validated.nombre,
    rut: validated.rut || '',
    cargo: validated.cargo || null,
    email: validated.email || null,
    activo: validated.activo !== undefined ? validated.activo : true,
  };

  return trabajadorRepository.create(trabajadorData);
};

const updateTrabajador = async (tenantId, id, data) => {
  const validated = validate(trabajadorUpdateSchema, data);

  const existing = await trabajadorRepository.findById(tenantId, id);
  if (!existing) {
    const error = new Error('Trabajador no encontrado');
    error.status = 404;
    throw error;
  }

  if (validated.email && validated.email !== existing.email) {
    const emailExists = await trabajadorRepository.findByEmail(tenantId, validated.email);
    if (emailExists) {
      const error = new Error('Ya existe un trabajador con este email');
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

  return trabajadorRepository.update(tenantId, id, updateData);
};

const toggleActive = async (tenantId, id) => {
  const trabajador = await trabajadorRepository.findById(tenantId, id);
  if (!trabajador) {
    const error = new Error('Trabajador no encontrado');
    error.status = 404;
    throw error;
  }
  return trabajadorRepository.update(tenantId, id, { activo: !trabajador.activo });
};

const deleteTrabajador = async (tenantId, id) => {
  const trabajador = await trabajadorRepository.findById(tenantId, id);
  if (!trabajador) {
    const error = new Error('Trabajador no encontrado');
    error.status = 404;
    throw error;
  }
  if (trabajador._count && trabajador._count.documentos > 0) {
    const error = new Error('No se puede eliminar un trabajador con documentos asociados');
    error.status = 409;
    throw error;
  }
  return trabajadorRepository.remove(tenantId, id);
};

module.exports = { listTrabajadores, getTrabajador, searchTrabajadores, createTrabajador, updateTrabajador, toggleActive, deleteTrabajador };
