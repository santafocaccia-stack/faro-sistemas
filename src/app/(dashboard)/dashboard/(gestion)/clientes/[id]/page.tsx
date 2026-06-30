import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, BookOpen, Pencil, ShoppingCart, ChevronRight, Droplets, MapPin, Phone } from 'lucide-react';
import { obtenerCliente } from '@/server/actions/clientes';
import { comprasRecientesCliente } from '@/server/actions/ventas';
import { requireSession } from '@/server/auth/session';
import { formatARS } from '@/lib/utils';

const tipoLabel: Record<string, string> = {
  mayorista: 'Mayorista',
  minorista: 'Minorista',
  ambos: 'Ambos',
};

const ivaLabel: Record<string, string> = {
  responsable_inscripto: 'Responsable inscripto',
  monotributo: 'Monotributo',
  exento: 'Exento',
  consumidor_final: 'Consumidor final',
};

const estadoBadge: Record<string, string> = {
  pagada:    'bg-success/15 text-success border-success/20',
  pendiente: 'bg-warning/15 text-warning border-warning/20',
  parcial:   'bg-muted text-muted-foreground border-border',
  anulada:   'bg-destructive/15 text-destructive border-destructive/20',
};

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  const esAtmos = session.plan === 'atmosfericos';

  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  const saldo = Number(cliente.saldoActual);
  const compras = esAtmos ? [] : await comprasRecientesCliente(id);

  const direccion = [cliente.direccion, cliente.localidad, cliente.provincia]
    .filter(Boolean)
    .join(', ');

  // Datos para planes NO atmosféricos
  const datosMarket: { label: string; valor: string }[] = [
    { label: 'Tipo', valor: tipoLabel[cliente.tipo] ?? cliente.tipo },
    { label: 'Condición IVA', valor: ivaLabel[cliente.condicionIva] ?? cliente.condicionIva },
    ...(cliente.cuit ? [{ label: 'CUIT', valor: cliente.cuit }] : []),
    ...(cliente.email ? [{ label: 'Email', valor: cliente.email }] : []),
    ...(cliente.telefono ? [{ label: 'Teléfono', valor: cliente.telefono }] : []),
    ...(direccion ? [{ label: 'Dirección', valor: direccion }] : []),
    ...(cliente.descuentoPorcentaje && Number(cliente.descuentoPorcentaje) > 0
      ? [{ label: 'Descuento', valor: `${Number(cliente.descuentoPorcentaje)}%` }] : []),
    ...(cliente.diaPago ? [{ label: 'Día de pago', valor: cliente.diaPago }] : []),
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-8 animate-fade-up">

      <Link
        href="/dashboard/clientes"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Clientes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {!esAtmos && (
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border border-border bg-muted text-muted-foreground">
                {tipoLabel[cliente.tipo]}
              </span>
            </div>
          )}
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{cliente.razonSocial}</h1>
          {esAtmos && direccion && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />{direccion}
            </p>
          )}
          {!esAtmos && cliente.nombreFantasia && (
            <p className="text-sm text-muted-foreground mt-1">{cliente.nombreFantasia}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!esAtmos && cliente.habilitaCuentaCorriente && (
            <Link
              href={`/dashboard/cc/${cliente.id}`}
              className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-card/60 transition-colors group flex items-center gap-3"
            >
              <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="text-right">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">Saldo deudor</p>
                <p className={`font-mono tabular-nums text-base font-semibold ${saldo > 0 ? 'text-destructive' : 'text-success'}`}>
                  {formatARS(saldo)}
                </p>
              </div>
            </Link>
          )}
          <Link
            href={`/dashboard/clientes/${cliente.id}/editar`}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-border bg-card text-[13px] font-medium hover:bg-card/60 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Link>
        </div>
      </div>

      {/* Vista rápida para atmosféricos */}
      {esAtmos && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cliente.telefono && (
            <a
              href={`tel:${cliente.telefono}`}
              className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 hover:bg-card/60 transition-colors"
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Teléfono</p>
                <p className="font-mono text-sm font-medium">{cliente.telefono}</p>
              </div>
            </a>
          )}
          {cliente.litrosPozoEstimado && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
              <Droplets className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-[10px] text-blue-500 uppercase tracking-wide">Capacidad del pozo</p>
                <p className="text-sm font-bold text-blue-700">{cliente.litrosPozoEstimado} L</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Datos del cliente */}
      {esAtmos ? (
        /* Vista simplificada para atmosféricos */
        <div className="panel p-5 space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">Datos</h2>
          {cliente.notas && (
            <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              📝 {cliente.notas}
            </p>
          )}
          {!cliente.litrosPozoEstimado && !cliente.telefono && !cliente.notas && (
            <p className="text-sm text-muted-foreground">Sin datos adicionales cargados.</p>
          )}
        </div>
      ) : (
        /* Vista completa para otros planes */
        <div className="panel p-5">
          <h2 className="text-sm font-semibold tracking-tight mb-3">Datos</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {datosMarket.map((d) => (
              <div key={d.label} className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-2">
                <dt className="text-[12px] text-muted-foreground">{d.label}</dt>
                <dd className="text-[13px] font-medium text-right">{d.valor}</dd>
              </div>
            ))}
          </dl>
          {cliente.notas && (
            <p className="text-[12px] text-muted-foreground mt-3 whitespace-pre-wrap">{cliente.notas}</p>
          )}
        </div>
      )}

      {/* Historial de compras — solo para planes con ventas */}
      {!esAtmos && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Compras recientes</h2>
            <Link
              href={`/dashboard/ventas/historial?canal=minorista&cliente=${cliente.id}`}
              className="text-[12px] text-primary hover:underline"
            >
              Ver todo
            </Link>
          </div>
          {compras.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <ShoppingCart className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin compras registradas</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {compras.map((v) => (
                <li key={v.id}>
                  <Link href={`/dashboard/ventas/historial/${v.id}`} className="list-row flex items-center gap-3 px-5 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">#{v.numero}</span>
                    <span className="text-xs text-muted-foreground flex-1 tabular-nums">
                      {new Date(v.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      <span className="ml-2 capitalize">{v.canal}</span>
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border uppercase tracking-wide ${estadoBadge[v.estado] ?? 'bg-muted text-muted-foreground'}`}>
                      {v.estado}
                    </span>
                    <span className="font-mono tabular-nums text-[13px] font-semibold w-24 text-right">{formatARS(Number(v.total))}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
