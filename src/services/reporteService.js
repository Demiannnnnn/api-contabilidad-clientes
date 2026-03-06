const prisma = require('../config/database');
const documentoRepository = require('../repositories/documentoRepository');

const reporteVentas = async (tenantId, desde, hasta) => {
  if (!desde || !hasta) {
    const error = new Error('Se requieren parámetros "desde" y "hasta"');
    error.status = 400;
    throw error;
  }
  const summary = await documentoRepository.sumByPeriod(tenantId, desde, hasta);
  const byTipo = await documentoRepository.groupByTipo(tenantId, desde, hasta);

  return {
    periodo: { desde, hasta },
    resumen: {
      totalNeto: summary._sum.subtotal || 0,
      totalIva: summary._sum.iva || 0,
      totalBruto: summary._sum.total || 0,
      totalExento: summary._sum.montoExento || 0,
      cantidadDocumentos: summary._count || 0
    },
    porTipo: byTipo.map(t => ({
      tipoDocumento: t.tipoDocumento,
      total: t._sum.total || 0,
      cantidad: t._count
    }))
  };
};

const reporteTributario = async (tenantId, periodo) => {
  if (!periodo) {
    const error = new Error('Se requiere parámetro "periodo" (YYYY-MM)');
    error.status = 400;
    throw error;
  }
  const [year, month] = periodo.split('-').map(Number);
  const desde = new Date(year, month - 1, 1);
  const hasta = new Date(year, month, 0);

  // Ventas (facturas + boletas)
  const ventas = await prisma.documento.aggregate({
    where: {
      tenantId,
      tipoDocumento: { in: [33, 34, 39, 41] },
      fechaEmision: { gte: desde, lte: hasta },
      estado: { notIn: ['anulada', 'rechazada', 'borrador'] }
    },
    _sum: { subtotal: true, iva: true, total: true, montoExento: true }
  });

  // Notas de crédito
  const nc = await prisma.documento.aggregate({
    where: {
      tenantId,
      tipoDocumento: 61,
      fechaEmision: { gte: desde, lte: hasta },
      estado: { notIn: ['anulada', 'rechazada', 'borrador'] }
    },
    _sum: { subtotal: true, iva: true, total: true }
  });

  // Notas de débito
  const nd = await prisma.documento.aggregate({
    where: {
      tenantId,
      tipoDocumento: 56,
      fechaEmision: { gte: desde, lte: hasta },
      estado: { notIn: ['anulada', 'rechazada', 'borrador'] }
    },
    _sum: { subtotal: true, iva: true, total: true }
  });

  return {
    periodo,
    ventas: { neto: ventas._sum.subtotal || 0, iva: ventas._sum.iva || 0, total: ventas._sum.total || 0, exento: ventas._sum.montoExento || 0 },
    notasCredito: { neto: nc._sum.subtotal || 0, iva: nc._sum.iva || 0, total: nc._sum.total || 0 },
    notasDebito: { neto: nd._sum.subtotal || 0, iva: nd._sum.iva || 0, total: nd._sum.total || 0 },
    ivaDebito: Number(ventas._sum.iva || 0) - Number(nc._sum.iva || 0) + Number(nd._sum.iva || 0)
  };
};

const productosMasVendidos = async (tenantId, query = {}) => {
  const limit = parseInt(query.limit) || 10;
  const desde = query.desde ? new Date(query.desde) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const hasta = query.hasta ? new Date(query.hasta) : new Date();

  const items = await prisma.documentoItem.groupBy({
    by: ['productoId'],
    where: {
      documento: {
        tenantId,
        fechaEmision: { gte: desde, lte: hasta },
        estado: { notIn: ['anulada', 'rechazada', 'borrador'] }
      }
    },
    _sum: { cantidad: true, montoItem: true },
    orderBy: { _sum: { montoItem: 'desc' } },
    take: limit
  });

  // Get product details
  const productIds = items.filter(i => i.productoId).map(i => i.productoId);
  const productos = await prisma.producto.findMany({
    where: { id: { in: productIds } },
    select: { id: true, codigo: true, nombre: true }
  });
  const prodMap = productos.reduce((m, p) => { m[p.id] = p; return m; }, {});

  return items.map(i => ({
    producto: prodMap[i.productoId] || { id: i.productoId },
    cantidadVendida: i._sum.cantidad || 0,
    montoTotal: i._sum.montoItem || 0
  }));
};

const clientesRanking = async (tenantId, query = {}) => {
  const limit = parseInt(query.limit) || 10;
  const desde = query.desde ? new Date(query.desde) : new Date(new Date().setMonth(new Date().getMonth() - 3));
  const hasta = query.hasta ? new Date(query.hasta) : new Date();

  const docs = await prisma.documento.groupBy({
    by: ['clienteId'],
    where: {
      tenantId,
      clienteId: { not: null },
      tipoDocumento: { in: [33, 34] },
      fechaEmision: { gte: desde, lte: hasta },
      estado: { notIn: ['anulada', 'rechazada', 'borrador'] }
    },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: 'desc' } },
    take: limit
  });

  const clienteIds = docs.filter(d => d.clienteId).map(d => d.clienteId);
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, rut: true, razonSocial: true }
  });
  const cliMap = clientes.reduce((m, c) => { m[c.id] = c; return m; }, {});

  return docs.map(d => ({
    cliente: cliMap[d.clienteId] || { id: d.clienteId },
    totalCompras: d._sum.total || 0,
    cantidadDocumentos: d._count
  }));
};

const reporteCaja = async (tenantId, fecha) => {
  if (!fecha) {
    const error = new Error('Se requiere parámetro "fecha" (YYYY-MM-DD)');
    error.status = 400;
    throw error;
  }
  const day = new Date(fecha);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);

  const [docs, pagos] = await Promise.all([
    prisma.documento.aggregate({
      where: {
        tenantId,
        fechaEmision: { gte: day, lt: nextDay },
        estado: { notIn: ['anulada', 'rechazada', 'borrador'] }
      },
      _sum: { total: true },
      _count: true
    }),
    prisma.pago.aggregate({
      where: {
        tenantId,
        fechaPago: { gte: day, lt: nextDay }
      },
      _sum: { monto: true },
      _count: true
    })
  ]);

  // Pagos by forma
  const pagosByForma = await prisma.pago.groupBy({
    by: ['formaPago'],
    where: { tenantId, fechaPago: { gte: day, lt: nextDay } },
    _sum: { monto: true },
    _count: true
  });

  return {
    fecha,
    documentos: { total: docs._sum.total || 0, cantidad: docs._count || 0 },
    cobros: { total: pagos._sum.monto || 0, cantidad: pagos._count || 0 },
    cobrosPorForma: pagosByForma.map(p => ({ formaPago: p.formaPago, total: p._sum.monto || 0, cantidad: p._count }))
  };
};

const dashboard = async (tenantId) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [ventasMes, ventasAnio, docsByEstado, clientesTotal, productosTotal, docsPorCobrar] = await Promise.all([
    prisma.documento.aggregate({
      where: { tenantId, fechaEmision: { gte: monthStart }, estado: { notIn: ['anulada', 'rechazada', 'borrador'] } },
      _sum: { total: true }, _count: true
    }),
    prisma.documento.aggregate({
      where: { tenantId, fechaEmision: { gte: yearStart }, estado: { notIn: ['anulada', 'rechazada', 'borrador'] } },
      _sum: { total: true }, _count: true
    }),
    documentoRepository.groupByEstado(tenantId),
    prisma.cliente.count({ where: { tenantId } }),
    prisma.producto.count({ where: { tenantId } }),
    prisma.documento.count({ where: { tenantId, estado: { in: ['emitida', 'parcial'] } } })
  ]);

  return {
    ventasMes: { total: ventasMes._sum.total || 0, cantidad: ventasMes._count || 0 },
    ventasAnio: { total: ventasAnio._sum.total || 0, cantidad: ventasAnio._count || 0 },
    documentosPorEstado: docsByEstado.reduce((acc, d) => { acc[d.estado] = d._count; return acc; }, {}),
    totalClientes: clientesTotal,
    totalProductos: productosTotal,
    documentosPorCobrar: docsPorCobrar
  };
};

module.exports = { reporteVentas, reporteTributario, productosMasVendidos, clientesRanking, reporteCaja, dashboard };
