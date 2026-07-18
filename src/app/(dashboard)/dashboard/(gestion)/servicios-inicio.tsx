import Link from 'next/link';
import { FileText, Plus, ArrowRight, CalendarDays, BellRing, Clock } from 'lucide-react';
import { resumenServicios } from '@/server/actions/presupuestos';
import { listarTurnos, listarVencimientos } from '@/server/actions/agenda';
import { formatARS } from '@/lib/utils';
import { InicioHero } from '@/components/ui/inicio-hero';

export async function ServiciosInicio({
  saludo, nombre, fechaLabel,
}: { saludo: string; nombre: string; fechaLabel: string }) {
  const ahora = new Date();
  const en7dias = new Date(ahora.getTime() + 7 * 86400000);

  const [resumen, turnos, vencimientos] = await Promise.all([
    resumenServicios(),
    listarTurnos(ahora.toISOString(), en7dias.toISOString()),
    listarVencimientos(),
  ]);

  const proximosTurnos = turnos.slice(0, 5);
  const alertas = vencimientos.filter((v) => v.alerta !== 'al_dia').slice(0, 5);

  const cards = [
    { label: 'Cobrado este mes', value: formatARS(resumen.cobradoMes), sub: `${resumen.cobradoMesCant} ${resumen.cobradoMesCant === 1 ? 'cobro' : 'cobros'}` },
    { label: 'Por cobrar', value: formatARS(resumen.porCobrar), sub: `${resumen.porCobrarCant} aprobados` },
    { label: 'Presupuestos abiertos', value: String(resumen.abiertos), sub: 'borradores / enviados' },
  ];

  // timeZone explícita: el server corre en UTC y mostraba la hora corrida (+3)
  const fmtHora = (d: Date | string) =>
    new Date(d).toLocaleString('es-AR', {
      weekday: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  const fmtFecha = (s: string) =>
    new Date(s + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 max-w-5xl mx-auto space-y-6 animate-fade-up">
      {/* Hero */}
      <InicioHero
        saludo={saludo}
        nombre={nombre}
        fechaLabel={fechaLabel}
        nota={
          resumen.porCobrarCant > 0
            ? `Tenés ${resumen.porCobrarCant} presupuesto${resumen.porCobrarCant > 1 ? 's' : ''} aprobado${resumen.porCobrarCant > 1 ? 's' : ''} por cobrar.`
            : alertas.length > 0
              ? `${alertas.length} vencimiento${alertas.length > 1 ? 's' : ''} para tener en cuenta.`
              : 'Armá presupuestos y organizá tu semana.'
        }
      >
        <Link
          href="/dashboard/presupuestos/nuevo"
          className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold glow-primary hover:brightness-105 transition-all"
        >
          <Plus className="h-4 w-4" />
          Nuevo presupuesto
        </Link>
      </InicioHero>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`panel p-4 ${c.label === 'Cobrado este mes' ? 'stat-accent' : ''}`}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{c.label}</p>
            <p className="text-xl font-semibold font-mono tabular-nums mt-1">{c.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximos turnos */}
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary" /> Próximos turnos
            </h2>
            <Link href="/dashboard/agenda" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Ver agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {proximosTurnos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Clock className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sin turnos en los próximos 7 días</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {proximosTurnos.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{t.titulo}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {fmtHora(t.inicio)}{t.clienteNombre ? ` · ${t.clienteNombre}` : ''}
                    </p>
                  </div>
                  {t.montoEstimado && (
                    <p className="font-mono tabular-nums text-[12px] text-muted-foreground shrink-0 ml-3">
                      {formatARS(t.montoEstimado)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vencimientos a la vista */}
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold flex items-center gap-1.5">
              <BellRing className="h-4 w-4 text-warning" /> Vencimientos
            </h2>
            <Link href="/dashboard/agenda" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground">Todo al día 👌</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {alertas.map((v) => (
                <div key={v.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{v.titulo}</p>
                    <p className="text-[11px] text-muted-foreground">vence {fmtFecha(v.proximoVencimiento)}</p>
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 ml-3 ${v.alerta === 'vencido' ? 'text-destructive' : 'text-warning'}`}>
                    {v.alerta === 'vencido'
                      ? `vencido hace ${Math.abs(v.diasRestantes)}d`
                      : `en ${v.diasRestantes}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA presupuestos */}
      <Link
        href="/dashboard/presupuestos"
        className="panel p-4 flex items-center justify-between hover:bg-foreground/[0.02] transition-colors"
      >
        <span className="text-[13px] font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Ver y cobrar presupuestos
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
