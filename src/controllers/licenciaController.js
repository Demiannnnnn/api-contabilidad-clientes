const prisma = require('../config/database');

const validate = async (req, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({ where: { id: req.tenantId } });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant no encontrado' });

    const isValid = tenant.licenciaEstado === 'active' || tenant.licenciaEstado === 'trial';
    const isExpired = tenant.licenciaExpira && new Date() > new Date(tenant.licenciaExpira);

    res.json({
      success: true,
      data: {
        valid: isValid && !isExpired,
        plan: tenant.plan,
        estado: tenant.licenciaEstado,
        expira: tenant.licenciaExpira,
        maxUsuarios: tenant.maxUsuarios,
        maxDocumentosMes: tenant.maxDocumentosMes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const status = async (req, res) => {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { id: req.tenantId },
      select: { plan: true, licenciaEstado: true, licenciaExpira: true, maxUsuarios: true, maxDocumentosMes: true, licenciaKey: true }
    });
    if (!tenant) return res.status(404).json({ success: false, error: 'Tenant no encontrado' });

    // Count current usage
    const [userCount, docCount] = await Promise.all([
      prisma.user.count({ where: { tenantId: req.tenantId, activo: true } }),
      prisma.documento.count({
        where: {
          tenantId: req.tenantId,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        plan: tenant.plan,
        estado: tenant.licenciaEstado,
        expira: tenant.licenciaExpira,
        limites: {
          usuarios: { usado: userCount, maximo: tenant.maxUsuarios },
          documentosMes: { usado: docCount, maximo: tenant.maxDocumentosMes }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const activate = async (req, res) => {
  try {
    const { licencia_key } = req.body;
    if (!licencia_key) return res.status(400).json({ success: false, error: 'Se requiere licencia_key' });

    // TODO: Validate licencia_key against external service or database
    const updated = await prisma.tenant.update({
      where: { id: req.tenantId },
      data: {
        licenciaKey: licencia_key,
        licenciaEstado: 'active',
        licenciaExpira: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        plan: 'basic' // Default upgrade plan
      }
    });

    res.json({
      success: true,
      data: {
        plan: updated.plan,
        estado: updated.licenciaEstado,
        expira: updated.licenciaExpira
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { validate, status, activate };
