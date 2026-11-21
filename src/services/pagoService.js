const pagoRepository = require('../repositories/pagoRepository');
const documentoRepository = require('../repositories/documentoRepository');
const { validate, pagoSchema } = require('./validationService');

const getPagosByDocumento = async (tenantId, documentoId) => {
  const doc = await documentoRepository.findById(tenantId, documentoId);
  if (!doc) {
    const error = new Error('Documento no encontrado');
    error.status = 404;
    throw error;
  }
  const pagos = await pagoRepository.findByDocumento(tenantId, documentoId);
  const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto), 0);
  return { documento: { id: doc.id, folio: doc.folio, tipo: doc.tipoDocumento, total: doc.total, estado: doc.estado }, pagos, totalPagado, saldo: Number(doc.total) - totalPagado };
};

const createPago = async (tenantId, data) => {
  const validated = validate(pagoSchema, data);

  const doc = await documentoRepository.findById(tenantId, validated.documento_id);
  if (!doc) {
    const error = new Error('Documento no encontrado');
    error.status = 404;
    throw error;
  }

  if (['anulada', 'rechazada', 'borrador'].includes(doc.estado)) {
    const error = new Error(`No se puede registrar pago en documento con estado "${doc.estado}"`);
    error.status = 409;
    throw error;
  }

  const totalPagado = Number(await pagoRepository.sumByDocumento(validated.documento_id));
  const saldo = Number(doc.total) - totalPagado;

  if (validated.monto > saldo) {
    const error = new Error(`El monto (${validated.monto}) excede el saldo pendiente (${saldo})`);
    error.status = 400;
    throw error;
  }

  const pago = await pagoRepository.create({
    tenantId,
    localId: validated.local_id || null,
    documentoId: validated.documento_id,
    monto: validated.monto,
    fechaPago: new Date(validated.fecha_pago),
    formaPago: validated.forma_pago,
    referencia: validated.referencia || null,
    observaciones: validated.observaciones || null,
    syncStatus: 'synced',
    lastSyncedAt: new Date()
  });

  // Update document status
  const nuevoTotalPagado = totalPagado + validated.monto;
  const nuevoEstado = nuevoTotalPagado >= Number(doc.total) ? 'pagada' : 'parcial';
  await documentoRepository.updateEstado(tenantId, doc.id, nuevoEstado);

  return pago;
};

const deletePago = async (tenantId, id) => {
  const pago = await pagoRepository.findById(tenantId, id);
  if (!pago) {
    const error = new Error('Pago no encontrado');
    error.status = 404;
    throw error;
  }

  await pagoRepository.remove(tenantId, id);

  // Recalculate document status
  const totalPagado = Number(await pagoRepository.sumByDocumento(pago.documentoId));
  const doc = await documentoRepository.findById(tenantId, pago.documentoId);
  if (doc && !['anulada', 'rechazada'].includes(doc.estado)) {
    const nuevoEstado = totalPagado <= 0 ? 'emitida' : (totalPagado >= Number(doc.total) ? 'pagada' : 'parcial');
    await documentoRepository.updateEstado(tenantId, doc.id, nuevoEstado);
  }

  return { message: 'Pago eliminado' };
};

const getCuentasPorCobrar = async (tenantId) => {
  const docs = await pagoRepository.findCuentasPorCobrar(tenantId);
  return docs.map(doc => {
    const totalPagado = doc.pagos.reduce((sum, p) => sum + Number(p.monto), 0);
    return {
      documento: { id: doc.id, tipo: doc.tipoDocumento, folio: doc.folio, total: Number(doc.total), estado: doc.estado, fechaEmision: doc.fechaEmision, fechaVencimiento: doc.fechaVencimiento },
      cliente: doc.cliente,
      totalPagado,
      saldo: Number(doc.total) - totalPagado,
      vencido: doc.fechaVencimiento ? new Date() > new Date(doc.fechaVencimiento) : false
    };
  });
};

const syncPagos = async (tenantId, pagos) => {
  const results = [];
  for (const p of pagos) {
    try {
      const created = await createPago(tenantId, p);
      results.push({ local_id: p.local_id, server_id: created.id, status: 'created' });
    } catch (error) {
      results.push({ local_id: p.local_id, status: 'error', error: error.message });
    }
  }
  return results;
};

module.exports = { getPagosByDocumento, createPago, deletePago, getCuentasPorCobrar, syncPagos };
