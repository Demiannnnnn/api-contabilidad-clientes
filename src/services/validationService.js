const { z } = require('zod');

// === Helpers ===

// Validación de RUT chileno (formato: 12345678-9)
const rutRegex = /^\d{1,8}-[\dkK]$/;

function validarRut(rut) {
    if (!rutRegex.test(rut)) return false;
    const [cuerpo, dv] = rut.split('-');
    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'k' : String(dvEsperado);
    return dv.toLowerCase() === dvFinal;
}

const rutSchema = z.string().regex(rutRegex, 'Formato de RUT inválido (ej: 12345678-9)').refine(validarRut, 'RUT inválido');

// === Schemas de validación ===

// Auth
const registerSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    name: z.string().min(1).optional(),
    rut: rutSchema,
    razonSocial: z.string().optional(),
    giro: z.string().optional(),
    direccion: z.string().optional(),
    role: z.enum(['EMPRESA', 'PERSONAL']).optional(),
});

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Password requerido'),
});

// Cliente
const clienteSchema = z.object({
    rut: rutSchema.optional(),
    nombre: z.string().min(1, 'Nombre requerido'),
    email: z.string().email().optional(),
    telefono: z.string().optional(),
    direccion: z.string().optional(),
    giro: z.string().optional(),
    tipo: z.enum(['PERSONA', 'EMPRESA']).optional(),
});

// Producto
const productoSchema = z.object({
    codigo: z.string().min(1, 'Código requerido'),
    nombre: z.string().min(1, 'Nombre requerido'),
    descripcion: z.string().optional(),
    precio: z.number().int().min(0, 'Precio debe ser positivo'),
    stock: z.number().int().min(0).optional(),
    exento: z.boolean().optional(),
    categoriaId: z.number().int().positive().optional(),
});

// Documento Item
const documentoItemSchema = z.object({
    productoId: z.number().int().positive('Producto requerido'),
    cantidad: z.number().int().min(1, 'Cantidad mínima es 1'),
    precio: z.number().int().min(0),
    descuento: z.number().int().min(0).optional(),
    exento: z.boolean().optional(),
});

// Documento (Factura/Boleta)
const documentoSchema = z.object({
    tipo: z.enum([
        'FACTURA_ELECTRONICA',
        'FACTURA_EXENTA',
        'BOLETA_ELECTRONICA',
        'BOLETA_EXENTA',
        'NOTA_CREDITO',
        'NOTA_DEBITO',
        'GUIA_DESPACHO',
    ]),
    clienteId: z.number().int().positive().optional(),
    trabajadorId: z.number().int().positive().optional(),
    items: z.array(documentoItemSchema).min(1, 'Debe tener al menos un item'),
}).refine((data) => {
    // Factura requiere clienteId
    const requiereCliente = ['FACTURA_ELECTRONICA', 'FACTURA_EXENTA'].includes(data.tipo);
    if (requiereCliente && !data.clienteId) return false;
    return true;
}, { message: 'Factura requiere un cliente asociado' });

// Trabajador
const trabajadorSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
    rut: rutSchema,
    cargo: z.string().optional(),
    email: z.string().email().optional(),
});

// Categoria
const categoriaSchema = z.object({
    nombre: z.string().min(1, 'Nombre requerido'),
});

// === Función genérica de validación ===

function validate(schema, data) {
    const result = schema.safeParse(data);
    if (!result.success) {
        const errors = result.error.errors.map(e => ({
            campo: e.path.join('.'),
            mensaje: e.message,
        }));
        throw { status: 400, errors };
    }
    return result.data;
}

// === Exports ===

module.exports = {
    validate,
    validarRut,
    schemas: {
        register: registerSchema,
        login: loginSchema,
        cliente: clienteSchema,
        producto: productoSchema,
        documento: documentoSchema,
        documentoItem: documentoItemSchema,
        trabajador: trabajadorSchema,
        categoria: categoriaSchema,
    },
};