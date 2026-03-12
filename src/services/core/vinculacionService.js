const vinculacionRepository = require('../../repositories/core/vinculacionRepository');
const logger = require('../../utils/logger');

const ROLES_PERMITIDOS = ['contador', 'dueño'];

class VinculacionService {
  /**
   * Buscar usuarios para vincular.
   * - Si quien busca es contador → busca dueños
   * - Si quien busca es dueño → busca contadores
   */
  async buscarUsuarios(userId, rol, q) {
    if (!q || q.trim().length < 2) {
      const err = new Error('Búsqueda debe tener al menos 2 caracteres');
      err.status = 400;
      throw err;
    }

    if (!ROLES_PERMITIDOS.includes(rol)) {
      const err = new Error('Solo contadores y dueños pueden buscar vinculaciones');
      err.status = 403;
      throw err;
    }

    // Busca el rol opuesto
    const rolBuscado = rol === 'contador' ? 'dueño' : 'contador';
    const usuarios = await vinculacionRepository.buscarUsuarios(q.trim(), rolBuscado);

    // Excluir al propio usuario de resultados
    return usuarios.filter(u => u.id !== userId);
  }

  /**
   * Enviar solicitud de vinculación
   */
  async enviarSolicitud(userId, rol, targetUserId) {
    if (!ROLES_PERMITIDOS.includes(rol)) {
      const err = new Error('Solo contadores y dueños pueden enviar solicitudes');
      err.status = 403;
      throw err;
    }

    if (userId === targetUserId) {
      const err = new Error('No puedes vincularte contigo mismo');
      err.status = 400;
      throw err;
    }

    // Determinar quién es contador y quién es cliente
    let contadorId, clienteId;
    if (rol === 'contador') {
      contadorId = userId;
      clienteId = targetUserId;
    } else {
      // dueño busca contador
      contadorId = targetUserId;
      clienteId = userId;
    }

    // Verificar que no exista una solicitud pendiente o aceptada
    const existente = await vinculacionRepository.findExistente(contadorId, clienteId);
    if (existente) {
      if (existente.estado === 'aceptada') {
        const err = new Error('Ya existe un vínculo activo con este usuario');
        err.status = 409;
        throw err;
      }
      if (existente.estado === 'pendiente') {
        const err = new Error('Ya existe una solicitud pendiente con este usuario');
        err.status = 409;
        throw err;
      }
      // Si está rechazada, permitir reenviar (eliminar la anterior y crear nueva)
      await vinculacionRepository.delete(existente.id);
    }

    const solicitud = await vinculacionRepository.crearSolicitud({
      contadorId,
      clienteId,
      solicitadoPor: userId,
    });

    logger.info(`[VinculacionService] Solicitud enviada: user ${userId} → user ${targetUserId}`);
    return solicitud;
  }

  /**
   * Obtener solicitudes pendientes recibidas
   */
  async getPendientesRecibidas(userId) {
    return vinculacionRepository.findPendientesRecibidas(userId);
  }

  /**
   * Obtener solicitudes pendientes enviadas
   */
  async getPendientesEnviadas(userId) {
    return vinculacionRepository.findPendientesEnviadas(userId);
  }

  /**
   * Obtener vínculos activos
   */
  async getVinculosActivos(userId) {
    return vinculacionRepository.findActivas(userId);
  }

  /**
   * Aceptar solicitud — solo el destinatario puede aceptar
   */
  async aceptarSolicitud(userId, solicitudId) {
    const solicitud = await this._getSolicitudOFail(solicitudId);
    this._validarDestinatario(solicitud, userId);
    this._validarEstadoPendiente(solicitud);

    const actualizada = await vinculacionRepository.updateEstado(solicitudId, 'aceptada');
    logger.info(`[VinculacionService] Solicitud ${solicitudId} aceptada por user ${userId}`);
    return actualizada;
  }

  /**
   * Rechazar solicitud — solo el destinatario puede rechazar
   */
  async rechazarSolicitud(userId, solicitudId) {
    const solicitud = await this._getSolicitudOFail(solicitudId);
    this._validarDestinatario(solicitud, userId);
    this._validarEstadoPendiente(solicitud);

    const actualizada = await vinculacionRepository.updateEstado(solicitudId, 'rechazada');
    logger.info(`[VinculacionService] Solicitud ${solicitudId} rechazada por user ${userId}`);
    return actualizada;
  }

  /**
   * Eliminar vínculo — cualquiera de los dos puede eliminar
   */
  async eliminarVinculo(userId, solicitudId) {
    const solicitud = await this._getSolicitudOFail(solicitudId);

    if (solicitud.contadorId !== userId && solicitud.clienteId !== userId) {
      const err = new Error('No tienes permiso para eliminar este vínculo');
      err.status = 403;
      throw err;
    }

    await vinculacionRepository.delete(solicitudId);
    logger.info(`[VinculacionService] Vínculo ${solicitudId} eliminado por user ${userId}`);
    return { message: 'Vínculo eliminado correctamente' };
  }

  // ─── Helpers internos ────────────────────────────────

  async _getSolicitudOFail(id) {
    const solicitud = await vinculacionRepository.findById(id);
    if (!solicitud) {
      const err = new Error('Solicitud no encontrada');
      err.status = 404;
      throw err;
    }
    return solicitud;
  }

  _validarDestinatario(solicitud, userId) {
    // El destinatario es quien NO envió la solicitud
    const esDestinatario =
      (solicitud.contadorId === userId || solicitud.clienteId === userId) &&
      solicitud.solicitadoPor !== userId;

    if (!esDestinatario) {
      const err = new Error('Solo el destinatario puede responder esta solicitud');
      err.status = 403;
      throw err;
    }
  }

  _validarEstadoPendiente(solicitud) {
    if (solicitud.estado !== 'pendiente') {
      const err = new Error(`La solicitud ya fue ${solicitud.estado}`);
      err.status = 400;
      throw err;
    }
  }
}

module.exports = new VinculacionService();
