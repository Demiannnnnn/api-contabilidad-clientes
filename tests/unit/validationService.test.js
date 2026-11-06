const v = require('../../src/services/validationService');

function expectValidationError(schema, data, campo) {
  try {
    v.validate(schema, data);
  } catch (err) {
    expect(err.status).toBe(400);
    expect(err.message).toBe('Error de validación');
    if (campo) expect(err.errors.map(e => e.campo)).toContain(campo);
    return err;
  }
  throw new Error('Se esperaba error de validación');
}

describe('validate()', () => {
  test('devuelve los datos parseados si son válidos', () => {
    expect(v.validate(v.loginSchema, { email: 'a@b.cl', password: 'x' })).toEqual({ email: 'a@b.cl', password: 'x' });
  });

  test('lanza error 400 con lista campo/mensaje', () => {
    const err = expectValidationError(v.loginSchema, { email: 'malo', password: '' });
    expect(err.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ campo: 'email' }),
      expect.objectContaining({ campo: 'password' }),
    ]));
  });
});

describe('registerSchema', () => {
  const base = { email: 'a@b.cl', password: '12345678', rut: '11.111.111-1' };

  test('normaliza RUT y acepta "name" como alias de "nombre"', () => {
    const out = v.validate(v.registerSchema, { ...base, name: 'Juan' });
    expect(out.rut).toBe('11111111-1');
    expect(out.nombre).toBe('Juan');
    expect(out.name).toBeUndefined();
  });

  test('sin nombre ni name responde error de validación 400 (no 500)', () => {
    expectValidationError(v.registerSchema, base, 'nombre');
  });

  test('rechaza RUT con dígito verificador incorrecto', () => {
    expectValidationError(v.registerSchema, { ...base, nombre: 'J', rut: '11111111-2' }, 'rut');
  });

  test('rechaza password corta', () => {
    expectValidationError(v.registerSchema, { ...base, nombre: 'J', password: '123' }, 'password');
  });
});

describe('createUserSchema', () => {
  test('rol por defecto vendedor y rechaza roles desconocidos', () => {
    const out = v.validate(v.createUserSchema, { email: 'a@b.cl', password: '12345678', nombre: 'x' });
    expect(out.rol).toBe('vendedor');
    expectValidationError(v.createUserSchema, { email: 'a@b.cl', password: '12345678', nombre: 'x', rol: 'root' }, 'rol');
  });
});

describe('clienteSchema', () => {
  test('acepta email vacío y rechaza descuento > 100', () => {
    const ok = v.validate(v.clienteSchema, { rut: '12.345.678-5', razonSocial: 'ACME', email: '' });
    expect(ok.rut).toBe('12345678-5');
    expectValidationError(v.clienteSchema, { rut: '12345678-5', razonSocial: 'ACME', descuentoAutomatico: 150 }, 'descuentoAutomatico');
  });

  test('update parcial permite objeto vacío', () => {
    expect(v.validate(v.clienteUpdateSchema, {})).toEqual({});
  });
});

describe('productoSchema', () => {
  test('normaliza snake_case a camelCase y números a booleanos', () => {
    const out = v.validate(v.productoSchema, {
      codigo: 'P1', nombre: 'Prod', precio: 1000,
      unidad_medida: 'KG', stock_minimo: 2, local_id: 7, exento: 1, activo: 0,
    });
    expect(out).toMatchObject({ unidadMedida: 'KG', stockMinimo: 2, localId: 7, exento: true, activo: false });
    expect(out.unidad_medida).toBeUndefined();
    expect(out.stock_minimo).toBeUndefined();
  });

  test('camelCase tiene prioridad sobre snake_case', () => {
    const out = v.validate(v.productoSchema, { codigo: 'P', nombre: 'n', precio: 0, stockMinimo: 5, stock_minimo: 9 });
    expect(out.stockMinimo).toBe(5);
  });

  test('rechaza precio negativo y stock decimal', () => {
    expectValidationError(v.productoSchema, { codigo: 'P', nombre: 'n', precio: -1 }, 'precio');
    expectValidationError(v.productoSchema, { codigo: 'P', nombre: 'n', precio: 1, stock: 1.5 }, 'stock');
  });
});

describe('documentoSchema', () => {
  const item = { numero_linea: 1, descripcion: 'X', cantidad: 1, precio_unitario: 100, monto_item: 100 };
  const doc = { tipo_documento: 33, folio: 1, fecha_emision: '2026-01-01', subtotal: 100, iva: 19, total: 119, items: [item] };

  test('acepta un documento mínimo válido', () => {
    expect(v.validate(v.documentoSchema, doc).items).toHaveLength(1);
  });

  test('exige al menos un item', () => {
    expectValidationError(v.documentoSchema, { ...doc, items: [] }, 'items');
  });

  test('rechaza folio 0 y cantidad 0', () => {
    expectValidationError(v.documentoSchema, { ...doc, folio: 0 }, 'folio');
    expectValidationError(v.documentoSchema, { ...doc, items: [{ ...item, cantidad: 0 }] }, 'items.0.cantidad');
  });
});

describe('pagoSchema / syncPushSchema / vendedorSchema', () => {
  test('pago exige monto >= 0.01', () => {
    expectValidationError(v.pagoSchema, {
      documento_id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', monto: 0, fecha_pago: '2026-01-01', forma_pago: 'efectivo',
    }, 'monto');
  });

  test('syncPush valida la operación', () => {
    const op = { entity_type: 'cliente', entity_local_id: 1, operation: 'create', payload: { a: 1 } };
    expect(v.validate(v.syncPushSchema, { operations: [op] }).operations).toHaveLength(1);
    expectValidationError(v.syncPushSchema, { operations: [{ ...op, operation: 'upsert' }] }, 'operations.0.operation');
  });

  test('vendedor exige apellido y comisión entre 0 y 100', () => {
    expectValidationError(v.vendedorSchema, { nombre: 'A' }, 'apellido');
    expectValidationError(v.vendedorSchema, { nombre: 'A', apellido: 'B', comision: 101 }, 'comision');
  });

  test('el objeto schemas mantiene compatibilidad con los exports directos', () => {
    expect(v.schemas.register).toBe(v.registerSchema);
    expect(v.schemas.pago).toBe(v.pagoSchema);
  });
});
