const trabajadorRepository = require('../../repositories/facturacion/trabajadorRepository');
const { validate, trabajadorSchema, trabajadorUpdateSchema } = require('../core/validationService');
const { generateSyncHash, parsePagination } = require('../../utils/helpers');
const { sanitizeEmail } = require('../../utils/helpers');
const { limpiarRut } = require('../../utils/helpers');
const userRepository = require('../../repositories/core/userRepository');
const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

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
  const email = sanitizeEmail(validated.email);
  const rut = limpiarRut(validated.rut);
  const activo = validated.activo !== undefined ? validated.activo : true;

  const existingTrabajador = await trabajadorRepository.findByEmail(tenantId, email);
  if (existingTrabajador) {
    const error = new Error('Ya existe un trabajador con este email');
    error.status = 409;
    throw error;
  }

  const existingTrabajadorRut = await trabajadorRepository.findByRut(tenantId, rut);
  if (existingTrabajadorRut) {
    const error = new Error('Ya existe un trabajador con este RUT');
    error.status = 409;
    throw error;
  }

  const existingUser = await userRepository.findByEmail(tenantId, email);
  if (existingUser) {
    const error = new Error('Ya existe un usuario con este email');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);

  return prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        email,
        passwordHash,
        rut,
        nombre: validated.nombre,
        rol: 'trabajador',
        permisos: JSON.stringify({}),
        activo,
        duenoId: tenantId,
      },
    });

    return tx.trabajador.create({
      data: {
        userId: tenantId,
        nombre: validated.nombre,
        rut,
        cargo: validated.cargo || null,
        email,
        passwordHash,
        activo,
      },
    });
  });
};

const updateTrabajador = async (tenantId, id, data) => {
  const validated = validate(trabajadorUpdateSchema, data);

  const existing = await trabajadorRepository.findById(tenantId, id);
  if (!existing) {
    const error = new Error('Trabajador no encontrado');
    error.status = 404;
    throw error;
  }

  const normalizedEmail = validated.email ? sanitizeEmail(validated.email) : undefined;
  const normalizedRut = validated.rut ? limpiarRut(validated.rut) : undefined;

  if (normalizedEmail && normalizedEmail !== existing.email) {
    const emailExists = await trabajadorRepository.findByEmail(tenantId, normalizedEmail);
    if (emailExists) {
      const error = new Error('Ya existe un trabajador con este email');
      error.status = 409;
      throw error;
    }

    const userEmailExists = await userRepository.findByEmail(tenantId, normalizedEmail);
    if (userEmailExists) {
      const error = new Error('Ya existe un usuario con este email');
      error.status = 409;
      throw error;
    }
  }

  if (normalizedRut && normalizedRut !== existing.rut) {
    const rutExists = await trabajadorRepository.findByRut(tenantId, normalizedRut);
    if (rutExists) {
      const error = new Error('Ya existe un trabajador con este RUT');
      error.status = 409;
      throw error;
    }
  }

  const updateData = {};
  if (validated.nombre !== undefined) updateData.nombre = validated.nombre;
  if (normalizedRut !== undefined) updateData.rut = normalizedRut;
  if (validated.cargo !== undefined) updateData.cargo = validated.cargo;
  if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
  if (validated.activo !== undefined) updateData.activo = validated.activo;
  if (validated.password) {
    updateData.passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);
  }

  const updatedTrabajador = await trabajadorRepository.update(tenantId, id, updateData);

  const linkedUser = await prisma.user.findFirst({
    where: {
      duenoId: tenantId,
      rol: 'trabajador',
      email: { equals: existing.email || '', mode: 'insensitive' },
    },
  });

  if (linkedUser) {
    const userUpdate = {};
    if (normalizedEmail !== undefined) userUpdate.email = normalizedEmail;
    if (validated.nombre !== undefined) userUpdate.nombre = validated.nombre;
    if (validated.activo !== undefined) userUpdate.activo = validated.activo;
    if (validated.password) {
      userUpdate.passwordHash = await bcrypt.hash(validated.password, SALT_ROUNDS);
    }

    if (Object.keys(userUpdate).length > 0) {
      await prisma.user.update({ where: { id: linkedUser.id }, data: userUpdate });
    }
  }

  return updatedTrabajador;
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
