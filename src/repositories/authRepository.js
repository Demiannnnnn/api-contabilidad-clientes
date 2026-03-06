const prisma = require('../config/database');

class AuthRepository {
  async findUserByEmail(tenantId, email) {
    return prisma.user.findFirst({
      where: { tenantId, email: { equals: email, mode: 'insensitive' } },
      include: { tenant: true },
    });
  }

  async findUserByEmailGlobal(email) {
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { tenant: true },
    });
  }

  async findUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: { tenant: true },
    });
  }

  async findTenantByRut(rut) {
    return prisma.tenant.findUnique({ where: { rut } });
  }

  async createTenantAndUser(tenantData, userData) {
    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: tenantData });
      const user = await tx.user.create({
        data: { ...userData, tenantId: tenant.id },
        include: { tenant: true },
      });
      return { tenant, user };
    });
  }

  async createRefreshToken(data) {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshTokenByHash(tokenHash) {
    return prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false },
      include: { user: { include: { tenant: true } } },
    });
  }

  async revokeRefreshToken(id) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revoked: true },
    });
  }

  async revokeAllUserTokens(userId) {
    return prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }

  async updateUserPassword(userId, passwordHash) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async updateUserLastAccess(userId) {
    return prisma.user.update({
      where: { id: userId },
      data: { ultimoAcceso: new Date() },
    });
  }

  async cleanExpiredTokens() {
    return prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  }
}

module.exports = new AuthRepository();
