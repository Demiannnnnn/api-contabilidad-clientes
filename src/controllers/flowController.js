// Flow Stubs — Real implementation pending Flow.cl integration

const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    // TODO: Implement real Flow.cl API integration
    res.json({
      success: true,
      data: {
        paymentUrl: null,
        orderNumber: `ORD-${Date.now()}`,
        plan,
        mensaje: 'Stub: Integración con Flow.cl pendiente de implementar'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    res.json({
      success: true,
      data: {
        orderId,
        status: 'pending',
        mensaje: 'Stub: Consulta de estado Flow pendiente de implementar'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const webhook = async (req, res) => {
  try {
    // TODO: Validate Flow signature, process payment confirmation
    console.log('[FLOW WEBHOOK]', req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const returnPage = async (req, res) => {
  res.json({ success: true, message: 'Pago procesado. Puede cerrar esta ventana.' });
};

module.exports = { createOrder, getStatus, webhook, returnPage };
