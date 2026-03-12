const siiService = require('../../services/sistema/siiService');
const documentoRepository = require('../../repositories/facturacion/documentoRepository');
const logger = require('../../utils/logger');

/**
 * Consultar estado de un documento en el SII
 * GET /api/sii/documento/:documentoId/estado
 */
const consultarEstadoDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;
    const documento = await documentoRepository.findById(req.userId, parseInt(documentoId));

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    if (!documento.trackIdSII) {
      return res.status(400).json({
        success: false,
        error: 'Este documento no ha sido enviado al SII',
      });
    }

    const estado = await siiService.consultarEstado(documento.trackIdSII);

    res.json({
      success: true,
      data: {
        documentoId: documento.id,
        folio: documento.folio,
        tipoDocumento: documento.tipoDocumento,
        ...estado,
      },
    });
  } catch (error) {
    logger.error(`[SiiController] Error consultando estado: ${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

/**
 * Reenviar documento al SII (en caso de fallo previo)
 * POST /api/sii/documento/:documentoId/reenviar
 */
const reenviarDocumento = async (req, res) => {
  try {
    const { documentoId } = req.params;
    const documento = await documentoRepository.findById(req.userId, parseInt(documentoId));

    if (!documento) {
      return res.status(404).json({ success: false, error: 'Documento no encontrado' });
    }

    // Reenviar al SII
    const resultado = await siiService.enviarDocumento(req.userId, documento);

    // Actualizar documento con nuevo trackId
    await documentoRepository.update(req.userId, documento.id, {
      trackIdSII: resultado.trackId,
      estadoSII: resultado.estado,
      fechaEnvioSII: resultado.timestamp,
    });

    logger.info(`[SiiController] Documento ${documento.id} reenviado al SII. TrackID: ${resultado.trackId}`);

    res.json({
      success: true,
      data: {
        documentoId: documento.id,
        trackId: resultado.trackId,
        estado: resultado.estado,
        mensaje: 'Documento reenviado al SII correctamente',
      },
    });
  } catch (error) {
    logger.error(`[SiiController] Error reenviando documento: ${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener logs de comunicación con SII
 * GET /api/sii/logs
 */
const obtenerLogs = async (req, res) => {
  try {
    // TODO: Implementar sistema de logs de SII en DB
    // Por ahora retorna respuesta stub

    res.json({
      success: true,
      data: {
        logs: [],
        mensaje: 'Sistema de logs de SII pendiente de implementación',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  consultarEstadoDocumento,
  reenviarDocumento,
  obtenerLogs,
};
