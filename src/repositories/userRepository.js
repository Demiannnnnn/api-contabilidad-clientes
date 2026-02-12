const {PrismaClient} = require('@prisma/client');
const { AnyNullClass } = require('@prisma/client/runtime/client');
const { includes } = require('zod');
const prisma = new PrismaClient();

class userRepository {
    async createUser(data) {
        return await prisma.user.create({
            data: {
                email: data.email,
                password: data.password,
                name: data.name,

            },
            includes: {
                cliente: true,
            }
        });
    }
    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: {email},
            include: {
                cliente: true,
            }
        });
    }
           
    
    async delete(id) {
        return await prisma.user.delete({
            where: {id},
        });
    }

    async update(id, data) {
        return await prisma.user.update({
            where: {id},
            data: {
                email: data.email,
                password: data.password,
                name: data.name,
            },
        });
    }
    async findAll() {
        return await prisma.user.findMany({
            orderBy: {createdAt: 'desc'},
            include: {
                cliente: true,
            }
        });
    }
}

module.exports = userRepository;
