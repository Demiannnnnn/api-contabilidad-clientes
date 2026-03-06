const prisma = require('../config/database');

async function auditLog(req, accion, entidad, entidadId, datosAnteriores, datosNuevos, detalles) {
  try {
    if (!req.user || !req.user.tenantId) return;

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        userId: req.user.id || null,
        accion,
        entidad,
        entidadId: entidadId ? String(entidadId) : null,
        datosAnteriores: datosAnteriores || undefined,
        datosNuevos: datosNuevos || undefined,
        ipAddress: req.ip || req.connection?.remoteAddress || null,
        userAgent: req.headers?.['user-agent'] || null,
        detalles: detalles || null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Error writing audit log:', err.message);
  }
}

module.exports = { auditLog };
