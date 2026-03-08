const syncService = require('../../services/sistema/syncService');

const push = async (req, res) => {
  try {
    const { operations } = req.body;
    if (!Array.isArray(operations)) {
      return res.status(400).json({ success: false, error: 'Se esperaba un array de operations' });
    }
    const result = await syncService.push(req.tenantId, operations);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const pull = async (req, res) => {
  try {
    const result = await syncService.pull(req.tenantId, req.query.since);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const resolveConflict = async (req, res) => {
  try {
    const result = await syncService.resolveConflict(req.tenantId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    const result = await syncService.getStatus(req.tenantId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

module.exports = { push, pull, resolveConflict, getStatus };
