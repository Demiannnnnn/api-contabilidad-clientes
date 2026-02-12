const prisma = require('../config/database');

class ProductoRepository {
    async createProducto(data) {
        return await prisma.producto.create({
            data: {
                userId: data.userId,
                nombre: data.nombre,
                descripcion: data.descripcion,
                precio: data.precio,
                stock: data.stock,
            },
            include: {
                user: true,
            },
        });
    }
    async findAll(userId) {
        return await prisma.producto.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async findById(id) {
        return await prisma.producto.findUnique({
            where: {id},
        });
    }
    async update(id, data) {
        return await prisma.producto.update({
            where: {id},
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                precio: data.precio,
                stock: data.stock,
            },
        });
    }
    async delete(id) {
        return await prisma.producto.delete({
            where: {id},
        });
    }
}

module.exports = ProductoRepository;