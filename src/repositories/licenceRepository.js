const prisma = require('../config/database');

class LicenceRepository {
    async createLicence(data) {
        return await prisma.licence.create({
            data: {
                userId: data.userId,
                key: data.key,
                validUntil: data.validUntil,
            },
        });
    }
    async findAll(userId) {
        return await prisma.licence.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findById(id) {
        return await prisma.licence.findUnique({
            where: {id},
        });
    }
    async update(id, data) {
        return await prisma.licence.update({
            where: {id},
            data: {
                key: data.key,
                validUntil: data.validUntil,
            },
        });
    }
    async delete(id) {
        return await prisma.licence.delete({
            where: {id},
        });
    }
}

module.exports = LicenceRepository;