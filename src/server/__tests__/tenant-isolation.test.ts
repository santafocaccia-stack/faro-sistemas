/**
 * Guard de aislamiento multi-tenant.
 *
 * Contexto (auditoría 2026-06-21): RLS NO protege la capa de aplicación (Drizzle
 * se conecta como rol `postgres`/BYPASSRLS). Por lo tanto `byTenant()` en el
 * código es la ÚNICA defensa de aislamiento entre clientes. Este test falla si
 * una ESCRITURA (`update`/`delete`) sobre una tabla tenant-scoped no incluye un
 * filtro de tenant en su `.where(...)`. Atrapa "olvidos" futuros antes de que
 * lleguen a producción.
 *
 * Cómo funciona: escanea estáticamente las server actions. Una escritura es
 * segura si su statement referencia `byTenant`, `tenantId` o `tenant_id`. Las
 * excepciones legítimas (escritura sobre un sub-recurso por id cuyo padre YA fue
 * validado por tenant en la misma función) van en ALLOWLIST, documentadas.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ACTIONS_DIR = join(process.cwd(), 'src/server/actions');

// Tablas globales (no tienen tenant_id por diseño): el filtro es por su propia id.
const GLOBAL_TABLES = new Set(['users']);

// Tokens que evidencian un filtro de tenant en el statement.
const SAFE_TOKENS = ['byTenant', 'tenantId', 'tenant_id'];

/**
 * Excepciones revisadas a mano (auditoría 2026-06-21). Cada entrada es una
 * escritura sobre un sub-recurso por id donde el recurso padre ya fue validado
 * por tenant en la misma función, o una operación de super-admin cross-tenant
 * deliberada. Si cambia el código, regenerar revisando que siga siendo segura.
 */
const ALLOWLIST = new Set<string>([
  // anularVenta: la venta se valida por byTenant antes de marcarla anulada.
  'ventas.ts::update(ventas)::.where(eq(ventas.id, id))',
  // crearVenta: existingId proviene de una query filtrada por pedido del tenant.
  'ventas.ts::update(pedidosLineas)::.where(eq(pedidosLineas.id, existingId))',
  // marcarVencimientoPagado: el vencimiento (v) se valida por byTenant antes.
  'agenda.ts::update(vencimientos)::.where(eq(vencimientos.id, v.id))',
  // registrarPagoPrestamo: préstamo (p) y cuotas (c) validados por byTenant antes.
  'prestamos.ts::update(cuotas)::.where(eq(cuotas.id, c.id))',
  'prestamos.ts::update(prestamos)::.where(eq(prestamos.id, p.id))',
  // editarPresupuesto: el presupuesto se valida por byTenant antes de reemplazar líneas.
  'presupuestos.ts::delete(presupuestosLineas)::.where(eq(presupuestosLineas.presupuestoId, id))',
  // invitarMiembro: limpieza de fila huérfana (verificada contra Auth antes de borrar, ver #10).
  'equipo.ts::delete(usersTenants)::.where(eq(usersTenants.userId, filaVieja.id))',
  // confirmarPago/activarManual: super-admin (requireSuperAdmin) opera cross-tenant a propósito.
  'pagos-suscripcion.ts::update(pagosSuscripcion)::.where(eq(pagosSuscripcion.id, pagoId))',
  'pagos-suscripcion.ts::update(pagosSuscripcion)::.where(eq(pagosSuscripcion.id, pendiente.id))',
]);

type Violation = { file: string; signature: string };

/** Analiza un source y devuelve las escrituras tenant-scoped sin filtro de tenant
 *  (ya descontada la ALLOWLIST). Stats expone cuántas escrituras vio en total. */
function analyzeSource(file: string, src: string, stats?: { writes: number }): Violation[] {
  const violations: Violation[] = [];
  const re = /\.(update|delete)\(\s*(\w+)\s*\)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src))) {
    const [, op, table] = m;
    if (GLOBAL_TABLES.has(table!)) continue;
    if (stats) stats.writes++;

    // Ventana = el statement actual (hasta el primer `;` tras el match).
    const semi = src.indexOf(';', m.index);
    const stmt = src.slice(m.index, semi === -1 ? m.index + 600 : semi);

    if (SAFE_TOKENS.some((t) => stmt.includes(t))) continue;

    const whereIdx = stmt.indexOf('.where(');
    const whereHead = whereIdx === -1 ? '(sin .where)' : stmt.slice(whereIdx, whereIdx + 80);
    const signature = `${file}::${op}(${table})::${whereHead.replace(/\s+/g, ' ').trim()}`;

    if (ALLOWLIST.has(signature)) continue;
    violations.push({ file, signature });
  }
  return violations;
}

function scanWrites(stats?: { writes: number }): Violation[] {
  const files = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts'));
  return files.flatMap((file) =>
    analyzeSource(file, readFileSync(join(ACTIONS_DIR, file), 'utf8'), stats),
  );
}

describe('aislamiento multi-tenant (byTenant en escrituras)', () => {
  it('ninguna escritura sobre tabla tenant-scoped omite el filtro de tenant', () => {
    const stats = { writes: 0 };
    const violations = scanWrites(stats);
    const detalle = violations.map((v) => `  - ${v.signature}`).join('\n');
    expect(
      violations,
      `Escrituras sin filtro de tenant detectadas (agregá byTenant o, si el padre ya ` +
        `está validado, sumá la firma a ALLOWLIST con un comentario):\n${detalle}`,
    ).toEqual([]);
    // Guard-del-guard: si el scanner deja de encontrar escrituras, el test sería
    // un falso verde. Verificamos que realmente está analizando código.
    expect(stats.writes).toBeGreaterThan(20);
  });

  it('el scanner tiene dientes: detecta una escritura insegura y aprueba una segura', () => {
    const insegura = 'await db.update(productos).set({ x: 1 }).where(eq(productos.id, id));';
    const segura = 'await db.update(productos).set({ x: 1 }).where(and(byTenant(t, productos), eq(productos.id, id)));';
    expect(analyzeSource('fake.ts', insegura)).toHaveLength(1);
    expect(analyzeSource('fake.ts', segura)).toHaveLength(0);
  });
});
