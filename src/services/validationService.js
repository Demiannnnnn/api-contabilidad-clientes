const { z } = require('zod');
const { validarRut } = require('../utils/helpers');

// === RUT Schema ===
const rutRegex = /^\d{1,8}-[\dkK]$/;
const rutSchema = z.string()
  .transform(val => val.replace(/\./g, '').replace(/\s/g, '').trim())
  .refine(val => rutRegex.test(val), 'Formato de RUT inválido (ej: 12345678-9)')
  .refine(validarRut, 'RUT inválido (dígito verificador no coincide)');

// === Auth Schemas ===
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rut: rutSchema,
  nombre: z.string().min(1, 'Nombre requerido'),
  razon_social: z.string().optional(),
  giro: z.string().optional(),
  machineId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password requerido'),
  machineId: z.string().optional(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

// === Tenant Schema ===
const tenantUpdateSchema = z.object({
  razon_social: z.string().min(1).optional(),
  nombre_fantasia: z.string().optional(),
  giro: z.string().optional(),
  direccion: z.string().optional(),
  comuna: z.string().optional(),
  ciudad: z.string().optional(),
  region: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
});

const tenantSiiConfigSchema = z.object({
  resolucion_sii: z.string().optional(),
  numero_resolucion: z.string().optional(),
  fecha_resolucion: z.string().optional(),
  ambiente_sii: z.enum(['certificacion', 'produccion']).optional(),
});

// === User Schema ===
const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  nombre: z.string().min(1, 'Nombre requerido'),
  rut: rutSchema.optional(),
  rol: z.enum(['administrador', 'vendedor', 'cajero', 'contador']).default('vendedor'),
  permisos: z.record(z.any()).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(1).optional(),
  rut: rutSchema.optional(),
  rol: z.enum(['administrador', 'vendedor', 'cajero', 'contador']).optional(),
  permisos: z.record(z.any()).optional(),
});

// === Cliente Schema ===
const clienteSchema = z.object({
  rut: rutSchema,
  razon_social: z.string().min(1, 'Razón social requerida'),
  nombre_fantasia: z.string().optional(),
  giro: z.string().optional(),
  direccion: z.string().optional(),
  region: z.string().optional(),
  comuna: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  tipo_documento: z.string().optional(),
  contacto_nombre: z.string().optional(),
  contacto_cargo: z.string().optional(),
  contacto_email: z.union([z.string().email(), z.literal('')]).optional(),
  contacto_telefono: z.string().optional(),
  condicion_pago: z.string().optional(),
  dias_credito: z.number().int().min(0).optional(),
  limite_credito: z.number().min(0).optional(),
  descuento_automatico: z.number().min(0).max(100).optional(),
  zona: z.string().optional(),
  lista_precios: z.string().optional(),
  local_id: z.number().int().optional(),
});

const clienteUpdateSchema = clienteSchema.partial();

// === Producto Schema ===
const productoSchema = z.object({
  codigo: z.string().min(1, 'Código requerido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'Precio debe ser positivo'),
  stock: z.number().int().min(0).optional(),
  exento: z.boolean().optional(),
  categoria: z.string().optional(),
  unidad_medida: z.string().optional(),
  stock_minimo: z.number().int().min(0).optional(),
  stock_maximo: z.number().int().min(0).optional().nullable(),
  costo: z.number().min(0).optional().nullable(),
  local_id: z.number().int().optional(),
});

const productoUpdateSchema = productoSchema.partial();

// === Vendedor Schema ===
const vendedorSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().min(1, 'Apellido requerido'),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  telefono: z.string().optional(),
  comision: z.number().min(0).max(100).optional(),
  local_id: z.number().int().optional(),
});

const vendedorUpdateSchema = vendedorSchema.partial();

// === Documento Schema ===
const documentoItemSchema = z.object({
  numero_linea: z.number().int().min(1),
  producto_id: z.string().uuid().optional(),
  codigo_item: z.string().optional(),
  descripcion: z.string().min(1, 'Descripción requerida'),
  cantidad: z.number().min(0.0001),
  unidad: z.string().optional(),
  precio_unitario: z.number().min(0),
  descuento: z.number().min(0).max(100).optional(),
  descuento_monto: z.number().min(0).optional(),
  monto_item: z.number().min(0),
  exento: z.boolean().optional(),
});

const referenciaSchema = z.object({
  tipo_documento_referencia: z.number().int(),
  folio_referencia: z.number().int(),
  fecha_referencia: z.string(),
  razon_referencia: z.string().min(1),
  codigo_referencia: z.number().int().optional(),
  detalle: z.string().optional(),
});

const documentoSchema = z.object({
  tipo_documento: z.number().int(),
  folio: z.number().int().min(1),
  cliente_id: z.string().uuid().optional(),
  cliente_rut: z.string().optional(),
  cliente_razon_social: z.string().optional(),
  cliente_giro: z.string().optional(),
  cliente_direccion: z.string().optional(),
  cliente_comuna: z.string().optional(),
  fecha_emision: z.string(),
  fecha_vencimiento: z.string().optional(),
  subtotal: z.number(),
  monto_exento: z.number().optional(),
  descuento_global: z.number().optional(),
  iva: z.number(),
  total: z.number(),
  forma_pago: z.string().optional(),
  forma_pago_detalle: z.string().optional(),
  condiciones_pago: z.string().optional(),
  orden_compra: z.string().optional(),
  vendedor_id: z.string().uuid().optional(),
  estado: z.string().optional(),
  observaciones: z.string().optional(),
  direccion_despacho: z.string().optional(),
  fecha_despacho: z.string().optional(),
  transportista: z.string().optional(),
  patente: z.string().optional(),
  items: z.array(documentoItemSchema).min(1, 'Debe tener al menos un item'),
  referencias: z.array(referenciaSchema).optional(),
  local_id: z.number().int().optional(),
});

const documentoUpdateSchema = z.object({
  estado: z.string().optional(),
  forma_pago: z.string().optional(),
  forma_pago_detalle: z.string().optional(),
  condiciones_pago: z.string().optional(),
  observaciones: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
});

// === Pago Schema ===
const pagoSchema = z.object({
  documento_id: z.string().uuid(),
  monto: z.number().min(0.01),
  fecha_pago: z.string(),
  forma_pago: z.string().min(1),
  referencia: z.string().optional(),
  observaciones: z.string().optional(),
  local_id: z.number().int().optional(),
});

// === Sync Schema ===
const syncPushSchema = z.object({
  operations: z.array(z.object({
    id: z.string().optional(),
    entity_type: z.string(),
    entity_local_id: z.number().int(),
    operation: z.enum(['create', 'update', 'delete']),
    payload: z.record(z.any()),
    queued_at: z.string().optional(),
  })),
});

// === Licencia Schema ===
const licenciaValidateSchema = z.object({
  machine_id: z.string().min(1),
});

const licenciaActivateSchema = z.object({
  licencia_key: z.string().min(1),
});

// === Generic validate function ===
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(e => ({
      campo: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
      mensaje: e.message,
    }));
    const err = new Error('Error de validación');
    err.status = 400;
    err.errors = errors;
    throw err;
  }
  return result.data;
}

module.exports = {
  validate,
  // Direct exports for convenience
  registerSchema,
  loginSchema,
  changePasswordSchema,
  tenantUpdateSchema,
  tenantSiiConfigSchema,
  createUserSchema,
  updateUserSchema,
  clienteSchema,
  clienteUpdateSchema,
  productoSchema,
  productoUpdateSchema,
  vendedorSchema,
  vendedorUpdateSchema,
  documentoSchema,
  documentoUpdateSchema,
  documentoItemSchema,
  pagoSchema,
  syncPushSchema,
  licenciaValidateSchema,
  licenciaActivateSchema,
  referenciaSchema,
  // Also export as nested object for backward compat
  schemas: {
    register: registerSchema,
    login: loginSchema,
    changePassword: changePasswordSchema,
    tenantUpdate: tenantUpdateSchema,
    tenantSiiConfig: tenantSiiConfigSchema,
    createUser: createUserSchema,
    updateUser: updateUserSchema,
    cliente: clienteSchema,
    clienteUpdate: clienteUpdateSchema,
    producto: productoSchema,
    productoUpdate: productoUpdateSchema,
    vendedor: vendedorSchema,
    vendedorUpdate: vendedorUpdateSchema,
    documento: documentoSchema,
    documentoUpdate: documentoUpdateSchema,
    documentoItem: documentoItemSchema,
    pago: pagoSchema,
    syncPush: syncPushSchema,
    licenciaValidate: licenciaValidateSchema,
    licenciaActivate: licenciaActivateSchema,
    referencia: referenciaSchema,
  },
};
