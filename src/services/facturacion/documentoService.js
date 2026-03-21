const documentoRepository = require('../../repositories/facturacion/documentoRepository');
const { validate, documentoSchema, documentoUpdateSchema, documentoItemSchema, referenciaSchema } = require('../core/validationService');
const { generateSyncHash, parsePagination } = require('../../utils/helpers');
const siiService = require('../sistema/siiService');
const logger = require('../../utils/logger');

const TIPOS_DOCUMENTO = { 33: 'Factura Electrónica', 34: 'Factura Exenta', 39: 'Boleta Electrónica', 41: 'Boleta Exenta', 52: 'Guía Despacho', 56: 'Nota Débito', 61: 'Nota Crédito' };
const ESTADOS_VALIDOS = ['borrador', 'pendiente', 'emitida', 'pagada', 'parcial', 'anulada', 'rechazada'];

const normalizeDocumentoInput = (data = {}) => {
  const normalizedItems = Array.isArray(data.items)
    ? data.items.map((item = {}, idx) => ({
        ...item,
        numero_linea: item.numero_linea ?? item.numeroLinea ?? idx + 1,
        producto_id: item.producto_id ?? item.productoId,
        codigo_item: item.codigo_item ?? item.codigoItem,
        precio_unitario: item.precio_unitario ?? item.precioUnitario,
        descuento_monto: item.descuento_monto ?? item.descuentoMonto,
        monto_item: item.monto_item ?? item.montoItem,
      }))
    : data.items;

  return {
    ...data,
    tipo_documento: data.tipo_documento ?? data.tipoDocumento,
    cliente_id: data.cliente_id ?? data.clienteId,
    cliente_rut: data.cliente_rut ?? data.clienteRut,
    cliente_razon_social: data.cliente_razon_social ?? data.clienteRazonSocial,
    cliente_giro: data.cliente_giro ?? data.clienteGiro,
    cliente_direccion: data.cliente_direccion ?? data.clienteDireccion,
    cliente_comuna: data.cliente_comuna ?? data.clienteComuna,
    fecha_emision: data.fecha_emision ?? data.fechaEmision,
    fecha_vencimiento: data.fecha_vencimiento ?? data.fechaVencimiento,
    monto_exento: data.monto_exento ?? data.montoExento,
    descuento_global: data.descuento_global ?? data.descuentoGlobal,
    forma_pago: data.forma_pago ?? data.formaPago,
    forma_pago_detalle: data.forma_pago_detalle ?? data.formaPagoDetalle,
    condiciones_pago: data.condiciones_pago ?? data.condicionesPago,
    orden_compra: data.orden_compra ?? data.ordenCompra,
    trabajador_id: data.trabajador_id ?? data.trabajadorId,
    direccion_despacho: data.direccion_despacho ?? data.direccionDespacho,
    fecha_despacho: data.fecha_despacho ?? data.fechaDespacho,
    local_id: data.local_id ?? data.localId,
    items: normalizedItems,
  };
};

const listDocumentos = async (tenantId, query) => {
  const { skip, take, page, limit } = parsePagination(query);
  const where = {};

  if (query.tipo_documento) where.tipoDocumento = parseInt(query.tipo_documento);
  if (query.estado) where.estado = query.estado;
  if (query.cliente_id) where.clienteId = query.cliente_id;
  if (query.trabajador_id) where.trabajadorId = query.trabajador_id;
  if (query.desde || query.hasta) {
    where.fechaEmision = {};
    if (query.desde) where.fechaEmision.gte = new Date(query.desde);
    if (query.hasta) where.fechaEmision.lte = new Date(query.hasta);
  }

  const [documentos, total] = await Promise.all([
    documentoRepository.findAll(tenantId, { skip, take, where }),
    documentoRepository.countAll(tenantId, where)
  ]);

  return {
    data: documentos,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  };
};

const getDocumento = async (tenantId, id) => {
  const doc = await documentoRepository.findById(tenantId, id);
  if (!doc) {
    const error = new Error('Documento no encontrado');
    error.status = 404;
    throw error;
  }
  return doc;
};

const createDocumento = async (tenantId, data) => {
  const normalizedData = normalizeDocumentoInput(data);
  if (normalizedData.xml !== undefined) {
    const error = new Error('Este endpoint solo acepta JSON estructurado. No envíe XML en el payload.');
    error.status = 400;
    throw error;
  }

  const validated = validate(documentoSchema, normalizedData);

  // Validate tipo_documento
  if (!TIPOS_DOCUMENTO[validated.tipo_documento]) {
    const error = new Error('Tipo de documento inválido');
    error.status = 400;
    throw error;
  }

  // Check folio uniqueness
  const existing = await documentoRepository.findByFolio(tenantId, validated.tipo_documento, validated.folio);
  if (existing) {
    const error = new Error(`Ya existe un documento tipo ${validated.tipo_documento} con folio ${validated.folio}`);
    error.status = 409;
    throw error;
  }

  // Validate items
  const items = (validated.items || []).map((item, idx) => {
    const validatedItem = validate(documentoItemSchema, item);
    return {
      numeroLinea: validatedItem.numero_linea || idx + 1,
      productoId: validatedItem.producto_id || null,
      codigoItem: validatedItem.codigo_item || null,
      descripcion: validatedItem.descripcion,
      cantidad: validatedItem.cantidad,
      unidad: validatedItem.unidad || 'UN',
      precioUnitario: validatedItem.precio_unitario,
      descuento: validatedItem.descuento || 0,
      descuentoMonto: validatedItem.descuento_monto || 0,
      montoItem: validatedItem.monto_item,
      exento: validatedItem.exento || false
    };
  });

  // Validate referencias
  const referencias = (validated.referencias || []).map(ref => {
    const validatedRef = validate(referenciaSchema, ref);
    return {
      tipoDocumentoReferencia: validatedRef.tipo_documento_referencia,
      folioReferencia: validatedRef.folio_referencia,
      fechaReferencia: new Date(validatedRef.fecha_referencia),
      razonReferencia: validatedRef.razon_referencia,
      codigoReferencia: validatedRef.codigo_referencia || null,
      detalle: validatedRef.detalle || null
    };
  });

  const docData = {
    tenantId,
    localId: validated.local_id || null,
    tipoDocumento: validated.tipo_documento,
    folio: validated.folio,
    clienteId: validated.cliente_id || null,
    clienteRut: validated.cliente_rut || null,
    clienteRazonSocial: validated.cliente_razon_social || null,
    clienteGiro: validated.cliente_giro || null,
    clienteDireccion: validated.cliente_direccion || null,
    clienteComuna: validated.cliente_comuna || null,
    fechaEmision: new Date(validated.fecha_emision),
    fechaVencimiento: validated.fecha_vencimiento ? new Date(validated.fecha_vencimiento) : null,
    subtotal: validated.subtotal,
    montoExento: validated.monto_exento || 0,
    descuentoGlobal: validated.descuento_global || 0,
    iva: validated.iva || 0,
    total: validated.total,
    formaPago: validated.forma_pago || 'contado',
    formaPagoDetalle: validated.forma_pago_detalle || null,
    condicionesPago: validated.condiciones_pago || null,
    ordenCompra: validated.orden_compra || null,
    trabajadorId: validated.trabajador_id || null,
    estado: validated.estado || 'pendiente',
    direccionDespacho: validated.direccion_despacho || null,
    fechaDespacho: validated.fecha_despacho ? new Date(validated.fecha_despacho) : null,
    transportista: validated.transportista || null,
    patente: validated.patente || null,
    observaciones: validated.observaciones || null,
    syncStatus: 'synced',
    lastSyncedAt: new Date(),
    syncHash: generateSyncHash({ ...validated, tenantId })
  };

  // Crear documento en DB
  const documento = await documentoRepository.create(docData, items, referencias);

  // Si se solicita emisión automática al SII
  const debeEmitir = validated.emitir === true || validated.estado === 'emitida';
  if (debeEmitir) {
    try {
      logger.info(`[DocumentoService] Enviando documento ${documento.id} al SII`);
      const resultadoSII = await siiService.enviarDocumento(tenantId, documento);

      // Actualizar documento con datos del SII
      await documentoRepository.update(tenantId, documento.id, {
        trackIdSII: resultadoSII.trackId,
        estadoSII: resultadoSII.estado,
        fechaEnvioSII: resultadoSII.timestamp,
        xmlEnviado: resultadoSII.xmlEnviado,
        estado: 'emitida',
      });

      logger.info(`[DocumentoService] Documento ${documento.id} enviado al SII. TrackID: ${resultadoSII.trackId}`);

      // Refrescar documento con datos actualizados
      return documentoRepository.findById(tenantId, documento.id);
    } catch (siiError) {
      // Log error pero no fallar toda la operación
      // El documento se crea pero queda pendiente de envío
      logger.error(`[DocumentoService] Error enviando al SII: ${siiError.message}`);
      
      // Actualizar estado a error
      await documentoRepository.update(tenantId, documento.id, {
        estadoSII: 'ERROR',
      });
    }
  }

  return documento;
};

const updateDocumento = async (tenantId, id, data) => {
  const existing = await documentoRepository.findById(tenantId, id);
  if (!existing) {
    const error = new Error('Documento no encontrado');
    error.status = 404;
    throw error;
  }

  // Cannot update emitida/anulada/rechazada documents
  if (['emitida', 'anulada', 'rechazada'].includes(existing.estado)) {
    const error = new Error(`No se puede modificar un documento en estado "${existing.estado}"`);
    error.status = 409;
    throw error;
  }

  const validated = validate(documentoUpdateSchema, data);

  const updateData = {};
  const fieldMap = {
    cliente_id: 'clienteId', cliente_rut: 'clienteRut', cliente_razon_social: 'clienteRazonSocial',
    cliente_giro: 'clienteGiro', cliente_direccion: 'clienteDireccion', cliente_comuna: 'clienteComuna',
    fecha_emision: 'fechaEmision', fecha_vencimiento: 'fechaVencimiento',
    subtotal: 'subtotal', monto_exento: 'montoExento', descuento_global: 'descuentoGlobal',
    iva: 'iva', total: 'total', forma_pago: 'formaPago', forma_pago_detalle: 'formaPagoDetalle',
    condiciones_pago: 'condicionesPago', orden_compra: 'ordenCompra', trabajador_id: 'trabajadorId',
    estado: 'estado', observaciones: 'observaciones', direccion_despacho: 'direccionDespacho',
    fecha_despacho: 'fechaDespacho', transportista: 'transportista', patente: 'patente'
  };

  for (const [snakeKey, camelKey] of Object.entries(fieldMap)) {
    if (validated[snakeKey] !== undefined) {
      updateData[camelKey] = validated[snakeKey];
    }
  }

  // Handle date fields
  if (updateData.fechaEmision) updateData.fechaEmision = new Date(updateData.fechaEmision);
  if (updateData.fechaVencimiento) updateData.fechaVencimiento = new Date(updateData.fechaVencimiento);
  if (updateData.fechaDespacho) updateData.fechaDespacho = new Date(updateData.fechaDespacho);

  updateData.syncHash = generateSyncHash({ ...existing, ...updateData });

  let items = null;
  if (validated.items) {
    items = validated.items.map((item, idx) => ({
      numeroLinea: item.numero_linea || idx + 1,
      productoId: item.producto_id || null,
      codigoItem: item.codigo_item || null,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      unidad: item.unidad || 'UN',
      precioUnitario: item.precio_unitario,
      descuento: item.descuento || 0,
      descuentoMonto: item.descuento_monto || 0,
      montoItem: item.monto_item,
      exento: item.exento || false
    }));
  }

  let referencias = null;
  if (validated.referencias) {
    referencias = validated.referencias.map(ref => ({
      tipoDocumentoReferencia: ref.tipo_documento_referencia,
      folioReferencia: ref.folio_referencia,
      fechaReferencia: new Date(ref.fecha_referencia),
      razonReferencia: ref.razon_referencia,
      codigoReferencia: ref.codigo_referencia || null,
      detalle: ref.detalle || null
    }));
  }

  return documentoRepository.update(tenantId, id, updateData, items, referencias);
};

const cambiarEstado = async (tenantId, id, estado) => {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    const error = new Error('Estado inválido');
    error.status = 400;
    throw error;
  }

  const doc = await documentoRepository.findById(tenantId, id);
  if (!doc) {
    const error = new Error('Documento no encontrado');
    error.status = 404;
    throw error;
  }

  // Validate state transitions
  const transiciones = {
    borrador: ['pendiente', 'anulada'],
    pendiente: ['emitida', 'anulada'],
    emitida: ['pagada', 'parcial', 'anulada'],
    parcial: ['pagada', 'anulada'],
    pagada: ['anulada'],
    anulada: [],
    rechazada: ['pendiente']
  };

  const permitidas = transiciones[doc.estado] || [];
  if (!permitidas.includes(estado)) {
    const error = new Error(`No se puede cambiar de "${doc.estado}" a "${estado}"`);
    error.status = 409;
    throw error;
  }

  return documentoRepository.updateEstado(tenantId, id, estado);
};

const deleteDocumento = async (tenantId, id) => {
  const doc = await documentoRepository.findById(tenantId, id);
  if (!doc) {
    const error = new Error('Documento no encontrado');
    error.status = 404;
    throw error;
  }
  if (['emitida', 'pagada', 'parcial'].includes(doc.estado)) {
    const error = new Error('No se puede eliminar un documento emitido o con pagos');
    error.status = 409;
    throw error;
  }
  return documentoRepository.remove(tenantId, id);
};

const syncDocumentos = async (tenantId, documentos) => {
  const results = [];
  for (const doc of documentos) {
    try {
      let existing = null;
      if (doc.folio && doc.tipo_documento) {
        existing = await documentoRepository.findByFolio(tenantId, doc.tipo_documento, doc.folio);
      }
      if (existing) {
        const updated = await updateDocumento(tenantId, existing.id, doc);
        results.push({ local_id: doc.local_id, server_id: updated.id, status: 'updated' });
      } else {
        const created = await createDocumento(tenantId, doc);
        results.push({ local_id: doc.local_id, server_id: created.id, status: 'created' });
      }
    } catch (error) {
      results.push({ local_id: doc.local_id, status: 'error', error: error.message });
    }
  }
  return results;
};

module.exports = {
  listDocumentos, getDocumento, createDocumento, updateDocumento,
  cambiarEstado, deleteDocumento, syncDocumentos, TIPOS_DOCUMENTO
};
