const prisma = require('../../config/database');
const logger = require('../../utils/logger');
const flowClient = require('../../clients/flow');

// Precios definidos en el servidor — nunca confiar en el cliente
const PLAN_PRICES = {
  monthly: 49990,
  yearly: 499990,
};

// ─── Endpoints ─────────────────────────────────────────

const createOrder = async (req, res) => {
  try {
    if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY) {
      return res.status(503).json({ success: false, error: 'Flow no está configurado en el servidor' });
    }

    const { plan, email } = req.body;
    if (!plan) {
      return res.status(400).json({ success: false, error: 'Se requiere plan' });
    }

    const amount = PLAN_PRICES[plan];
    if (!amount) {
      return res.status(400).json({ success: false, error: `Plan inválido: ${plan}. Planes válidos: ${Object.keys(PLAN_PRICES).join(', ')}` });
    }

    const commerceOrder = `ORD-${req.userId}-${Date.now()}`;
    const returnUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/flow/return`;
    const confirmationUrl = `${process.env.API_URL || 'http://localhost:3000'}/api/flow/webhook`;

    const flowData = await flowClient.createOrder({
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
    if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY) {
      return res.status(503).json({ success: false, error: 'Flow no está configurado en el servidor' });
    }

    const { orderId } = req.params;
    const flowData = await flowClient.getStatusByFlowOrder(orderId);

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

    const flowData = await flowClient.getStatus(token);
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
