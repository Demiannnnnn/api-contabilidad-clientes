const prisma = require('../config/database');

class UserRepository {
    async createUser(data) {
        return await prisma.user.create({
            data: {
                email: data.email.trim().toLowerCase(),
                password: data.password,
                name: data.name,
                rut: data.rut
            },
        });
    }
    async updatePassword(id, hashedPassword) {
        return await prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
            },
        });
    }
    async findById(id) {
        return await prisma.user.findUnique({
            where: { id },
        });
    }
    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: { email },
        });
    }

    async findByEmailOrName(identifier) {
        return await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: identifier, mode: 'insensitive' } },
                    { name: { equals: identifier, mode: 'insensitive' } }
                ]
            }
        });
    }


    async delete(id) {
        return await prisma.user.delete({
            where: { id },
        });
    }

    async update(id, data) {
        return await prisma.user.update({
            where: { id },
            data: {
                email: data.email,
                password: data.password,
                name: data.name,
            },
        });
    }
    async findAll() {
        return await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                cliente: true,
            }
        });
    }
}

module.exports = new UserRepository();