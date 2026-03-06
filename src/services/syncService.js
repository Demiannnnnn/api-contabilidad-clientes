const prisma = require('../config/database');
const syncRepository = require('../repositories/syncRepository');

const ENTITY_MODELS = {
  cliente: 'cliente',
  producto: 'producto',
  vendedor: 'vendedor',
  documento: 'documento',
  pago: 'pago'
};

const push = async (tenantId, operations) => {
  const results = [];
  const conflicts = [];
  const failed = [];

  for (const op of operations) {
    try {
      const { entity_type, entity_local_id, operation, payload, queued_at } = op;

      if (!ENTITY_MODELS[entity_type]) {
        failed.push({ local_id: entity_local_id, entity_type, error: `Tipo de entidad desconocido: ${entity_type}` });
        continue;
      }

      // Create queue entry
      const entry = await syncRepository.createEntry({
        tenantId,
        entityType: entity_type,
        entityLocalId: entity_local_id,
        operation,
        payload,
        status: 'processing',
        queuedAt: queued_at ? new Date(queued_at) : new Date()
      });

      // Process based on entity type and operation
      let result;
      try {
        result = await processOperation(tenantId, entity_type, operation, entity_local_id, payload, queued_at);
        await syncRepository.updateStatus(entry.id, 'completed', { processedAt: new Date() });
        results.push({ local_id: entity_local_id, server_id: result.id, entity_type, status: result.status || 'created' });
      } catch (error) {
        if (error.conflict) {
          await syncRepository.updateStatus(entry.id, 'conflict', { lastError: error.message });
          conflicts.push({ local_id: entity_local_id, entity_type, error: error.message, server_version: error.serverVersion });
        } else {
          await syncRepository.updateStatus(entry.id, 'failed', { lastError: error.message, attempts: { increment: 1 } });
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
    // Check if already exists by localId
    const existing = await model.findFirst({ where: { tenantId, localId } });
    if (existing) {
      return { id: existing.id, status: 'already_exists' };
    }

    const data = mapPayloadToModel(entityType, tenantId, payload, localId);
    const created = await model.create({ data });
    return { id: created.id, status: 'created' };
  }

  if (operation === 'update') {
    let existing = await model.findFirst({ where: { tenantId, localId } });
    if (!existing) {
      // Try creating instead
      const data = mapPayloadToModel(entityType, tenantId, payload, localId);
      const created = await model.create({ data });
      return { id: created.id, status: 'created' };
    }

    // Conflict detection
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
        // Server is more recent, skip
        return { id: existing.id, status: 'skipped_stale' };
      }
    }

    const updateData = mapPayloadToModel(entityType, tenantId, payload, localId);
    delete updateData.tenantId;
    delete updateData.localId;
    const updated = await model.update({ where: { id: existing.id }, data: updateData });
    return { id: updated.id, status: 'updated' };
  }

  if (operation === 'delete') {
    const existing = await model.findFirst({ where: { tenantId, localId } });
    if (!existing) return { id: null, status: 'not_found' };
    await model.delete({ where: { id: existing.id } });
    return { id: existing.id, status: 'deleted' };
  }

  throw new Error(`Operación desconocida: ${operation}`);
};

const mapPayloadToModel = (entityType, tenantId, payload, localId) => {
  // Generic mapping: snake_case payload to camelCase Prisma
  const base = { tenantId, localId };

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
        syncStatus: 'synced',
        lastSyncedAt: new Date()
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
        categoria: payload.categoria,
        unidadMedida: payload.unidad_medida || payload.unidadMedida || 'UN',
        syncStatus: 'synced',
        lastSyncedAt: new Date()
      };
    case 'vendedor':
      return {
        ...base,
        nombre: payload.nombre,
        apellido: payload.apellido,
        email: payload.email,
        telefono: payload.telefono,
        comision: payload.comision || 0,
        activo: payload.activo !== undefined ? payload.activo : true,
        syncStatus: 'synced',
        lastSyncedAt: new Date()
      };
    case 'documento':
      return {
        ...base,
        tipoDocumento: payload.tipo_documento || payload.tipoDocumento,
        folio: payload.folio,
        clienteId: payload.cliente_id || payload.clienteId,
        clienteRut: payload.cliente_rut || payload.clienteRut,
        clienteRazonSocial: payload.cliente_razon_social || payload.clienteRazonSocial,
        fechaEmision: new Date(payload.fecha_emision || payload.fechaEmision),
        subtotal: payload.subtotal,
        montoExento: payload.monto_exento || payload.montoExento || 0,
        descuentoGlobal: payload.descuento_global || payload.descuentoGlobal || 0,
        iva: payload.iva || 0,
        total: payload.total,
        formaPago: payload.forma_pago || payload.formaPago || 'contado',
        estado: payload.estado || 'pendiente',
        syncStatus: 'synced',
        lastSyncedAt: new Date()
      };
    case 'pago':
      return {
        ...base,
        documentoId: payload.documento_id || payload.documentoId,
        monto: payload.monto,
        fechaPago: new Date(payload.fecha_pago || payload.fechaPago),
        formaPago: payload.forma_pago || payload.formaPago,
        referencia: payload.referencia,
        observaciones: payload.observaciones,
        syncStatus: 'synced',
        lastSyncedAt: new Date()
      };
    default:
      return { ...base, ...payload };
  }
};

const pull = async (tenantId, since) => {
  const sinceDate = since ? new Date(since) : new Date(0);
  const entities = {};

  const [clientes, productos, vendedores, documentos] = await Promise.all([
    prisma.cliente.findMany({ where: { tenantId, updatedAt: { gt: sinceDate } } }),
    prisma.producto.findMany({ where: { tenantId, updatedAt: { gt: sinceDate } } }),
    prisma.vendedor.findMany({ where: { tenantId, updatedAt: { gt: sinceDate } } }),
    prisma.documento.findMany({
      where: { tenantId, updatedAt: { gt: sinceDate } },
      include: { items: true, referencias: true }
    })
  ]);

  if (clientes.length) entities.clientes = clientes;
  if (productos.length) entities.productos = productos;
  if (vendedores.length) entities.vendedores = vendedores;
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

  const model = prisma[entity_type];
  if (!model) {
    const error = new Error(`Tipo de entidad desconocido: ${entity_type}`);
    error.status = 400;
    throw error;
  }

  if (resolution === 'keep_server') {
    const entity = await model.findFirst({ where: { id: entity_id, tenantId } });
    return { resolution: 'keep_server', entity };
  }

  if (resolution === 'keep_local' || resolution === 'merge') {
    const updateData = mapPayloadToModel(entity_type, tenantId, payload, payload.local_id);
    delete updateData.tenantId;
    delete updateData.localId;
    const updated = await model.update({ where: { id: entity_id }, data: updateData });
    return { resolution, entity: updated };
  }
};

const getStatus = async (tenantId) => {
  const queueStats = await syncRepository.getStats(tenantId);

  const [clientesPending, productosPending, documentosPending] = await Promise.all([
    prisma.cliente.count({ where: { tenantId, syncStatus: 'pending' } }),
    prisma.producto.count({ where: { tenantId, syncStatus: 'pending' } }),
    prisma.documento.count({ where: { tenantId, syncStatus: 'pending' } })
  ]);

  return {
    queue: queueStats,
    pending: {
      clientes: clientesPending,
      productos: productosPending,
      documentos: documentosPending
    },
    lastSync: new Date().toISOString()
  };
};

module.exports = { push, pull, resolveConflict, getStatus };
