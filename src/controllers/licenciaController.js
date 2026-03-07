const prisma = require('../config/database');

const validate = async (req, res) => {
  try {
    // Check user's licence
    const licence = await prisma.licence.findFirst({ where: { userId: req.userId } });
    if (!licence) {
      return res.json({
        success: true,
        data: { valid: false, plan: 'free', estado: 'none', expira: null }
      });
    }

    const isValid = licence.status === 'active' || licence.status === 'trial';
    const isExpired = licence.expiresAt && new Date() > new Date(licence.expiresAt);

    res.json({
      success: true,
      data: {
        valid: isValid && !isExpired,
        estado: licence.status,
        expira: licence.expiresAt,
        type: licence.type,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const status = async (req, res) => {
  try {
    const licence = await prisma.licence.findFirst({ where: { userId: req.userId } });
    if (!licence) {
      return res.json({ success: true, data: { plan: 'free', estado: 'none' } });
    }

    res.json({
      success: true,
      data: {
        estado: licence.status,
        expira: licence.expiresAt,
        type: licence.type,
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

    // Create or update licence
    const existing = await prisma.licence.findFirst({ where: { userId: req.userId } });
    if (existing) {
      const updated = await prisma.licence.update({
        where: { id: existing.id },
        data: {
          licenceKey: licencia_key,
          status: 'active',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }
      });
      return res.json({ success: true, data: updated });
    }

    const licence = await prisma.licence.create({
      data: {
        userId: req.userId,
        licenceKey: licencia_key,
        status: 'active',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      }
    });

    res.json({ success: true, data: licence });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { validate, status, activate };
