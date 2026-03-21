const prisma = require('../../config/database');
const syncRepository = require('../../repositories/sistema/syncRepository');
const logger = require('../../utils/logger');

const ENTITY_MODELS = {
  cliente: 'cliente',
  producto: 'producto',
  trabajador: 'trabajador',
  documento: 'documento',
};

const ENTITY_WITH_LOCAL_ID = new Set(['cliente', 'producto', 'documento']);

const normalizeRut = (rut) => {
  if (!rut) return null;
  return String(rut).replace(/\./g, '').replace(/\s/g, '').trim().toUpperCase();
};

const buildLookupWhere = (entityType, tenantId, localId, payload = {}) => {
  if (ENTITY_WITH_LOCAL_ID.has(entityType)) {
    return { userId: tenantId, localId };
  }

  if (entityType === 'trabajador') {
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;
    if (email) return { userId: tenantId, email: { equals: email, mode: 'insensitive' } };

    const rut = normalizeRut(payload.rut);
    if (rut) return { userId: tenantId, rut };

    return null;
  }

  return { userId: tenantId };
};

function summarizeOperation(op = {}) {
  return {
    entity_type: op.entity_type,
    mapped_type: op.entity_type === 'vendedor' ? 'trabajador' : op.entity_type,
    operation: op.operation,
    local_id: op.entity_local_id,
    queued_at: op.queued_at || null,
    payload_keys: op.payload && typeof op.payload === 'object' ? Object.keys(op.payload) : [],
  };
}

const push = async (tenantId, operations) => {
  const results = [];
  const conflicts = [];
  const failed = [];

  logger.info(`[SyncService.push] tenant=${tenantId} start operations=${operations.length}`);

  for (const op of operations) {
    try {
      const { entity_type, entity_local_id, operation, payload, queued_at } = op;
      const opSummary = summarizeOperation(op);
      logger.info(`[SyncService.push] tenant=${tenantId} processing`, opSummary);

      // Map vendedor → trabajador
      const mappedType = entity_type === 'vendedor' ? 'trabajador' : entity_type;

      if (!ENTITY_MODELS[mappedType]) {
        const reason = `Tipo de entidad desconocido: ${entity_type}`;
        logger.error(`[SyncService.push] tenant=${tenantId} failed localId=${entity_local_id} reason=${reason}`);
        failed.push({ local_id: entity_local_id, entity_type, error: reason });
        continue;
      }

      try {
        const result = await processOperation(tenantId, mappedType, operation, entity_local_id, payload, queued_at);
        logger.info(`[SyncService.push] tenant=${tenantId} success localId=${entity_local_id} serverId=${result.id} status=${result.status || 'created'}`);
        results.push({ local_id: entity_local_id, server_id: result.id, entity_type, status: result.status || 'created' });
      } catch (error) {
        if (error.conflict) {
          logger.error(`[SyncService.push] tenant=${tenantId} conflict localId=${entity_local_id} message=${error.message}`);
          conflicts.push({ local_id: entity_local_id, entity_type, error: error.message, server_version: error.serverVersion });
        } else {
          logger.error(`[SyncService.push] tenant=${tenantId} failed localId=${entity_local_id} message=${error.message}`);
          failed.push({ local_id: entity_local_id, entity_type, error: error.message });
        }
      }
    } catch (error) {
      logger.error(`[SyncService.push] tenant=${tenantId} unexpected error message=${error.message}`);
      failed.push({ local_id: op.entity_local_id, entity_type: op.entity_type, error: error.message });
    }
  }

  const statusCounts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  logger.info(`[SyncService.push] tenant=${tenantId} end`, {
    total: operations.length,
    results: results.length,
    conflicts: conflicts.length,
    failed: failed.length,
    statuses: statusCounts,
  });

  return { results, conflicts, failed };
};

const processOperation = async (tenantId, entityType, operation, localId, payload, queuedAt) => {
  const model = prisma[entityType];
  if (!model) throw new Error(`Modelo no encontrado: ${entityType}`);

  logger.debug(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} op=${operation} localId=${localId}`);

  if (operation === 'create') {
    const lookupWhere = buildLookupWhere(entityType, tenantId, localId, payload);
    const existing = lookupWhere ? await model.findFirst({ where: lookupWhere }) : null;
    if (existing) {
      logger.info(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} localId=${localId} already_exists serverId=${existing.id}`);
      return { id: existing.id, status: 'already_exists' };
    }

    const data = mapPayloadToModel(entityType, tenantId, payload, localId);
    if (entityType === 'trabajador' && !data.passwordHash) {
      logger.info(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} localId=${localId} skipped_missing_credentials`);
      return { id: null, status: 'skipped_missing_credentials' };
    }
    const created = await model.create({ data });
    return { id: created.id, status: 'created' };
  }

  if (operation === 'update') {
    const lookupWhere = buildLookupWhere(entityType, tenantId, localId, payload);
    if (!lookupWhere) {
      throw new Error(`No se pudo identificar el registro ${entityType} para actualizar.`);
    }

    let existing = await model.findFirst({ where: lookupWhere });
    if (!existing) {
      if (entityType === 'trabajador') {
        logger.info(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} localId=${localId} worker_not_found_for_update`);
        return { id: null, status: 'not_found' };
      }

      logger.info(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} localId=${localId} not_found_for_update creating_new`);
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
          logger.error(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} localId=${localId} conflict diffMs=${diffMs}`);
          const error = new Error('Conflicto: edición concurrente');
          error.conflict = true;
          error.serverVersion = existing;
          throw error;
        }
        logger.info(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} localId=${localId} skipped_stale diffMs=${diffMs}`);
        return { id: existing.id, status: 'skipped_stale' };
      }
    }

    const updateData = mapPayloadToModel(entityType, tenantId, payload, localId);
    delete updateData.userId;
    if (ENTITY_WITH_LOCAL_ID.has(entityType)) delete updateData.localId;
    const updated = await model.update({ where: { id: existing.id }, data: updateData });
    return { id: updated.id, status: 'updated' };
  }

  if (operation === 'delete') {
    const lookupWhere = buildLookupWhere(entityType, tenantId, localId, payload);
    if (!lookupWhere) {
      return { id: null, status: 'not_found' };
    }
    const existing = await model.findFirst({ where: lookupWhere });
    if (!existing) {
      logger.info(`[SyncService.processOperation] tenant=${tenantId} entity=${entityType} localId=${localId} delete_not_found`);
      return { id: null, status: 'not_found' };
    }
    await model.delete({ where: { id: existing.id } });
    return { id: existing.id, status: 'deleted' };
  }

  throw new Error(`Operación desconocida: ${operation}`);
};

const mapPayloadToModel = (entityType, tenantId, payload, localId) => {
  const base = { userId: tenantId };
  if (ENTITY_WITH_LOCAL_ID.has(entityType)) base.localId = localId;

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
        rut: normalizeRut(payload.rut),
        email: payload.email,
        rol: payload.rol || 'trabajador',
        permisos: payload.permisos ? JSON.stringify(payload.permisos) : undefined,
        passwordHash: payload.passwordHash,
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

  logger.info(`[SyncService.pull] tenant=${tenantId} start since=${sinceDate.toISOString()}`);

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

  logger.info(`[SyncService.pull] tenant=${tenantId} end clientes=${clientes.length} productos=${productos.length} trabajadores=${trabajadores.length} documentos=${documentos.length}`);

  return { since: sinceDate.toISOString(), server_time: new Date().toISOString(), entities };
};

const resolveConflict = async (tenantId, data) => {
  const { entity_type, entity_id, resolution, payload } = data;

  logger.info(`[SyncService.resolveConflict] tenant=${tenantId} entityType=${entity_type} entityId=${entity_id} resolution=${resolution}`);

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
    logger.info(`[SyncService.resolveConflict] tenant=${tenantId} keep_server entityFound=${Boolean(entity)}`);
    return { resolution: 'keep_server', entity };
  }

  if (resolution === 'keep_local' || resolution === 'merge') {
    const updateData = mapPayloadToModel(mappedType, tenantId, payload, payload.local_id);
    delete updateData.userId;
    if (ENTITY_WITH_LOCAL_ID.has(mappedType)) delete updateData.localId;
    const updated = await model.update({ where: { id: entity_id }, data: updateData });
    logger.info(`[SyncService.resolveConflict] tenant=${tenantId} ${resolution} updatedId=${updated.id}`);
    return { resolution, entity: updated };
  }
};

const getStatus = async (tenantId) => {
  logger.info(`[SyncService.getStatus] tenant=${tenantId} start`);
  const queueStats = await syncRepository.getStats(tenantId);

  const [clientesCount, productosCount, documentosCount] = await Promise.all([
    prisma.cliente.count({ where: { userId: tenantId } }),
    prisma.producto.count({ where: { userId: tenantId } }),
    prisma.documento.count({ where: { userId: tenantId } })
  ]);

  const status = {
    queue: queueStats,
    counts: {
      clientes: clientesCount,
      productos: productosCount,
      documentos: documentosCount
    },
    lastSync: new Date().toISOString()
  };

  logger.info(`[SyncService.getStatus] tenant=${tenantId} end`, status);
  return status;
};

module.exports = { push, pull, resolveConflict, getStatus };
