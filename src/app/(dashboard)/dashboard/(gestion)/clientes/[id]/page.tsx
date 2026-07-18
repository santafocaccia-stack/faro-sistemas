import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft, BookOpen, Pencil, ShoppingCart, ChevronRight,
  Droplets, MapPin, Phone, DollarSign, CalendarClock,
} from 'lucide-react';
import { obtenerCliente } from '@/server/actions/clientes';
import { comprasRecientesCliente } from '@/server/actions/ventas';
import { listarPresupuestosDeCliente } from '@/server/actions/presupuestos';
import { listarPedidosDeCliente } from '@/server/actions/pedidos-atmosfericos';
import { requireSession } from '@/server/auth/session';
import { formatARS } from '@/lib/utils';
import { formatFechaAR } from '@/lib/fechas';

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

const metodoLabel: Record<string, string> = {
  efectivo:      'Efectivo',
  transferencia: 'Transferencia',
  otro:          'Otro',
};

function formatFechaLarga(fechaStr: string) {
  const d = new Date(fechaStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function FichaClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, requireSession()]);
  const esAtmos = session.plan === 'atmosfericos';
  const esServicios = session.plan === 'servicios';

  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  const saldo = Number(cliente.saldoActual);
  const [compras, pedidos, trabajos] = await Promise.all([
    esAtmos || esServicios ? Promise.resolve([]) : comprasRecientesCliente(id),
    esAtmos ? listarPedidosDeCliente(id) : Promise.resolve([]),
    esServicios ? listarPresupuestosDeCliente(id) : Promise.resolve([]),
  ]);

  const direccion = [cliente.direccion, cliente.localidad, cliente.provincia]
    .filter(Boolean)
    .join(', ');

  // Resumen del historial de servicios (atmosféricos)
  const completados = pedidos.filter((p) => p.estado === 'completado');
  const totalCobrado = completados.reduce((s, p) => s + Number(p.montoCobrado ?? 0), 0);

  const datosMarket: { label: string; valor: string }[] = [
    // Minorista/Mayorista es jerga de comercio: no aplica en servicios
    ...(esServicios ? [] : [{ label: 'Tipo', valor: tipoLabel[cliente.tipo] ?? cliente.tipo }]),
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
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-6 animate-fade-up">

      <Link
        href="/dashboard/clientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
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
          <h1 className="text-[26px] font-bold tracking-tight leading-tight text-foreground">{cliente.razonSocial}</h1>
          {esAtmos && direccion && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="h-4 w-4" />{direccion}
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
              className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-accent transition-colors group flex items-center gap-3"
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
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
          >
            <Pencil className="h-4 w-4" /> Editar
          </Link>
        </div>
      </div>

      {/* Atmosféricos: accesos rápidos + resumen */}
      {esAtmos && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cliente.telefono && (
            <a
              href={`tel:${cliente.telefono}`}
              className="rounded-xl border border-border bg-card px-3 py-3 flex flex-col items-center text-center gap-1 hover:bg-accent transition-colors"
            >
              <Phone className="h-5 w-5 text-primary" />
              <p className="font-mono text-xs font-semibold text-foreground">{cliente.telefono}</p>
              <p className="text-[10px] text-muted-foreground">Llamar</p>
            </a>
          )}
          {cliente.litrosPozoEstimado && (
            <div className="rounded-xl border border-blue-600/30 bg-blue-50 px-3 py-3 flex flex-col items-center text-center gap-1">
              <Droplets className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-bold text-blue-700">{cliente.litrosPozoEstimado} L</p>
              <p className="text-[10px] text-blue-700/70">Pozo</p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card px-3 py-3 flex flex-col items-center text-center gap-1">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">{completados.length}</p>
            <p className="text-[10px] text-muted-foreground">servicio{completados.length !== 1 ? 's' : ''}</p>
          </div>
          {totalCobrado > 0 && (
            <div className="rounded-xl border border-green-600/30 bg-green-50 px-3 py-3 flex flex-col items-center text-center gap-1">
              <DollarSign className="h-5 w-5 text-green-700" />
              <p className="text-sm font-bold text-green-700">{formatARS(totalCobrado)}</p>
              <p className="text-[10px] text-green-700/70">total cobrado</p>
            </div>
          )}
        </div>
      )}

      {/* Notas (atmosféricos) */}
      {esAtmos && cliente.notas && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm text-foreground flex items-start gap-2">
            <span className="shrink-0">📝</span>{cliente.notas}
          </p>
        </div>
      )}

      {/* Datos del cliente (otros planes) */}
      {!esAtmos && (
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

      {/* Historial de servicios (atmosféricos) */}
      {esAtmos && (
        <div>
          <h2 className="text-base font-bold tracking-tight mb-3 text-foreground">Historial de pedidos</h2>
          {pedidos.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
              <Droplets className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Todavía no hay pedidos para este cliente.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {pedidos.map((p) => {
                const completado = p.estado === 'completado';
                const cancelado = p.estado === 'cancelado';
                return (
                  <li
                    key={p.id}
                    className={`rounded-xl border bg-card px-4 py-3 ${cancelado ? 'opacity-60 border-border' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground capitalize">
                        {formatFechaLarga(p.fechaProgramada as unknown as string)}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        completado ? 'bg-green-600 text-white'
                        : cancelado ? 'bg-muted text-muted-foreground'
                        : 'bg-amber-400 text-amber-950'
                      }`}>
                        {completado ? 'Completado' : cancelado ? 'Cancelado' : p.estado === 'en_camino' ? 'En camino' : 'Pendiente'}
                      </span>
                    </div>
                    {completado && (
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {p.montoCobrado && (
                          <span className="flex items-center gap-1 text-green-700 font-bold text-base">
                            <DollarSign className="w-4 h-4" />{formatARS(Number(p.montoCobrado))}
                          </span>
                        )}
                        {p.litrosExtraidos && (
                          <span className="flex items-center gap-1 text-blue-700 font-medium text-sm">
                            <Droplets className="w-4 h-4" />{p.litrosExtraidos} L sacados
                          </span>
                        )}
                        {p.metodoPago && (
                          <span className="text-xs text-muted-foreground">
                            {metodoLabel[p.metodoPago] ?? p.metodoPago}
                          </span>
                        )}
                      </div>
                    )}
                    {p.notas && (
                      <p className="text-sm text-muted-foreground mt-1.5 italic">{p.notas}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Historial de trabajos (plan servicios: presupuestos y boletas) */}
      {esServicios && (
        <div className="panel overflow-hidden">
          <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Trabajos recientes</h2>
            <Link href="/dashboard/presupuestos" className="text-[12px] text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {trabajos.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <BookOpen className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Sin trabajos registrados</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Cuando le hagas un presupuesto (eligiéndolo como cliente) va a aparecer acá.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {trabajos.map((t) => {
                const estadoTrabajoBadge: Record<string, string> = {
                  cobrado:   'bg-success/15 text-success border-success/20',
                  aprobado:  'bg-warning/15 text-warning border-warning/20',
                  enviado:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  borrador:  'bg-muted text-muted-foreground border-border',
                  rechazado: 'bg-destructive/15 text-destructive border-destructive/20',
                  vencido:   'bg-destructive/15 text-destructive border-destructive/20',
                };
                const seniado = t.estado === 'aprobado' && Number(t.montoCobrado) > 0;
                return (
                  <li key={t.id}>
                    <Link href={`/dashboard/presupuestos/${t.id}`} className="list-row flex items-center gap-3 px-5 py-2.5">
                      <span className="font-mono text-xs text-muted-foreground w-14 shrink-0">#{String(t.numero).padStart(5, '0')}</span>
                      <span className="text-xs text-muted-foreground flex-1 tabular-nums">
                        {formatFechaAR(t.fecha, { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border uppercase tracking-wide ${estadoTrabajoBadge[t.estado] ?? 'bg-muted text-muted-foreground'}`}>
                        {seniado ? 'Señado' : t.estado}
                      </span>
                      <span className="font-mono tabular-nums text-[13px] font-semibold w-24 text-right">{formatARS(Number(t.total))}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Historial de compras (otros planes) */}
      {!esAtmos && !esServicios && (
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
                      {formatFechaAR(v.fecha, { day: '2-digit', month: '2-digit', year: '2-digit' })}
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
