const prisma = require('../config/database');

class TenantRepository {
  async findById(id) {
    return prisma.tenant.findUnique({ where: { id } });
  }

  async update(id, data) {
    return prisma.tenant.update({ where: { id }, data });
  }

  async updateSiiConfig(id, data) {
    return prisma.tenant.update({ where: { id }, data });
  }
}

module.exports = new TenantRepository();
