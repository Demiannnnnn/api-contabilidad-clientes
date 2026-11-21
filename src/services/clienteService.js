const clienteRepository = require('../repositories/clienteRepository');
const { validate, schemas } = require('./validationService');
const { limpiarRut, parsePagination } = require('../utils/helpers');
const logger = require('../utils/logger');

class ClienteService {
  async listClientes(userId, query) {
    const { skip, limit, page } = parsePagination(query);
    const [clientes, total] = await Promise.all([
      clienteRepository.findAll(userId, { skip, limit }),
      clienteRepository.countAll(userId),
    ]);
    return { data: clientes, total, page, limit };
  }

  async getCliente(userId, id) {
    const cliente = await clienteRepository.findById(userId, id);
    if (!cliente) {
      const err = new Error('Cliente no encontrado');
      err.status = 404;
      throw err;
    }
    return cliente;
  }

  async searchClientes(userId, q) {
    if (!q || q.trim().length < 2) {
      const err = new Error('Búsqueda debe tener al menos 2 caracteres');
      err.status = 400;
      throw err;
    }
    return clienteRepository.search(userId, q.trim());
  }

  async createCliente(userId, data) {
    const validated = validate(schemas.cliente, data);
    const rut = limpiarRut(validated.rut);

    // Check duplicate RUT
    const existing = await clienteRepository.findByRut(userId, rut);
    if (existing) {
      const err = new Error('Ya existe un cliente con ese RUT');
      err.status = 409;
      throw err;
    }

    // Map validated data to Prisma Cliente schema fields (direct camelCase)
    const cliente = await clienteRepository.create({
      userId,
      rut,
      razonSocial: validated.razonSocial,
      nombreFantasia: validated.nombreFantasia || null,
      giro: validated.giro || null,
      direccion: validated.direccion || null,
      region: validated.region || null,
      comuna: validated.comuna || null,
      ciudad: validated.ciudad || null,
      telefono: validated.telefono || null,
      email: validated.email || null,
      tipoDocumento: validated.tipoDocumento || 'rut_empresa',
      contactoNombre: validated.contactoNombre || null,
      contactoCargo: validated.contactoCargo || null,
      contactoEmail: validated.contactoEmail || null,
      contactoTelefono: validated.contactoTelefono || null,
      condicionPago: validated.condicionPago || 'contado',
      diasCredito: validated.diasCredito || 0,
      limiteCredito: validated.limiteCredito || 0,
      descuentoAutomatico: validated.descuentoAutomatico || 0,
      zona: validated.zona || null,
      listaPrecios: validated.listaPrecios || 'normal',
    });

    logger.info(`[ClienteService] Created: ${rut} for user ${userId}`);
    return cliente;
  }

  async updateCliente(userId, id, data) {
    await this.getCliente(userId, id);
    const validated = validate(schemas.clienteUpdate, data);

    const updateData = {};
    if (validated.rut) updateData.rut = limpiarRut(validated.rut);
    if (validated.razonSocial) updateData.razonSocial = validated.razonSocial;
    if (validated.nombreFantasia !== undefined) updateData.nombreFantasia = validated.nombreFantasia;
    if (validated.giro !== undefined) updateData.giro = validated.giro;
    if (validated.direccion !== undefined) updateData.direccion = validated.direccion;
    if (validated.region !== undefined) updateData.region = validated.region;
    if (validated.comuna !== undefined) updateData.comuna = validated.comuna;
    if (validated.ciudad !== undefined) updateData.ciudad = validated.ciudad;
    if (validated.telefono !== undefined) updateData.telefono = validated.telefono;
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.tipoDocumento) updateData.tipoDocumento = validated.tipoDocumento;
    if (validated.contactoNombre !== undefined) updateData.contactoNombre = validated.contactoNombre;
    if (validated.contactoCargo !== undefined) updateData.contactoCargo = validated.contactoCargo;
    if (validated.contactoEmail !== undefined) updateData.contactoEmail = validated.contactoEmail;
    if (validated.contactoTelefono !== undefined) updateData.contactoTelefono = validated.contactoTelefono;
    if (validated.condicionPago !== undefined) updateData.condicionPago = validated.condicionPago;
    if (validated.diasCredito !== undefined) updateData.diasCredito = validated.diasCredito;
    if (validated.limiteCredito !== undefined) updateData.limiteCredito = validated.limiteCredito;
    if (validated.descuentoAutomatico !== undefined) updateData.descuentoAutomatico = validated.descuentoAutomatico;

    // Check RUT uniqueness if changed
    if (updateData.rut) {
      const existing = await clienteRepository.findByRut(userId, updateData.rut);
      if (existing && existing.id !== id) {
        const err = new Error('Ya existe un cliente con ese RUT');
        err.status = 409;
        throw err;
      }
    }

    return clienteRepository.update(userId, id, updateData);
  }

  async deleteCliente(userId, id) {
    const cliente = await this.getCliente(userId, id);
    if (cliente.documentos && cliente.documentos.length > 0) {
      const err = new Error('No se puede eliminar un cliente con documentos asociados');
      err.status = 400;
      throw err;
    }
    return clienteRepository.delete(userId, id);
  }

  async getEstadoCuenta(userId, id) {
    const cliente = await this.getCliente(userId, id);
    return cliente;
  }

  async syncClientes(userId, clientes) {
    const resultados = { creados: 0, actualizados: 0, errores: [] };
    for (const clienteData of clientes) {
      try {
        if (clienteData.id) {
          await this.updateCliente(userId, clienteData.id, clienteData);
          resultados.actualizados++;
        } else {
          await this.createCliente(userId, clienteData);
          resultados.creados++;
        }
      } catch (err) {
        resultados.errores.push({
          cliente: clienteData.razonSocial || clienteData.rut || 'desconocido',
          error: err.message,
        });
      }
    }
    return resultados;
  }
}

module.exports = new ClienteService();
