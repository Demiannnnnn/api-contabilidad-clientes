const prisma = require('../config/database');

async function auditLog(req, accion, entidad, entidadId, datosAnteriores, datosNuevos, detalles) {
  try {
    if (!req.user || !req.user.id) return;

    // AuditLog model not yet in schema — log to console for now
    console.log(`[AuditLog] user=${req.user.id} accion=${accion} entidad=${entidad} id=${entidadId}`);
  } catch (err) {
    console.error('[AuditLog] Error writing audit log:', err.message);
  }
}

module.exports = { auditLog };
