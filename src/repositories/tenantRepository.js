const prisma = require('../config/database');

// Tenant model doesn't exist — the User itself is the tenant in this single-user system
class TenantRepository {
  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  }

  async update(id, data) {
    return prisma.user.update({ where: { id }, data });
  }

  async updateSiiConfig(id, data) {
    // SII config not in schema yet
    console.warn('[TenantRepository] SII config fields not in schema yet');
    return this.findById(id);
  }
}

module.exports = new TenantRepository();
