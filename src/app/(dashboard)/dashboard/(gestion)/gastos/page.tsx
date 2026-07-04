import { Wallet } from 'lucide-react';
import { requireAdmin } from '@/server/auth/session';
import {
  obtenerBalanceMensual,
  listarGastos,
  listarGastosDelDia,
  obtenerAnalisisMes,
  obtenerConfigBalanceAuto,
} from '@/server/actions/gastos';
import { categoriasGasto } from '@/lib/gastos';
import { PageHeader } from '@/components/ui/page-header';
import { GastosClient } from './gastos-client';
import { GastosAtmosClient } from './gastos-atmos-client';
import { withTenant } from '@/server/db';
import { gastos, pedidosAtmosfericos } from '@/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { byTenant } from '@/server/db/tenant-context';

export const dynamic = 'force-dynamic';

const TZ = 'America/Argentina/Buenos_Aires';

function hoyAr(): string {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${ar.getFullYear()}-${String(ar.getMonth() + 1).padStart(2, '0')}-${String(ar.getDate()).padStart(2, '0')}`;
}

function lunesDeLaSemanaAr(): string {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const dow = ar.getDay();
  const diasDesdeLunes = dow === 0 ? 6 : dow - 1;
  const lunes = new Date(ar);
  lunes.setDate(ar.getDate() - diasDesdeLunes);
  return `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`;
}

function nombreDelMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const session = await requireAdmin();
  const esAtmos = session.plan === 'atmosfericos';

  // ── Vista diaria para atmosféricos ──────────────────────────────
  if (esAtmos) {
    const { fecha } = await searchParams;
    const hoy = hoyAr();
    const dia = fecha ?? hoy;
    const lunes = lunesDeLaSemanaAr();

    const sumarGastos = (rows: { monto: string | null }[]) =>
      rows.reduce((s, r) => s + Number(r.monto ?? 0), 0);
    const sumarCobros = (rows: { monto: string | null }[]) =>
      rows.reduce((s, r) => s + Number(r.monto ?? 0), 0);

    const [
      gastosDelDia, balanceMes,
      [cobradoDiaRows, cobradoSemanaRows, gastosSemanaRows],
    ] = await Promise.all([
      listarGastosDelDia(dia),
      obtenerBalanceMensual(),
      withTenant(session.tenantId, (db) =>
        Promise.all([
          // Cobrado del día (pedidos completados del día seleccionado)
          db.select({ monto: pedidosAtmosfericos.montoCobrado })
            .from(pedidosAtmosfericos)
            .where(and(
              byTenant(session.tenantId, pedidosAtmosfericos),
              eq(pedidosAtmosfericos.fechaProgramada, dia),
              eq(pedidosAtmosfericos.estado, 'completado'),
            )),
          // Cobrado de la semana actual
          db.select({ monto: pedidosAtmosfericos.montoCobrado })
            .from(pedidosAtmosfericos)
            .where(and(
              byTenant(session.tenantId, pedidosAtmosfericos),
              sql`${pedidosAtmosfericos.fechaProgramada} >= ${lunes}::date`,
              sql`${pedidosAtmosfericos.fechaProgramada} <= ${hoy}::date`,
              eq(pedidosAtmosfericos.estado, 'completado'),
            )),
          // Gastos de la semana actual
          db.select({ monto: gastos.monto })
            .from(gastos)
            .where(and(
              byTenant(session.tenantId, gastos),
              isNull(gastos.deletedAt),
              sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date >= ${lunes}::date`,
              sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date <= ${hoy}::date`,
            )),
        ]),
      ),
    ]);

    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-6 animate-fade-up">
        <PageHeader icon={Wallet} title="Gastos y balance" subtitle="La plata del día: lo que entró y lo que gastaste" />
        <GastosAtmosClient
          fecha={dia}
          gastosDelDia={gastosDelDia.map((g) => ({
            id: g.id,
            fecha: g.fecha.toISOString(),
            categoria: g.categoria,
            monto: g.monto,
            descripcion: g.descripcion,
            metodoPago: g.metodoPago,
          }))}
          cobradoDelDia={sumarCobros(cobradoDiaRows as { monto: string | null }[])}
          resumenSemana={{
            ingresos: sumarCobros(cobradoSemanaRows as { monto: string | null }[]),
            gastos: sumarGastos(gastosSemanaRows),
          }}
          resumenMes={{ ingresos: balanceMes.ingresos, gastos: balanceMes.gastos }}
          nombreMes={nombreDelMes(balanceMes.mes)}
          categorias={[...categoriasGasto(session.plan)]}
        />
      </div>
    );
  }

  // ── Vista mensual para el resto de los planes ───────────────────
  const [balance, gastosDelMes, analisis, configAuto] = await Promise.all([
    obtenerBalanceMensual(),
    listarGastos(balanceMesActual()),
    obtenerAnalisisMes(),
    obtenerConfigBalanceAuto(),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={Wallet}
        title="Gastos y balance"
        subtitle="Cargá tus gastos y mirá la ganancia real del mes, con análisis automático"
      />
      <GastosClient
        mesInicial={balance.mes}
        balanceInicial={balance}
        analisisInicial={analisis}
        configAuto={configAuto}
        gastosIniciales={gastosDelMes.map((g) => ({
          id: g.id,
          fecha: g.fecha.toISOString(),
          categoria: g.categoria,
          monto: g.monto,
          descripcion: g.descripcion,
          metodoPago: g.metodoPago,
        }))}
        categorias={[...categoriasGasto(session.plan)]}
      />
    </div>
  );
}

function balanceMesActual(): string {
  return hoyAr().slice(0, 7);
}
