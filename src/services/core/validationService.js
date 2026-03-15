const { z } = require('zod');
const { validarRut } = require('../../utils/helpers');

// === RUT Schema ===
const rutRegex = /^\d{1,8}-[\dkK]$/;
const rutSchema = z.string()
  .transform(val => val.replace(/\./g, '').replace(/\s/g, '').trim())
  .refine(val => rutRegex.test(val), 'Formato de RUT inválido (ej: 12345678-9)')
  .refine(validarRut, 'RUT inválido (dígito verificador no coincide)');

// === Auth Schemas ===
const registerSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rut: rutSchema,
  name: z.string().min(1, 'Nombre requerido'),
  razon_social: z.string().optional(),
  giro: z.string().optional(),
  machineId: z.string().optional(),
}).transform((data) => {
  return { ...data, nombre: data.name, name: undefined };
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
  rol: z.enum(['administrador', 'trabajador', 'cajero', 'contador']).default('trabajador'),
  permisos: z.record(z.any()).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(1).optional(),
  rut: rutSchema.optional(),
  rol: z.enum(['administrador', 'trabajador', 'cajero', 'contador']).optional(),
  permisos: z.record(z.any()).optional(),
});

// === Helper: camelCase to snake_case ===
function camelToSnake(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
    result[snakeKey] = value;
  }
  return result;
}

// === Cliente Schema (camelCase — matches app + Prisma) ===
const clienteSchemaBase = z.object({
  rut: rutSchema,
  razonSocial: z.string().min(1, 'Razón social requerida'),
  nombreFantasia: z.string().optional(),
  giro: z.string().optional(),
  direccion: z.string().optional(),
  region: z.string().optional(),
  comuna: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  tipoDocumento: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoCargo: z.string().optional(),
  contactoEmail: z.union([z.string().email(), z.literal('')]).optional(),
  contactoTelefono: z.string().optional(),
  condicionPago: z.string().optional(),
  diasCredito: z.number().int().min(0).optional(),
  limiteCredito: z.number().min(0).optional(),
  descuentoAutomatico: z.number().min(0).max(100).optional(),
  zona: z.string().optional(),
  listaPrecios: z.string().optional(),
  localId: z.number().int().optional(),
});

const clienteSchema = clienteSchemaBase;
const clienteUpdateSchema = clienteSchemaBase.partial();

// === Producto Schema (accepts camelCase from app + snake_case) ===
const productoSchema = z.object({
  codigo: z.string().min(1, 'Código requerido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'Precio debe ser positivo'),
  stock: z.number().int().min(0).optional(),
  exento: z.union([z.boolean(), z.number()]).optional().transform(v => v === undefined ? undefined : Boolean(v)),
  activo: z.union([z.boolean(), z.number()]).optional().transform(v => v === undefined ? undefined : Boolean(v)),
  categoria: z.string().optional(),
  categoriaId: z.number().int().optional(),
  // Accept both camelCase and snake_case
  unidadMedida: z.string().optional(),
  unidad_medida: z.string().optional(),
  stockMinimo: z.number().int().min(0).optional(),
  stock_minimo: z.number().int().min(0).optional(),
  stockMaximo: z.number().int().min(0).optional().nullable(),
  stock_maximo: z.number().int().min(0).optional().nullable(),
  costo: z.number().min(0).optional().nullable(),
  localId: z.number().int().optional(),
  local_id: z.number().int().optional(),
  syncHash: z.string().optional(),
  syncStatus: z.string().optional(),
}).transform(data => ({
  ...data,
  // Normalize to camelCase
  unidadMedida: data.unidadMedida || data.unidad_medida,
  stockMinimo: data.stockMinimo ?? data.stock_minimo,
  stockMaximo: data.stockMaximo ?? data.stock_maximo,
  localId: data.localId ?? data.local_id,
  // Remove snake_case duplicates
  unidad_medida: undefined,
  stock_minimo: undefined,
  stock_maximo: undefined,
  local_id: undefined,
}));

const productoUpdateSchema = z.object({
  codigo: z.string().min(1).optional(),
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  precio: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  exento: z.union([z.boolean(), z.number()]).optional().transform(v => v === undefined ? undefined : Boolean(v)),
  activo: z.union([z.boolean(), z.number()]).optional().transform(v => v === undefined ? undefined : Boolean(v)),
  categoria: z.string().optional(),
  categoriaId: z.number().int().optional(),
  unidadMedida: z.string().optional(),
  unidad_medida: z.string().optional(),
  stockMinimo: z.number().int().min(0).optional(),
  stock_minimo: z.number().int().min(0).optional(),
  stockMaximo: z.number().int().min(0).optional().nullable(),
  stock_maximo: z.number().int().min(0).optional().nullable(),
  costo: z.number().min(0).optional().nullable(),
  localId: z.number().int().optional(),
  local_id: z.number().int().optional(),
  syncHash: z.string().optional(),
  syncStatus: z.string().optional(),
}).transform(data => ({
  ...data,
  unidadMedida: data.unidadMedida || data.unidad_medida,
  stockMinimo: data.stockMinimo ?? data.stock_minimo,
  stockMaximo: data.stockMaximo ?? data.stock_maximo,
  localId: data.localId ?? data.local_id,
  unidad_medida: undefined,
  stock_minimo: undefined,
  stock_maximo: undefined,
  local_id: undefined,
}));

// === Trabajador Schema ===
const trabajadorSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido'),
  apellido: z.string().min(1, 'Apellido requerido'),
  rut: rutSchema,
  cargo: z.string().optional(),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  activo: z.boolean().optional(),
  telefono: z.string().optional(),
  comision: z.number().min(0).max(100).optional(),
  local_id: z.number().int().optional(),
});

const trabajadorUpdateSchema = trabajadorSchema.partial();

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
  trabajador_id: z.string().uuid().optional(),
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
  trabajadorSchema,
  trabajadorUpdateSchema,
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
    trabajador: trabajadorSchema,
    trabajadorUpdate: trabajadorUpdateSchema,
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
