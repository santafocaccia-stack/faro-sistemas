import { Wallet } from 'lucide-react';
import { requireAdmin } from '@/server/auth/session';
import {
  obtenerBalanceMensual,
  listarGastos,
  obtenerAnalisisMes,
  obtenerConfigBalanceAuto,
} from '@/server/actions/gastos';
import { categoriasGasto } from '@/lib/gastos';
import { PageHeader } from '@/components/ui/page-header';
import { GastosClient } from './gastos-client';
import { db } from '@/server/db';
import { gastos, pedidosAtmosfericos } from '@/server/db/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { byTenant } from '@/server/db/tenant-context';

export const dynamic = 'force-dynamic';

const TZ = 'America/Argentina/Buenos_Aires';

/** Fecha YYYY-MM-DD de hoy en ART. */
function hoyAr(): string {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  return `${ar.getFullYear()}-${String(ar.getMonth() + 1).padStart(2, '0')}-${String(ar.getDate()).padStart(2, '0')}`;
}

/** Mes actual YYYY-MM en ART. */
function mesActualAr(): string {
  return hoyAr().slice(0, 7);
}

/** Lunes de la semana actual en ART. */
function lunesDeLaSemanaAr(): string {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const dow = ar.getDay(); // 0=dom, 1=lun ... 6=sab
  const diasDesdelunes = dow === 0 ? 6 : dow - 1;
  const lunes = new Date(ar);
  lunes.setDate(ar.getDate() - diasDesdelunes);
  return `${lunes.getFullYear()}-${String(lunes.getMonth() + 1).padStart(2, '0')}-${String(lunes.getDate()).padStart(2, '0')}`;
}

export default async function GastosPage() {
  const session = await requireAdmin();
  const esAtmos = session.plan === 'atmosfericos';
  const hoy = hoyAr();
  const lunes = lunesDeLaSemanaAr();

  const [balance, gastosDelMes, analisis, configAuto, gastosHoy, gaSemana, ingresosHoyRows, ingresosSemanaRows] = await Promise.all([
    obtenerBalanceMensual(),
    listarGastos(mesActualAr()),
    obtenerAnalisisMes(),
    obtenerConfigBalanceAuto(),
    // Gastos de hoy
    db.select({ monto: gastos.monto })
      .from(gastos)
      .where(and(
        byTenant(session.tenantId, gastos),
        isNull(gastos.deletedAt),
        sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date = ${hoy}::date`,
      )),
    // Gastos de esta semana
    db.select({ monto: gastos.monto })
      .from(gastos)
      .where(and(
        byTenant(session.tenantId, gastos),
        isNull(gastos.deletedAt),
        sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date >= ${lunes}::date`,
        sql`(${gastos.fecha} AT TIME ZONE ${TZ})::date <= ${hoy}::date`,
      )),
    // Ingresos de hoy (solo atmosféricos)
    esAtmos
      ? db.select({ monto: pedidosAtmosfericos.montoCobrado })
          .from(pedidosAtmosfericos)
          .where(and(
            byTenant(session.tenantId, pedidosAtmosfericos),
            eq(pedidosAtmosfericos.fechaProgramada, hoy),
            eq(pedidosAtmosfericos.estado, 'completado'),
          ))
      : Promise.resolve([]),
    // Ingresos de la semana (solo atmosféricos)
    esAtmos
      ? db.select({ monto: pedidosAtmosfericos.montoCobrado })
          .from(pedidosAtmosfericos)
          .where(and(
            byTenant(session.tenantId, pedidosAtmosfericos),
            sql`${pedidosAtmosfericos.fechaProgramada} >= ${lunes}::date`,
            sql`${pedidosAtmosfericos.fechaProgramada} <= ${hoy}::date`,
            eq(pedidosAtmosfericos.estado, 'completado'),
          ))
      : Promise.resolve([]),
  ]);

  const sumar = (rows: { monto: string | null }[]) =>
    rows.reduce((s, r) => s + Number(r.monto ?? 0), 0);

  const resumenHoy = {
    ingresos: sumar(ingresosHoyRows as { monto: string | null }[]),
    gastos:   sumar(gastosHoy),
  };
  const resumenSemana = {
    ingresos: sumar(ingresosSemanaRows as { monto: string | null }[]),
    gastos:   sumar(gaSemana),
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={Wallet}
        title="Gastos y balance"
        subtitle={esAtmos
          ? 'Balance diario, semanal y mensual del servicio'
          : 'Cargá tus gastos y mirá la ganancia real del mes, con análisis automático'}
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
        resumenHoy={resumenHoy}
        resumenSemana={resumenSemana}
        esAtmos={esAtmos}
      />
    </div>
  );
}
