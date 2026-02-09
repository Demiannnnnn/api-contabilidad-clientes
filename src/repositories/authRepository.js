const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

class AuthRepository {
    async findByEmail(email) {
        return await prisma.user.findUnique({ where: { email } });
    }

    async createUser(data) {
        return await prisma.user.create({ data });
    }

    async findById(id) {
        return await prisma.user.findUnique({ where: { id } });
    }

    async updatePassword(id, hashedPassword) {
        return await prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
    }
}

module.exports = AuthRepository;