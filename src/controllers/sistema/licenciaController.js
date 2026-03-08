const crypto = require('crypto');
const prisma = require('../../config/database');

function generateLicenceKey() {
  return 'LIC-' + crypto.randomBytes(16).toString('hex').toUpperCase();
}

const status = async (req, res) => {
  try {
    const licence = await prisma.licence.findUnique({ where: { userId: req.userId } });
    if (!licence) {
      return res.json({ success: true, licence: null });
    }

    res.json({
      success: true,
      licence: {
        licenceKey: licence.licenceKey,
        status: licence.status,
        expiresAt: licence.expiresAt,
        type: licence.type,
        issuedAt: licence.issuedAt,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const activate = async (req, res) => {
  try {
    const { type, expiresAt, notes } = req.body;
    if (!type || !expiresAt) {
      return res.status(400).json({ success: false, error: 'Se requiere type y expiresAt' });
    }

    const expires = new Date(expiresAt);
    if (isNaN(expires.getTime())) {
      return res.status(400).json({ success: false, error: 'expiresAt debe ser una fecha válida' });
    }

    const existing = await prisma.licence.findUnique({ where: { userId: req.userId } });
    if (existing) {
      const updated = await prisma.licence.update({
        where: { userId: req.userId },
        data: {
          status: 'active',
          type,
          expiresAt: expires,
          notes: notes || null,
        }
      });
      return res.json({
        success: true,
        licence: {
          licenceKey: updated.licenceKey,
          status: updated.status,
          expiresAt: updated.expiresAt,
          type: updated.type,
          issuedAt: updated.issuedAt,
        }
      });
    }

    const licence = await prisma.licence.create({
      data: {
        userId: req.userId,
        licenceKey: generateLicenceKey(),
        status: 'active',
        type,
        expiresAt: expires,
        notes: notes || null,
      }
    });

    res.json({
      success: true,
      licence: {
        licenceKey: licence.licenceKey,
        status: licence.status,
        expiresAt: licence.expiresAt,
        type: licence.type,
        issuedAt: licence.issuedAt,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const cancel = async (req, res) => {
  try {
    const licence = await prisma.licence.findUnique({ where: { userId: req.userId } });
    if (!licence) {
      return res.status(404).json({ success: false, error: 'No existe licencia para este usuario' });
    }

    const updated = await prisma.licence.update({
      where: { userId: req.userId },
      data: { status: 'cancelled' }
    });

    res.json({
      success: true,
      licence: {
        licenceKey: updated.licenceKey,
        status: updated.status,
        expiresAt: updated.expiresAt,
        type: updated.type,
        issuedAt: updated.issuedAt,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { status, activate, cancel };
