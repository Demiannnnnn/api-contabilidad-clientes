const clienteRepository = require('../repositories/clienteRepository');
const { validate, schemas } = require('./validationService');
const { limpiarRut, generateSyncHash, parsePagination } = require('../utils/helpers');
const logger = require('../utils/logger');

class ClienteService {
  async listClientes(tenantId, query) {
    const { skip, limit, page } = parsePagination(query);
    const [clientes, total] = await Promise.all([
      clienteRepository.findAll(tenantId, { skip, limit }),
      clienteRepository.countAll(tenantId),
    ]);
    return { data: clientes, total, page, limit };
  }

  async getCliente(tenantId, id) {
    const cliente = await clienteRepository.findById(tenantId, id);
    if (!cliente) {
      const err = new Error('Cliente no encontrado');
      err.status = 404;
      throw err;
    }
    return cliente;
  }

  async searchClientes(tenantId, q) {
    if (!q || q.trim().length < 2) {
      const err = new Error('Búsqueda debe tener al menos 2 caracteres');
      err.status = 400;
      throw err;
    }
    return clienteRepository.search(tenantId, q.trim());
  }

  async createCliente(tenantId, data) {
    const validated = validate(schemas.cliente, data);
    const rut = limpiarRut(validated.rut);

    // Check duplicate RUT
    const existing = await clienteRepository.findByRut(tenantId, rut);
    if (existing) {
      const err = new Error('Ya existe un cliente con ese RUT');
      err.status = 409;
      throw err;
    }

    const cliente = await clienteRepository.create({
      tenantId,
      rut,
      razonSocial: validated.razon_social,
      nombreFantasia: validated.nombre_fantasia || null,
      giro: validated.giro || null,
      direccion: validated.direccion || null,
      region: validated.region || null,
      comuna: validated.comuna || null,
      ciudad: validated.ciudad || null,
      telefono: validated.telefono || null,
      email: validated.email || null,
      tipoDocumento: validated.tipo_documento || 'rut_empresa',
      contactoNombre: validated.contacto_nombre || null,
      contactoCargo: validated.contacto_cargo || null,
      contactoEmail: validated.contacto_email || null,
      contactoTelefono: validated.contacto_telefono || null,
      condicionPago: validated.condicion_pago || 'contado',
      diasCredito: validated.dias_credito || 0,
      limiteCredito: validated.limite_credito || 0,
      descuentoAutomatico: validated.descuento_automatico || 0,
      zona: validated.zona || null,
      listaPrecios: validated.lista_precios || 'normal',
      localId: validated.local_id || null,
      syncHash: generateSyncHash(validated),
    });

    logger.info(`[ClienteService] Created: ${rut} for tenant ${tenantId}`);
    return cliente;
  }

  async updateCliente(tenantId, id, data) {
    await this.getCliente(tenantId, id);
    const validated = validate(schemas.clienteUpdate, data);

    const updateData = {};
    if (validated.rut) updateData.rut = limpiarRut(validated.rut);
    if (validated.razon_social) updateData.razonSocial = validated.razon_social;
    if (validated.nombre_fantasia !== undefined) updateData.nombreFantasia = validated.nombre_fantasia;
    if (validated.giro !== undefined) updateData.giro = validated.giro;
    if (validated.direccion !== undefined) updateData.direccion = validated.direccion;
    if (validated.region !== undefined) updateData.region = validated.region;
    if (validated.comuna !== undefined) updateData.comuna = validated.comuna;
    if (validated.ciudad !== undefined) updateData.ciudad = validated.ciudad;
    if (validated.telefono !== undefined) updateData.telefono = validated.telefono;
    if (validated.email !== undefined) updateData.email = validated.email;
    if (validated.tipo_documento) updateData.tipoDocumento = validated.tipo_documento;
    if (validated.contacto_nombre !== undefined) updateData.contactoNombre = validated.contacto_nombre;
    if (validated.contacto_cargo !== undefined) updateData.contactoCargo = validated.contacto_cargo;
    if (validated.contacto_email !== undefined) updateData.contactoEmail = validated.contacto_email;
    if (validated.contacto_telefono !== undefined) updateData.contactoTelefono = validated.contacto_telefono;
    if (validated.condicion_pago) updateData.condicionPago = validated.condicion_pago;
    if (validated.dias_credito !== undefined) updateData.diasCredito = validated.dias_credito;
    if (validated.limite_credito !== undefined) updateData.limiteCredito = validated.limite_credito;
    if (validated.descuento_automatico !== undefined) updateData.descuentoAutomatico = validated.descuento_automatico;

    updateData.syncHash = generateSyncHash(updateData);
    updateData.lastSyncedAt = new Date();

    // Check RUT uniqueness if changed
    if (updateData.rut) {
      const existing = await clienteRepository.findByRut(tenantId, updateData.rut);
      if (existing && existing.id !== id) {
        const err = new Error('Ya existe un cliente con ese RUT');
        err.status = 409;
        throw err;
      }
    }

    return clienteRepository.update(tenantId, id, updateData);
  }

  async deleteCliente(tenantId, id) {
    const cliente = await this.getCliente(tenantId, id);
    if (cliente.documentos && cliente.documentos.length > 0) {
      const err = new Error('No se puede eliminar un cliente con documentos asociados');
      err.status = 400;
      throw err;
    }
    return clienteRepository.delete(tenantId, id);
  }

  async getEstadoCuenta(tenantId, id) {
    const cliente = await this.getCliente(tenantId, id);
    // Return client with their documents for account statement
    return cliente;
  }

  async syncClientes(tenantId, clientes) {
    const resultados = { creados: 0, actualizados: 0, errores: [] };
    for (const clienteData of clientes) {
      try {
        if (clienteData.id) {
          await this.updateCliente(tenantId, clienteData.id, clienteData);
          resultados.actualizados++;
        } else {
          await this.createCliente(tenantId, clienteData);
          resultados.creados++;
        }
      } catch (err) {
        resultados.errores.push({
          cliente: clienteData.razon_social || clienteData.rut || 'desconocido',
          error: err.message,
        });
      }
    }
    return resultados;
  }
}

module.exports = new ClienteService();
