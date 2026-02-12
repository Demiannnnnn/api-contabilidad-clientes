const prisma = require('../config/database');
const { includes } = require('zod');

class DocumentoRepository {
    async createDocumento(data) {
        return await prisma.documento.create({
            data: {
                userId: data.userId,
                numero: data.numero,
                clienteId: data.clienteId,
                montoNeto: data.montoNeto,
                montoIva: data.montoIva,
                montoTotal: data.montoTotal,


            },
            includes: {
                trabajador: true,
                user: true,
                tipoDocumento: true,
            },
        });
    }
    async findAll(userId) {
        return await prisma.documento.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }

  
        });
    }
    async findById(id) {
        return await prisma.documento.findUnique({
            where: {id},
        });
    }
    async update(id, data) {
        return await prisma.documento.update({
            where: {id},
            data: {
                tipo: data.tipo,
                numero: data.numero,
                fechaEmision: data.fechaEmision,
                montoNeto: data.monto,
                montoIva: data.montoIva,
                montoTotal: data.montoTotal,
            },
        });
    }
    async delete(id) {
        return await prisma.documento.delete({
            where: {id},
        });
    }
    async search(userId, searchTerm) {
        return await prisma.documento.findMany({
            where: {
                userId,
                OR: [
                    { numero: { contains: searchTerm, mode: 'insensitive' } },
                    { cliente: { nombre: { contains: searchTerm, mode: 'insensitive' } } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                cliente: true,
            },
        });
    }
        
}

module.exports = DocumentoRepository;