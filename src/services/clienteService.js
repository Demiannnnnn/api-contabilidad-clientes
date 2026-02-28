
const clienteRepository = require('../repositories/clienteRepository');
const { validate, schemas } = require('./validationService');
const logger = require('../utils/logger');

const clienteRepo = new clienteRepository();

class ClienteService {

    async crear(userId, data) {
        try {
            logger.info(`[ClienteService.crear] userId: ${userId}`);
            logger.info(`[ClienteService.crear] data: ${JSON.stringify(data)}`);
            logger.debug(`[ClienteService.crear] schemas.cliente:`, schemas.cliente);
            // Validar datos de entrada
            const validated = validate(schemas.cliente, data);

            // Si es tipo EMPRESA, requiere RUT y giro
            if (validated.tipo === 'EMPRESA') {
                if (!validated.rut) throw { status: 400, message: 'Cliente empresa requiere RUT' };
                if (!validated.giro) throw { status: 400, message: 'Cliente empresa requiere giro' };
            }

            // Verificar que no exista otro cliente con el mismo RUT para este user
            if (validated.rut) {
                const existente = await clienteRepo.findByRut(userId, validated.rut);
                if (existente) throw { status: 409, message: 'Ya existe un cliente con ese RUT' };
            }

            const result = await clienteRepo.createCliente({ userId, ...validated });
            logger.info('[ClienteService.crear] Cliente creado:', result);
            return result;
        } catch (error) {
            logger.error('[ClienteService.crear] Error:', error && error.stack ? error.stack : error);
            throw error;
        }
    }

    async obtenerTodos(userId) {
        return await clienteRepo.findAll(userId);
    }

    async obtenerPorId(userId, id) {
        const cliente = await clienteRepo.findById(id);
        if (!cliente) throw { status: 404, message: 'Cliente no encontrado' };

        // Verificar que el cliente pertenece al user
        if (cliente.userId !== userId) throw { status: 403, message: 'No autorizado' };

        return cliente;
    }

    async actualizar(userId, id, data) {
        // Verificar que existe y pertenece al user
        await this.obtenerPorId(userId, id);

        const validated = validate(schemas.cliente, data);

        // Si cambia el RUT, verificar que no exista duplicado
        if (validated.rut) {
            const existente = await clienteRepo.findByRut(userId, validated.rut);
            if (existente && existente.id !== id) {
                throw { status: 409, message: 'Ya existe un cliente con ese RUT' };
            }
        }

        return await clienteRepo.update(id, validated);
    }

    async eliminar(userId, id) {
        const cliente = await this.obtenerPorId(userId, id);

        // Verificar si tiene documentos asociados
        if (cliente.documentos && cliente.documentos.length > 0) {
            throw { status: 400, message: 'No se puede eliminar un cliente con documentos asociados' };
        }

        return await clienteRepo.delete(id);
    }

    async buscar(userId, searchTerm) {
        if (!searchTerm || searchTerm.trim().length < 2) {
            throw { status: 400, message: 'Término de búsqueda debe tener al menos 2 caracteres' };
        }
        return await clienteRepo.search(userId, searchTerm.trim());
    }

    async contarClientes(userId) {
        return await clienteRepo.countClientes(userId);
    }
}

module.exports = new ClienteService();