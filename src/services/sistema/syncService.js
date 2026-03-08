const prisma = require('../../config/database');
const syncRepository = require('../../repositories/sistema/syncRepository');

const ENTITY_MODELS = {
  cliente: 'cliente',
  producto: 'producto',
  trabajador: 'trabajador',
  documento: 'documento',
};

const push = async (tenantId, operations) => {
  const results = [];
  const conflicts = [];
  const failed = [];

  for (const op of operations) {
    try {
      const { entity_type, entity_local_id, operation, payload, queued_at } = op;

      // Map vendedor → trabajador
      const mappedType = entity_type === 'vendedor' ? 'trabajador' : entity_type;

      if (!ENTITY_MODELS[mappedType]) {
        failed.push({ local_id: entity_local_id, entity_type, error: `Tipo de entidad desconocido: ${entity_type}` });
        continue;
      }

      try {
        const result = await processOperation(tenantId, mappedType, operation, entity_local_id, payload, queued_at);
        results.push({ local_id: entity_local_id, server_id: result.id, entity_type, status: result.status || 'created' });
      } catch (error) {
        if (error.conflict) {
          conflicts.push({ local_id: entity_local_id, entity_type, error: error.message, server_version: error.serverVersion });
        } else {
          failed.push({ local_id: entity_local_id, entity_type, error: error.message });
        }
      }
    } catch (error) {
      failed.push({ local_id: op.entity_local_id, entity_type: op.entity_type, error: error.message });
    }
  }

  return { results, conflicts, failed };
};

const processOperation = async (tenantId, entityType, operation, localId, payload, queuedAt) => {
  const model = prisma[entityType];
  if (!model) throw new Error(`Modelo no encontrado: ${entityType}`);

  if (operation === 'create') {
    const existing = await model.findFirst({ where: { userId: tenantId, localId } });
    if (existing) {
      return { id: existing.id, status: 'already_exists' };
    }

    const data = mapPayloadToModel(entityType, tenantId, payload, localId);
    const created = await model.create({ data });
    return { id: created.id, status: 'created' };
  }

  if (operation === 'update') {
    let existing = await model.findFirst({ where: { userId: tenantId, localId } });
    if (!existing) {
      const data = mapPayloadToModel(entityType, tenantId, payload, localId);
      const created = await model.create({ data });
      return { id: created.id, status: 'created' };
    }

    if (queuedAt) {
      const serverUpdated = new Date(existing.updatedAt);
      const incomingQueued = new Date(queuedAt);
      if (serverUpdated > incomingQueued) {
        const diffMs = serverUpdated - incomingQueued;
        if (diffMs < 5 * 60 * 1000) {
          const error = new Error('Conflicto: edición concurrente');
          error.conflict = true;
          error.serverVersion = existing;
          throw error;
        }
        return { id: existing.id, status: 'skipped_stale' };
      }
    }

    const updateData = mapPayloadToModel(entityType, tenantId, payload, localId);
    delete updateData.userId;
    delete updateData.localId;
    const updated = await model.update({ where: { id: existing.id }, data: updateData });
    return { id: updated.id, status: 'updated' };
  }

  if (operation === 'delete') {
    const existing = await model.findFirst({ where: { userId: tenantId, localId } });
    if (!existing) return { id: null, status: 'not_found' };
    await model.delete({ where: { id: existing.id } });
    return { id: existing.id, status: 'deleted' };
  }

  throw new Error(`Operación desconocida: ${operation}`);
};

const mapPayloadToModel = (entityType, tenantId, payload, localId) => {
  const base = { userId: tenantId, localId };

  switch (entityType) {
    case 'cliente':
      return {
        ...base,
        rut: payload.rut,
        razonSocial: payload.razon_social || payload.razonSocial,
        nombreFantasia: payload.nombre_fantasia || payload.nombreFantasia,
        giro: payload.giro,
        direccion: payload.direccion,
        comuna: payload.comuna,
        ciudad: payload.ciudad,
        region: payload.region,
        telefono: payload.telefono,
        email: payload.email,
        tipoDocumento: payload.tipo_documento || payload.tipoDocumento,
        condicionPago: payload.condicion_pago || payload.condicionPago || 'contado',
        diasCredito: payload.dias_credito || payload.diasCredito || 0,
        limiteCredito: payload.limite_credito || payload.limiteCredito || 0,
      };
    case 'producto':
      return {
        ...base,
        codigo: payload.codigo,
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        precio: payload.precio,
        stock: payload.stock || 0,
        exento: payload.exento || false,
        unidadMedida: payload.unidad_medida || payload.unidadMedida || 'UN',
      };
    case 'trabajador':
      return {
        ...base,
        nombre: payload.nombre,
        rut: payload.rut || '',
        cargo: payload.cargo || null,
        email: payload.email,
        activo: payload.activo !== undefined ? payload.activo : true,
      };
    case 'documento':
      return {
        ...base,
        tipo: payload.tipo_documento || payload.tipo || 'FACTURA_ELECTRONICA',
        numero: payload.folio || payload.numero,
        clienteId: payload.cliente_id || payload.clienteId,
        fecha: new Date(payload.fecha_emision || payload.fecha || new Date()),
        neto: payload.subtotal || payload.neto || 0,
        iva: payload.iva || 0,
        total: payload.total || 0,
        estado: payload.estado || 'EMITIDO',
      };
    default:
      return { ...base, ...payload };
  }
};

const pull = async (tenantId, since) => {
  const sinceDate = since ? new Date(since) : new Date(0);
  const entities = {};

  const [clientes, productos, trabajadores, documentos] = await Promise.all([
    prisma.cliente.findMany({ where: { userId: tenantId, updatedAt: { gt: sinceDate } } }),
    prisma.producto.findMany({ where: { userId: tenantId, updatedAt: { gt: sinceDate } } }),
    prisma.trabajador.findMany({ where: { userId: tenantId, updatedAt: { gt: sinceDate } } }),
    prisma.documento.findMany({
      where: { userId: tenantId, updatedAt: { gt: sinceDate } },
      include: { items: true }
    })
  ]);

  if (clientes.length) entities.clientes = clientes;
  if (productos.length) entities.productos = productos;
  if (trabajadores.length) entities.trabajadores = trabajadores;
  if (documentos.length) entities.documentos = documentos;

  return { since: sinceDate.toISOString(), server_time: new Date().toISOString(), entities };
};

const resolveConflict = async (tenantId, data) => {
  const { entity_type, entity_id, resolution, payload } = data;

  if (!['keep_server', 'keep_local', 'merge'].includes(resolution)) {
    const error = new Error('Resolución inválida. Use: keep_server, keep_local, merge');
    error.status = 400;
    throw error;
  }

  const mappedType = entity_type === 'vendedor' ? 'trabajador' : entity_type;
  const model = prisma[mappedType];
  if (!model) {
    const error = new Error(`Tipo de entidad desconocido: ${entity_type}`);
    error.status = 400;
    throw error;
  }

  if (resolution === 'keep_server') {
    const entity = await model.findFirst({ where: { id: entity_id, userId: tenantId } });
    return { resolution: 'keep_server', entity };
  }

  if (resolution === 'keep_local' || resolution === 'merge') {
    const updateData = mapPayloadToModel(mappedType, tenantId, payload, payload.local_id);
    delete updateData.userId;
    delete updateData.localId;
    const updated = await model.update({ where: { id: entity_id }, data: updateData });
    return { resolution, entity: updated };
  }
};

const getStatus = async (tenantId) => {
  const queueStats = await syncRepository.getStats(tenantId);

  const [clientesCount, productosCount, documentosCount] = await Promise.all([
    prisma.cliente.count({ where: { userId: tenantId } }),
    prisma.producto.count({ where: { userId: tenantId } }),
    prisma.documento.count({ where: { userId: tenantId } })
  ]);

  return {
    queue: queueStats,
    counts: {
      clientes: clientesCount,
      productos: productosCount,
      documentos: documentosCount
    },
    lastSync: new Date().toISOString()
  };
};

module.exports = { push, pull, resolveConflict, getStatus };
