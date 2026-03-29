const FlowClient = require('./flowClient');

const flowClient = new FlowClient(
  process.env.FLOW_API_KEY,
  process.env.FLOW_SECRET_KEY,
  process.env.FLOW_API_URL || 'https://www.flow.cl/api'
);

module.exports = flowClient;
