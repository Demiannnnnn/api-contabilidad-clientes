const folioRepository = require('../repositories/folioRepository');

const listFolios = async (tenantId) => {
  const folios = await folioRepository.findAll(tenantId);
  return folios;
};

const uploadCaf = async (tenantId, data) => {
  const { tipo_documento, desde, hasta, caf_xml } = data;
  if (!tipo_documento || !desde || !hasta || !caf_xml) {
    const error = new Error('Faltan campos requeridos: tipo_documento, desde, hasta, caf_xml');
    error.status = 400;
    throw error;
  }
  if (desde > hasta) {
    const error = new Error('El folio "desde" no puede ser mayor que "hasta"');
    error.status = 400;
    throw error;
  }

  const folio = await folioRepository.create({
    tenantId,
    tipoDocumento: tipo_documento,
    desde,
    hasta,
    actual: desde,
    cafXml: caf_xml,
    estado: 'activo'
  });

  return folio;
};

const getNextFolio = async (tenantId, tipoDocumento) => {
  const tipo = parseInt(tipoDocumento);
  if (isNaN(tipo)) {
    const error = new Error('Tipo de documento inválido');
    error.status = 400;
    throw error;
  }

  const folio = await folioRepository.findActive(tenantId, tipo);
  if (!folio) {
    const error = new Error(`No hay folios activos para tipo ${tipo}`);
    error.status = 404;
    throw error;
  }

  if (folio.actual > folio.hasta) {
    // Mark as exhausted and look for next
    await folioRepository.update(folio.id, { estado: 'agotado' });
    const nextFolio = await folioRepository.findActive(tenantId, tipo);
    if (!nextFolio) {
      const error = new Error(`Folios agotados para tipo ${tipo}. Debe subir un nuevo CAF.`);
      error.status = 404;
      throw error;
    }
    const nextNumber = nextFolio.actual;
    await folioRepository.incrementActual(nextFolio.id);
    return { folio: nextNumber, desde: nextFolio.desde, hasta: nextFolio.hasta, restantes: nextFolio.hasta - nextNumber };
  }

  const nextNumber = folio.actual;
  await folioRepository.incrementActual(folio.id);
  return { folio: nextNumber, desde: folio.desde, hasta: folio.hasta, restantes: folio.hasta - nextNumber };
};

module.exports = { listFolios, uploadCaf, getNextFolio };
