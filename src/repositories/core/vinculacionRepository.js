const prisma = require('../../config/database');

class VinculacionRepository {
  /**
   * Buscar usuarios por nombre y/o rut, filtrado por rol
   */
  async buscarUsuarios(q, rol) {
    return prisma.user.findMany({
      where: {
        rol,
        activo: true,
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { rut: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        rut: true,
        nombre: true,
        rol: true,
      },
      take: 20,
    });
  }

  /**
   * Crear solicitud de vinculación
   */
  async crearSolicitud({ contadorId, clienteId, solicitadoPor }) {
    return prisma.contadorCliente.create({
      data: { contadorId, clienteId, solicitadoPor, estado: 'pendiente' },
      include: {
        contador: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
        cliente: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
      },
    });
  }

  /**
   * Buscar solicitud existente entre contador y cliente (cualquier estado)
   */
  async findExistente(contadorId, clienteId) {
    return prisma.contadorCliente.findFirst({
      where: { contadorId, clienteId },
    });
  }

  /**
   * Buscar solicitud por ID
   */
  async findById(id) {
    return prisma.contadorCliente.findFirst({
      where: { id },
      include: {
        contador: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
        cliente: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
      },
    });
  }

  /**
   * Solicitudes pendientes recibidas por un usuario
   */
  async findPendientesRecibidas(userId) {
    return prisma.contadorCliente.findMany({
      where: {
        estado: 'pendiente',
        OR: [
          { contadorId: userId, NOT: { solicitadoPor: userId } },
          { clienteId: userId, NOT: { solicitadoPor: userId } },
        ],
      },
      include: {
        contador: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
        cliente: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Solicitudes pendientes enviadas por un usuario
   */
  async findPendientesEnviadas(userId) {
    return prisma.contadorCliente.findMany({
      where: {
        estado: 'pendiente',
        solicitadoPor: userId,
      },
      include: {
        contador: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
        cliente: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Vínculos activos (aceptados) de un usuario
   */
  async findActivas(userId) {
    return prisma.contadorCliente.findMany({
      where: {
        estado: 'aceptada',
        OR: [
          { contadorId: userId },
          { clienteId: userId },
        ],
      },
      include: {
        contador: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
        cliente: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Actualizar estado de una solicitud
   */
  async updateEstado(id, estado) {
    return prisma.contadorCliente.update({
      where: { id },
      data: { estado },
      include: {
        contador: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
        cliente: { select: { id: true, nombre: true, rut: true, email: true, rol: true } },
      },
    });
  }

  /**
   * Eliminar vinculación
   */
  async delete(id) {
    return prisma.contadorCliente.delete({ where: { id } });
  }
}

module.exports = new VinculacionRepository();
