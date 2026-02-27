const prisma = require('../config/database');

class ClienteRepository {
    // crear nuevo cliente
    async createCliente(data) {
        return await prisma.cliente.create({
            data: {
                userId: data.userId,
                rut: data.rut,
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                direccion: data.direccion,
                giro: data.giro,
            },

            include: {
                user: true,
                documentos: true
            },

        });
    }
    async findAll(userId) {
        return await prisma.cliente.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                documentos: true,
            }
        });
    }
    async findById(id) {
        return await prisma.cliente.findUnique({
            where: { id },
            include: {
                user: true,
                documentos: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });
    }
    async findByRut(userId, rut) {
        return await prisma.cliente.findFirst({
            where: {
                userId,
                rut
            }
        });
    }
    async update(id, data) {
        return await prisma.cliente.update({
            where: { id },
            data: {
                rut: data.rut,
                nombre: data.nombre,
                email: data.email,
                telefono: data.telefono,
                direccion: data.direccion,
                giro: data.giro,

            }
        });
    }
    async delete(id) {
        return await prisma.cliente.delete({
            where: { id }
        });
    }
    async search(userId, searchTerm) {
        return await prisma.cliente.findMany({
            where: {
                userId,
                OR: [
                    { nombre: { contains: searchTerm, mode: 'insensitive' } },
                    { rut: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                ]
            }
        });
    }
    async countClientes(userId) {
        return await prisma.cliente.count({
            where: { userId }
        });
    }

}

module.exports = ClienteRepository;
