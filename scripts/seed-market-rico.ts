/**
 * Arma la cuenta market de DESARROLLO (.env.local) con datos realistas y
 * consistentes para demo/capturas: catálogo, clientes, ventas repartidas en
 * los últimos ~27 días (ambos canales, varios métodos de pago) y deudas de
 * cuenta corriente variadas (saldo positivo = el cliente debe).
 *
 * Impacta parejo en inicio, reportes y cuenta corriente.
 * Uso: npx tsx scripts/seed-market-rico.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { and, eq } from 'drizzle-orm';
import {
  tenants, users, usersTenants, clientes, productos,
  ventas, ventasLineas, pagos, movimientosCuentaCorriente,
} from '../src/server/db/schema';

const DATABASE_URL = process.env.DATABASE_URL!;
const ahora = new Date();
const fechaHace = (dias: number, h = 12, m = 0): Date => {
  const d = new Date(ahora); d.setDate(d.getDate() - dias); d.setHours(h, m, 0, 0); return d;
};
const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
function pick<T>(a: T[]): T { return a[ri(0, a.length - 1)]!; }

const CATALOGO = [
  { nombre: 'Coca-Cola 500ml',          stockActual: '48', stockMinimo: '12', costoPromedio: '850',  precioMayorista: '1100', precioMinorista: '1400' },
  { nombre: 'Agua Villavicencio 500ml', stockActual: '36', stockMinimo: '10', costoPromedio: '400',  precioMayorista: '550',  precioMinorista: '750'  },
  { nombre: 'Alfajor Havanna',          stockActual: '60', stockMinimo: '15', costoPromedio: '900',  precioMayorista: '1200', precioMinorista: '1600' },
  { nombre: 'Papas Lays 90g',           stockActual: '30', stockMinimo: '8',  costoPromedio: '650',  precioMayorista: '900',  precioMinorista: '1200' },
  { nombre: 'Chicles Beldent x12',      stockActual: '80', stockMinimo: '20', costoPromedio: '180',  precioMayorista: '280',  precioMinorista: '400'  },
  { nombre: 'Cigarrillos Marlboro',     stockActual: '25', stockMinimo: '10', costoPromedio: '1800', precioMayorista: '2200', precioMinorista: '2600' },
  { nombre: 'Serranitas',               stockActual: '40', stockMinimo: '12', costoPromedio: '700',  precioMayorista: '1000', precioMinorista: '1300' },
  { nombre: 'Mantecol 50g',             stockActual: '24', stockMinimo: '10', costoPromedio: '520',  precioMayorista: '780',  precioMinorista: '1050' },
  { nombre: 'Red Bull 250ml',           stockActual: '18', stockMinimo: '12', costoPromedio: '1600', precioMayorista: '2100', precioMinorista: '2700' },
  { nombre: 'Galletitas Oreo',          stockActual: '6',  stockMinimo: '15', costoPromedio: '600',  precioMayorista: '820',  precioMinorista: '1100' }, // stock bajo
];

const CLIENTES = [
  { razonSocial: 'Distribuidora Norte', tipo: 'mayorista', condicionIva: 'responsable_inscripto', cuit: '30-61234567-4', telefono: '011-4600-2222', habilitaCuentaCorriente: true, limiteCredito: '100000' },
  { razonSocial: 'Almacén Doña Rosa',   tipo: 'mayorista', condicionIva: 'responsable_inscripto', cuit: '30-70123456-7', telefono: '011-4502-3344', habilitaCuentaCorriente: true, limiteCredito: '150000' },
  { razonSocial: 'Maxikiosco 24hs',     tipo: 'mayorista', condicionIva: 'monotributo',           cuit: '20-35987654-3', telefono: '011-4555-7788', habilitaCuentaCorriente: true, limiteCredito: '80000'  },
  { razonSocial: 'Bar La Esquina',      tipo: 'mayorista', condicionIva: 'responsable_inscripto', cuit: '30-71567890-2', telefono: '011-4777-1212', habilitaCuentaCorriente: true, limiteCredito: '120000' },
  { razonSocial: 'Carlos Gómez',        tipo: 'minorista', condicionIva: 'consumidor_final',                            telefono: '15-4234-5678', habilitaCuentaCorriente: true, limiteCredito: '20000'  },
  { razonSocial: 'Vanesa Torres',       tipo: 'minorista', condicionIva: 'consumidor_final',                            telefono: '15-6111-2233', habilitaCuentaCorriente: true, limiteCredito: '30000'  },
];

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false });
  const db = drizzle(sql);

  const [t] = await db.select().from(tenants).where(eq(tenants.plan, 'market')).limit(1);
  if (!t) throw new Error('No hay tenant con plan market');
  const tenantId = t.id;
  const [owner] = await db.select({ uid: usersTenants.userId }).from(usersTenants)
    .where(and(eq(usersTenants.tenantId, tenantId), eq(usersTenants.rol, 'owner'))).limit(1);
  const userId = owner?.uid ?? null;
  console.log(`✅ Tenant market: ${t.nombre} (${tenantId})`);

  // 1. Datos del negocio (para que el header/onboarding se vean completos)
  await db.update(tenants).set({
    nombre: 'Kiosco El Rincón', cuit: '20-34567890-5',
    direccion: 'Av. Rivadavia 4820, CABA', telefono: '011-4901-5566',
    habilitaMayorista: true, habilitaMinorista: true,
  } as any).where(eq(tenants.id, tenantId));

  // 2. Limpiar transaccional + catálogo + clientes (no CF)
  await db.delete(movimientosCuentaCorriente).where(eq(movimientosCuentaCorriente.tenantId, tenantId));
  await db.delete(pagos).where(eq(pagos.tenantId, tenantId));
  await db.delete(ventasLineas).where(eq(ventasLineas.tenantId, tenantId));
  await db.delete(ventas).where(eq(ventas.tenantId, tenantId));
  await db.delete(productos).where(eq(productos.tenantId, tenantId));
  await db.delete(clientes).where(and(eq(clientes.tenantId, tenantId), eq(clientes.esConsumidorFinal, false)));
  console.log('🧹 Catálogo, clientes y transaccional reiniciados');

  // 3. Catálogo
  await db.insert(productos).values(CATALOGO.map((p) => ({
    tenantId, activo: true, tipoUnidad: 'por_unidad', ...p,
  })) as any);

  // 4. Consumidor Final (si no existe) + clientes
  const [cfEx] = await db.select({ id: clientes.id }).from(clientes)
    .where(and(eq(clientes.tenantId, tenantId), eq(clientes.esConsumidorFinal, true))).limit(1);
  if (!cfEx) {
    await db.insert(clientes).values({
      tenantId, razonSocial: 'Consumidor Final', tipo: 'minorista',
      condicionIva: 'consumidor_final', esConsumidorFinal: true, habilitaCuentaCorriente: false, saldoActual: '0',
    } as any);
  }
  await db.insert(clientes).values(CLIENTES.map((c) => ({ tenantId, esConsumidorFinal: false, saldoActual: '0', ...c })) as any);
  console.log(`📇 ${CATALOGO.length} productos, ${CLIENTES.length} clientes + Consumidor Final`);

  // 5. Mapas
  const cli = await db.select({ id: clientes.id, razon: clientes.razonSocial, cf: clientes.esConsumidorFinal })
    .from(clientes).where(eq(clientes.tenantId, tenantId));
  const byName = (n: string) => cli.find((c) => c.razon === n)!;
  const cf = cli.find((c) => c.cf)!;
  const carlos = byName('Carlos Gómez'), distri = byName('Distribuidora Norte');
  const almacen = byName('Almacén Doña Rosa'), maxi = byName('Maxikiosco 24hs');
  const bar = byName('Bar La Esquina'), vanesa = byName('Vanesa Torres');
  const prods = await db.select({ id: productos.id, nombre: productos.nombre, pMin: productos.precioMinorista, pMay: productos.precioMayorista })
    .from(productos).where(eq(productos.tenantId, tenantId));

  // 6. Especificar ventas
  type Spec = { dias: number; canal: 'minorista' | 'mayorista'; cliId: string; cc: boolean; metodo?: string; n: number };
  const specs: Spec[] = [];
  const metodosMin = ['efectivo', 'efectivo', 'efectivo', 'transferencia', 'mercado_pago', 'tarjeta_debito'];
  for (let dia = 13; dia >= 0; dia--) {
    const cant = dia <= 6 ? ri(1, 2) : ri(0, 2);
    for (let k = 0; k < cant; k++)
      specs.push({ dias: dia, canal: 'minorista', cliId: cf.id, cc: false, metodo: pick(metodosMin), n: ri(1, 4) });
  }
  specs.push({ dias: 5, canal: 'minorista', cliId: carlos.id, cc: true, n: 2 });
  specs.push({ dias: 9, canal: 'minorista', cliId: vanesa.id, cc: true, n: 3 });
  specs.push({ dias: 12, canal: 'mayorista', cliId: distri.id, cc: true, n: 4 });
  specs.push({ dias: 8, canal: 'mayorista', cliId: distri.id, cc: true, n: 5 });
  specs.push({ dias: 6, canal: 'mayorista', cliId: almacen.id, cc: true, n: 4 });
  specs.push({ dias: 3, canal: 'mayorista', cliId: maxi.id, cc: true, n: 5 });
  specs.push({ dias: 2, canal: 'mayorista', cliId: bar.id, cc: true, n: 4 });
  specs.push({ dias: 10, canal: 'mayorista', cliId: almacen.id, cc: false, metodo: 'transferencia', n: 4 });
  specs.push({ dias: 1, canal: 'mayorista', cliId: distri.id, cc: false, metodo: 'transferencia', n: 6 });
  for (const dia of [16, 18, 21, 24, 26])
    specs.push({ dias: dia, canal: 'minorista', cliId: cf.id, cc: false, metodo: pick(['efectivo', 'transferencia']), n: ri(1, 2) });
  specs.sort((a, b) => b.dias - a.dias);

  // 7. Crear ventas
  const numero: Record<string, number> = { minorista: 0, mayorista: 0 };
  const ccVentas: { cliId: string; ventaId: string; fecha: Date; total: number }[] = [];
  for (const s of specs) {
    const fecha = fechaHace(s.dias, ri(9, 20), ri(0, 59));
    const elegidos = [...prods].sort(() => Math.random() - 0.5).slice(0, s.n);
    const lineas = elegidos.map((p) => {
      const precio = Number(s.canal === 'minorista' ? p.pMin : p.pMay);
      const qty = s.canal === 'minorista' ? ri(1, 4) : ri(6, 40);
      return { productoId: p.id, descripcion: p.nombre, cantidad: qty, precioUnitario: precio, subtotal: precio * qty };
    });
    const total = lineas.reduce((a, l) => a + l.subtotal, 0);
    const num = ++numero[s.canal]!;
    const [venta] = await db.insert(ventas).values({
      tenantId, numero: num, canal: s.canal, clienteId: s.cliId, usuarioId: userId,
      fecha, tipoPago: s.cc ? 'cuenta_corriente' : 'contado', estado: s.cc ? 'pendiente' : 'pagada',
      subtotal: total.toFixed(2), descuento: '0', total: total.toFixed(2), montoPagado: s.cc ? '0' : total.toFixed(2),
    } as any).returning({ id: ventas.id });
    await db.insert(ventasLineas).values(lineas.map((l) => ({
      tenantId, ventaId: venta!.id, productoId: l.productoId, descripcion: l.descripcion,
      cantidad: l.cantidad.toFixed(3), precioUnitario: l.precioUnitario.toFixed(2), subtotal: l.subtotal.toFixed(2),
    })));
    if (s.cc) ccVentas.push({ cliId: s.cliId, ventaId: venta!.id, fecha, total });
    else await db.insert(pagos).values({ tenantId, clienteId: s.cliId, ventaId: venta!.id, usuarioId: userId, fecha, monto: total.toFixed(2), metodo: s.metodo as any } as any);
  }
  console.log(`🧾 ${specs.length} ventas (min #${numero.minorista}, may #${numero.mayorista})`);

  // 8. Pagos parciales → deudas variadas
  const totalCC: Record<string, number> = {};
  for (const v of ccVentas) totalCC[v.cliId] = (totalCC[v.cliId] ?? 0) + v.total;
  const fracPago: Record<string, number> = { [maxi.id]: 1.0, [almacen.id]: 0.5, [bar.id]: 0.35, [carlos.id]: 0.4 };
  const pagoEvents: { cliId: string; pagoId: string; fecha: Date; monto: number }[] = [];
  for (const [cliId, tot] of Object.entries(totalCC)) {
    const frac = fracPago[cliId] ?? 0;
    // pago total = exacto (salda en 0) · parcial = redondeo para abajo (nunca supera la deuda)
    const monto = frac >= 1 ? Math.round(tot * 100) / 100 : Math.floor((tot * frac) / 100) * 100;
    if (monto <= 0) continue;
    const fecha = fechaHace(0, ri(10, 18), ri(0, 59));
    const [pago] = await db.insert(pagos).values({ tenantId, clienteId: cliId, usuarioId: userId, fecha, monto: monto.toFixed(2), metodo: pick(['transferencia', 'efectivo']) as any } as any).returning({ id: pagos.id });
    pagoEvents.push({ cliId, pagoId: pago!.id, fecha, monto });
  }

  // 9. Movimientos CC (saldo cronológico correcto)
  const eventos = [
    ...ccVentas.map((v) => ({ kind: 'venta' as const, cliId: v.cliId, fecha: v.fecha, monto: v.total, ventaId: v.ventaId as string | null, pagoId: null as string | null })),
    ...pagoEvents.map((p) => ({ kind: 'pago' as const, cliId: p.cliId, fecha: p.fecha, monto: p.monto, ventaId: null as string | null, pagoId: p.pagoId as string | null })),
  ];
  const porCliente: Record<string, typeof eventos> = {};
  for (const e of eventos) (porCliente[e.cliId] ??= []).push(e);
  const finales: Record<string, number> = {};
  for (const [cliId, evs] of Object.entries(porCliente)) {
    evs.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    let saldo = 0;
    for (const e of evs) {
      saldo += e.kind === 'venta' ? e.monto : -e.monto;
      await db.insert(movimientosCuentaCorriente).values({
        tenantId, clienteId: cliId, fecha: e.fecha, tipo: e.kind,
        ventaId: e.ventaId ?? undefined, pagoId: e.pagoId ?? undefined, usuarioId: userId,
        debe: e.kind === 'venta' ? e.monto.toFixed(2) : '0', haber: e.kind === 'pago' ? e.monto.toFixed(2) : '0',
        saldoPosterior: saldo.toFixed(2), descripcion: e.kind === 'venta' ? 'Venta a cuenta corriente' : 'Pago recibido',
      } as any);
    }
    finales[cliId] = saldo;
    await db.update(clientes).set({ saldoActual: saldo.toFixed(2) }).where(eq(clientes.id, cliId));
  }

  console.log('\n💰 Saldos cuenta corriente (positivo = debe):');
  for (const c of cli) if (finales[c.id] && Math.abs(finales[c.id]!) > 0.01) console.log(`   ${c.razon.padEnd(22)} $ ${finales[c.id]!.toLocaleString('es-AR')}`);

  await sql.end();
  console.log('\n✨ Listo. Kiosco El Rincón cargado con datos realistas.');
}
main().catch((e) => { console.error('❌', e); process.exit(1); });
