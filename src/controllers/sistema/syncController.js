const syncService = require('../../services/sistema/syncService');
const logger = require('../../utils/logger');

const push = async (req, res) => {
  try {
    const { operations } = req.body;
    logger.info(`[SyncController.push] tenant=${req.tenantId} operations=${Array.isArray(operations) ? operations.length : 'invalid'}`);
    if (!Array.isArray(operations)) {
      logger.error(`[SyncController.push] tenant=${req.tenantId} invalid operations payload`);
      return res.status(400).json({ success: false, error: 'Se esperaba un array de operations' });
    }
    const result = await syncService.push(req.tenantId, operations);
    logger.info(`[SyncController.push] tenant=${req.tenantId} done results=${result.results.length} conflicts=${result.conflicts.length} failed=${result.failed.length}`);
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`[SyncController.push] tenant=${req.tenantId} error=${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const pull = async (req, res) => {
  try {
    logger.info(`[SyncController.pull] tenant=${req.tenantId} since=${req.query.since || 'epoch'}`);
    const result = await syncService.pull(req.tenantId, req.query.since);
    const counts = {
      clientes: (result.entities.clientes || []).length,
      productos: (result.entities.productos || []).length,
      trabajadores: (result.entities.trabajadores || []).length,
      documentos: (result.entities.documentos || []).length,
    };
    logger.info(`[SyncController.pull] tenant=${req.tenantId} done`, counts);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[SyncController.pull] tenant=${req.tenantId} error=${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const resolveConflict = async (req, res) => {
  try {
    logger.info(`[SyncController.resolveConflict] tenant=${req.tenantId} entityType=${req.body?.entity_type} entityId=${req.body?.entity_id} resolution=${req.body?.resolution}`);
    const result = await syncService.resolveConflict(req.tenantId, req.body);
    logger.info(`[SyncController.resolveConflict] tenant=${req.tenantId} done resolution=${result.resolution}`);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[SyncController.resolveConflict] tenant=${req.tenantId} error=${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    logger.info(`[SyncController.getStatus] tenant=${req.tenantId}`);
    const result = await syncService.getStatus(req.tenantId);
    logger.info(`[SyncController.getStatus] tenant=${req.tenantId} done`, result);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`[SyncController.getStatus] tenant=${req.tenantId} error=${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { push, pull, resolveConflict, getStatus };
