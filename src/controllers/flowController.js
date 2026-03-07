const crypto = require('crypto');
const prisma = require('../config/database');
const logger = require('../utils/logger');

const FLOW_API_URL = process.env.FLOW_API_URL || 'https://www.flow.cl/api';
const FLOW_API_KEY = process.env.FLOW_API_KEY;
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY;

// ─── Helpers ───────────────────────────────────────────
function signParams(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join('');
  return crypto.createHmac('sha256', FLOW_SECRET_KEY).update(sorted).digest('hex');
}

async function flowPost(endpoint, params) {
  params.apiKey = FLOW_API_KEY;
  params.s = signParams(params);

  const body = new URLSearchParams(params);
  const res = await fetch(`${FLOW_API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Error en API Flow');
    err.status = res.status;
    throw err;
  }
  return data;
}

async function flowGet(endpoint, params) {
  params.apiKey = FLOW_API_KEY;
  params.s = signParams(params);

  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${FLOW_API_URL}${endpoint}?${qs}`);

  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || 'Error en API Flow');
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─── Endpoints ─────────────────────────────────────────

const createOrder = async (req, res) => {
  try {
    if (!FLOW_API_KEY || !FLOW_SECRET_KEY) {
      return res.status(503).json({ success: false, error: 'Flow no está configurado en el servidor' });
    }

    const { plan, amount, email } = req.body;
    if (!plan || !amount) {
      return res.status(400).json({ success: false, error: 'Se requiere plan y amount' });
    }

    const commerceOrder = `ORD-${req.userId}-${Date.now()}`;
    const returnUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/flow/return`;
    const confirmationUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/flow/webhook`;

    const flowData = await flowPost('/payment/create', {
      commerceOrder,
      subject: `Licencia ${plan}`,
      currency: 'CLP',
      amount: String(amount),
      email: email || req.user.email,
      urlConfirmation: confirmationUrl,
      urlReturn: returnUrl,
    });

    res.json({
      success: true,
      data: {
        paymentUrl: `${flowData.url}?token=${flowData.token}`,
        flowOrder: flowData.flowOrder,
        commerceOrder,
      }
    });
  } catch (error) {
    logger.error(`Flow createOrder error: ${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    if (!FLOW_API_KEY || !FLOW_SECRET_KEY) {
      return res.status(503).json({ success: false, error: 'Flow no está configurado en el servidor' });
    }

    const { orderId } = req.params;
    const flowData = await flowGet('/payment/getStatus', { flowOrder: orderId });

    const response = {
      success: true,
      data: {
        flowOrder: flowData.flowOrder,
        commerceOrder: flowData.commerceOrder,
        status: flowData.status,
        amount: flowData.amount,
        payer: flowData.payer,
      }
    };

    // status 2 = pagado en Flow
    if (flowData.status === 2) {
      const licence = await prisma.licence.findUnique({ where: { userId: req.userId } });
      if (licence) {
        response.data.licence = {
          licenceKey: licence.licenceKey,
          status: licence.status,
          expiresAt: licence.expiresAt,
          type: licence.type,
          issuedAt: licence.issuedAt,
        };
      }
    }

    res.json(response);
  } catch (error) {
    logger.error(`Flow getStatus error: ${error.message}`);
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
};

const webhook = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token requerido' });
    }

    const flowData = await flowGet('/payment/getStatus', { token });
    logger.info(`[FLOW WEBHOOK] order=${flowData.flowOrder} status=${flowData.status}`);

    // status 2 = pagado
    if (flowData.status === 2 && flowData.commerceOrder) {
      const match = flowData.commerceOrder.match(/^ORD-(\d+)-/);
      if (match) {
        const userId = parseInt(match[1], 10);
        const existing = await prisma.licence.findUnique({ where: { userId } });
        if (existing) {
          await prisma.licence.update({
            where: { userId },
            data: { status: 'active' },
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    logger.error(`Flow webhook error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

const returnPage = async (req, res) => {
  res.json({ success: true, message: 'Pago procesado. Puede cerrar esta ventana.' });
};

module.exports = { createOrder, getStatus, webhook, returnPage };
