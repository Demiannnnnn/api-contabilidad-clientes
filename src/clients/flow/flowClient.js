const crypto = require('crypto');
const logger = require('../../utils/logger');

class FlowClient {
  constructor(apiKey, secretKey, apiUrl = 'https://www.flow.cl/api') {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.apiUrl = apiUrl;
  }

  // ─── Privados ───────────────────────────────────────────

  _signParams(params) {
    const sorted = Object.keys(params)
      .sort()
      .map(k => `${k}${params[k]}`)
      .join('');
    return crypto.createHmac('sha256', this.secretKey).update(sorted).digest('hex');
  }

  async _post(endpoint, params) {
    params.apiKey = this.apiKey;
    params.s = this._signParams(params);

    const body = new URLSearchParams(params);
    const res = await fetch(`${this.apiUrl}${endpoint}`, {
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

  async _get(endpoint, params) {
    params.apiKey = this.apiKey;
    params.s = this._signParams(params);

    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${this.apiUrl}${endpoint}?${qs}`);

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.message || 'Error en API Flow');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  // ─── Públicos ───────────────────────────────────────────

  async createOrder(orderData) {
    logger.info('[FlowClient] Creando orden:', orderData.commerceOrder);
    return this._post('/payment/create', orderData);
  }

  async getStatus(token) {
    logger.info('[FlowClient] Consultando estado con token:', token);
    return this._get('/payment/getStatus', { token });
  }

  async getStatusByFlowOrder(flowOrder) {
    logger.info('[FlowClient] Consultando estado por flowOrder:', flowOrder);
    return this._get('/payment/getStatus', { flowOrder });
  }
}

module.exports = FlowClient;
