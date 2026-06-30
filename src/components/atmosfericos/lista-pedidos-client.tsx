'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from '@hello-pangea/dnd';
import { createClient } from '@/lib/supabase/client';
import { mapsUrlRuta, mapsUrlDestino, mapsUrlBusqueda, direccionParaLog } from '@/lib/geo';
import {
  reordenarPedidos, crearPedido, completarPedido,
  marcarEnCamino, cancelarPedido, guardarClienteDesdePedido, editarPedido,
} from '@/server/actions/pedidos-atmosfericos';
import type { PedidoDelDia } from '@/server/actions/pedidos-atmosfericos';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  MapPin, GripVertical, CheckCircle2, Truck, XCircle,
  Plus, Phone, Droplets, DollarSign, User, ChevronDown, Navigation, History,
  ChevronLeft, ChevronRight, Pencil, TrendingUp, TrendingDown, StickyNote, FileText,
} from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { ModalCompletarPedido } from './modal-completar-pedido';
import { ModalNuevoPedido } from './modal-nuevo-pedido';
import { ModalEditarPedido } from './modal-editar-pedido';
import { ModalBoletaManual } from './modal-boleta-manual';
import { BotonBoleta } from './boton-boleta';

/* Feature flag: el link de Maps / "Cómo llegar" todavía no anda bien.
   Se oculta en producción y se mantiene en staging para seguir trabajándolo.
   Activar con NEXT_PUBLIC_FEATURE_MAPS=1 (env de staging/local). */
const MAPS_HABILITADO = process.env.NEXT_PUBLIC_FEATURE_MAPS === '1';

type ClienteBasico = {
  id: string;
  nombre: string;
  direccion: string | null;
  localidad: string | null;
  litrosPozo: string | null;
  telefono: string | null;
};

type Props = {
  pedidosIniciales: PedidoDelDia[];
  clientesDisponibles: ClienteBasico[];
  fecha: string;
  tenantId: string;
  esGestor: boolean;
  gastosHoy: number;
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente:   'Pendiente',
  en_camino:   'En camino',
  completado:  'Completado',
  cancelado:   'Cancelado',
};

/* Badges sólidos de alto contraste — legibles a pleno sol. */
const ESTADO_COLOR: Record<string, string> = {
  pendiente:  'bg-amber-400 text-amber-950',
  en_camino:  'bg-blue-600 text-white',
  completado: 'bg-green-600 text-white',
  cancelado:  'bg-muted text-muted-foreground',
};

function addDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d! + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function etiquetaFecha(iso: string, hoy: string): string {
  if (iso === hoy) return 'Hoy';
  if (iso === addDias(hoy, 1)) return 'Mañana';
  if (iso === addDias(hoy, -1)) return 'Ayer';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Título del pedido: nombre del cliente registrado, o nombre de contacto, o la dirección */
function tituloPedido(pedido: PedidoDelDia): string {
  return pedido.clienteNombre ?? pedido.nombreContacto ?? pedido.direccion;
}

export function ListaPedidosClient({
  pedidosIniciales, clientesDisponibles, fecha, tenantId, esGestor, gastosHoy,
}: Props) {
  const router = useRouter();
  const hoyStr = new Date().toLocaleDateString('en-CA');
  const esHoy = fecha === hoyStr;

  function irAFecha(f: string) {
    router.push(`/dashboard/atmosfericos?fecha=${f}`);
  }

  const [pedidos, setPedidos] = useState<PedidoDelDia[]>(pedidosIniciales);
  const [modalCompletar, setModalCompletar] = useState<PedidoDelDia | null>(null);
  const [modalEditar, setModalEditar] = useState<PedidoDelDia | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalBoleta, setModalBoleta] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPedidos(pedidosIniciales);
  }, [pedidosIniciales]);

  // Diagnóstico de rutas
  useEffect(() => {
    const activos = pedidosIniciales.filter(
      (p) => p.estado !== 'cancelado' && p.estado !== 'completado',
    );
    if (activos.length === 0) return;
    console.groupCollapsed('[atmosfericos] rastrillaje de ruta');
    activos.forEach((p, i) => {
      const parada = { direccion: p.direccion, localidad: p.localidad };
      console.log(`#${i + 1}`, {
        direccion_raw: p.direccion,
        string_compuesto: direccionParaLog(parada),
        url_busqueda: mapsUrlBusqueda(parada),
        url_destino: mapsUrlDestino(parada),
      });
    });
    console.log('url_ruta_completa:', mapsUrlRuta(activos));
    console.groupEnd();
  }, [pedidosIniciales]);

  // Real-time via Supabase
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pedidos-atmos-${tenantId}-${fecha}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos_atmosfericos', filter: `tenant_id=eq.${tenantId}` },
        () => { router.refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fecha, router]);

  // Drag & Drop
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const nuevaLista = Array.from(pedidos);
    const [movido] = nuevaLista.splice(result.source.index, 1) as [typeof nuevaLista[number]];
    nuevaLista.splice(result.destination.index, 0, movido);
    setPedidos(nuevaLista);
    startTransition(() => reordenarPedidos(nuevaLista.map((p) => p.id), fecha));
  }, [pedidos, fecha]);

  function handleEnCamino(id: string) {
    startTransition(async () => {
      await marcarEnCamino(id);
      setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, estado: 'en_camino' } : p));
    });
  }

  function handleCancelar(id: string) {
    if (!confirm('¿Cancelar este pedido?')) return;
    startTransition(async () => {
      await cancelarPedido(id);
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    });
  }

  async function handleGuardarCliente(id: string, pedido: PedidoDelDia) {
    const sugerencia = pedido.nombreContacto ?? pedido.direccion;
    const nombre = prompt('Nombre para el cliente:', sugerencia);
    if (!nombre) return;
    await guardarClienteDesdePedido(id, nombre);
    setPedidos((prev) => prev.map((p) =>
      p.id === id ? { ...p, clienteNombre: nombre } : p
    ));
  }

  const pendientes  = pedidos.filter((p) => p.estado !== 'cancelado' && p.estado !== 'completado');
  const completados = pedidos.filter((p) => p.estado === 'completado');
  const cobradoHoy  = completados.reduce((s, p) => s + Number(p.montoCobrado ?? 0), 0);
  const balanceHoy  = cobradoHoy - gastosHoy;
  const mapsUrl     = mapsUrlRuta(pendientes);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pedidos · {etiquetaFecha(fecha, hoyStr)}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => irAFecha(addDias(fecha, -1))}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition-colors"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && irAFecha(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground"
            />
            <button
              type="button"
              onClick={() => irAFecha(addDias(fecha, 1))}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition-colors"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {!esHoy && (
              <button
                type="button"
                onClick={() => irAFecha(hoyStr)}
                className="h-11 px-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-semibold"
              >
                Hoy
              </button>
            )}
          </div>
        </div>
        {esGestor && (
          <Button
            className="h-12 px-5 text-base font-semibold glow-primary"
            onClick={() => setModalNuevo(true)}
          >
            <Plus className="w-5 h-5 mr-2" /> Agregar pedido
          </Button>
        )}
      </div>

      {/* ── Acciones secundarias ── */}
      <div className="flex gap-2 flex-wrap">
        <Link href="/dashboard/atmosfericos/historial" className="flex-1 sm:flex-none">
          <Button variant="outline" className="h-11 px-4 text-base w-full">
            <History className="w-5 h-5 mr-2" /> Historial
          </Button>
        </Link>
        {MAPS_HABILITADO && mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
            <Button variant="outline" className="h-11 px-4 text-base w-full">
              <Navigation className="w-5 h-5 mr-2" /> Ver ruta del día
            </Button>
          </a>
        )}
        <Button variant="outline" className="h-11 px-4 text-base flex-1 sm:flex-none" onClick={() => setModalBoleta(true)}>
          <FileText className="w-5 h-5 mr-2" /> Generar boleta
        </Button>
      </div>

      {/* ── Resumen del día ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center">
          <div className="font-bold text-2xl text-foreground">{pendientes.length}</div>
          <div className="text-muted-foreground text-xs font-medium mt-0.5">pendiente{pendientes.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-2xl border border-green-600/30 bg-green-50 px-3 py-3 text-center">
          <div className="font-bold text-2xl text-green-700">{completados.length}</div>
          <div className="text-green-700/80 text-xs font-medium mt-0.5">completado{completados.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-2xl border border-blue-600/30 bg-blue-50 px-3 py-3 text-center">
          <div className="font-bold text-lg text-blue-700">{formatARS(cobradoHoy)}</div>
          <div className="text-blue-700/80 text-xs font-medium mt-0.5">cobrado</div>
        </div>
        {esHoy && (
          <div className={`rounded-2xl border px-3 py-3 text-center ${
            balanceHoy >= 0
              ? 'border-emerald-600/30 bg-emerald-50'
              : 'border-red-600/30 bg-red-50'
          }`}>
            <div className={`font-bold text-lg flex items-center justify-center gap-1 ${
              balanceHoy >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {balanceHoy >= 0
                ? <TrendingUp className="w-4 h-4" />
                : <TrendingDown className="w-4 h-4" />}
              {formatARS(Math.abs(balanceHoy))}
            </div>
            <div className={`text-xs font-medium mt-0.5 ${balanceHoy >= 0 ? 'text-emerald-700/80' : 'text-red-700/80'}`}>
              balance{gastosHoy > 0 ? ` · −${formatARS(gastosHoy)} gastos` : ''}
            </div>
          </div>
        )}
      </div>

      {/* ── Lista con drag-and-drop ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="pedidos" isDropDisabled={!esGestor}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-3">
              {pedidos.length === 0 && (
                <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
                  <p className="text-muted-foreground">No hay pedidos para este día.</p>
                  {esGestor && (
                    <button onClick={() => setModalNuevo(true)} className="mt-2 underline text-primary font-semibold">
                      Agregá el primero
                    </button>
                  )}
                </div>
              )}

              {pedidos.map((pedido, index) => {
                const completado = pedido.estado === 'completado';
                const cancelado = pedido.estado === 'cancelado';
                return (
                  <Draggable
                    key={pedido.id}
                    draggableId={pedido.id}
                    index={index}
                    isDragDisabled={!esGestor || completado || cancelado}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`
                          rounded-2xl border bg-card shadow-sm transition-shadow
                          ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : 'border-border'}
                          ${cancelado ? 'opacity-50' : ''}
                          ${completado ? 'bg-green-50/60 border-green-600/20' : ''}
                        `}
                      >
                        {/* ── Card header (tap para expandir) ── */}
                        <div
                          className="flex items-start gap-3 p-4 cursor-pointer"
                          onClick={() => setExpandido(expandido === pedido.id ? null : pedido.id)}
                        >
                          {/* Número + drag handle */}
                          <div className="flex items-center gap-1 shrink-0">
                            {esGestor && pedido.estado === 'pendiente' && (
                              <span
                                {...provided.dragHandleProps}
                                className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical className="w-5 h-5" />
                              </span>
                            )}
                            <span className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-base font-bold">
                              {index + 1}
                            </span>
                          </div>

                          {/* Info principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-lg leading-tight text-foreground">
                                {tituloPedido(pedido)}
                              </p>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${ESTADO_COLOR[pedido.estado]}`}>
                                {ESTADO_LABEL[pedido.estado]}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-4 h-4 shrink-0" />
                              {pedido.direccion}{pedido.localidad ? `, ${pedido.localidad}` : ''}
                            </p>

                            {/* Info rápida visible */}
                            {completado && (
                              <div className="flex gap-4 mt-2 text-base flex-wrap">
                                {pedido.litrosExtraidos && (
                                  <span className="flex items-center gap-1 text-blue-700 font-semibold">
                                    <Droplets className="w-4 h-4" />
                                    {pedido.litrosExtraidos} L
                                  </span>
                                )}
                                {pedido.montoCobrado && (
                                  <span className="flex items-center gap-1 text-green-700 font-bold">
                                    <DollarSign className="w-4 h-4" />
                                    {formatARS(Number(pedido.montoCobrado))}
                                  </span>
                                )}
                              </div>
                            )}
                            {!completado && (pedido.litrosPozo ?? pedido.clienteLitrosPozo) && (
                              <p className="text-sm text-blue-700 mt-1.5 flex items-center gap-1 font-medium">
                                <Droplets className="w-4 h-4" />
                                Pozo: {pedido.litrosPozo ?? pedido.clienteLitrosPozo} L
                              </p>
                            )}
                            {pedido.notas && (
                              <p className="text-sm text-foreground/70 mt-1.5 flex items-start gap-1.5">
                                <StickyNote className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                <span className="line-clamp-2">{pedido.notas}</span>
                              </p>
                            )}
                          </div>

                          <ChevronDown className={`w-6 h-6 text-muted-foreground shrink-0 transition-transform ${expandido === pedido.id ? 'rotate-180' : ''}`} />
                        </div>

                        {/* ── Expanded ── */}
                        {expandido === pedido.id && (
                          <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col gap-3">
                            {pedido.referencias && (
                              <p className="text-sm text-foreground bg-muted rounded-xl px-3 py-2.5 flex items-start gap-2">
                                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                                {pedido.referencias}
                              </p>
                            )}
                            {pedido.notas && (
                              <p className="text-sm text-foreground bg-amber-50 border border-amber-300 rounded-xl px-3 py-2.5 flex items-start gap-2">
                                <StickyNote className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                {pedido.notas}
                              </p>
                            )}
                            {pedido.clienteTelefono && (
                              <a
                                href={`tel:${pedido.clienteTelefono}`}
                                className="text-base flex items-center gap-2 text-primary font-semibold"
                              >
                                <Phone className="w-5 h-5" /> {pedido.clienteTelefono}
                              </a>
                            )}

                            {/* Acciones */}
                            <div className="flex gap-2 flex-wrap pt-1">
                              {MAPS_HABILITADO && (
                                <a
                                  href={mapsUrlDestino({ direccion: pedido.direccion, localidad: pedido.localidad, mapsLink: pedido.mapsLink })}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button variant="outline" className="h-12 px-4 text-base">
                                    <Navigation className="w-5 h-5 mr-1.5" /> Cómo llegar
                                  </Button>
                                </a>
                              )}

                              {/* Boleta — solo cuando el pozo ya se hizo (completado) */}
                              {completado && (
                                <BotonBoleta
                                  url={`/api/pdf/boleta-atmos?pedido=${pedido.id}`}
                                  numero={String(pedido.fechaProgramada).replace(/-/g, '')}
                                />
                              )}

                              {pedido.estado === 'pendiente' && (
                                <>
                                  <Button
                                    variant="outline"
                                    className="h-12 px-4 text-base"
                                    onClick={() => handleEnCamino(pedido.id)}
                                    disabled={isPending}
                                  >
                                    <Truck className="w-5 h-5 mr-1.5" /> En camino
                                  </Button>
                                  <Button
                                    className="h-12 px-5 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => setModalCompletar(pedido)}
                                    disabled={isPending}
                                  >
                                    <CheckCircle2 className="w-5 h-5 mr-1.5" /> Completar
                                  </Button>
                                </>
                              )}

                              {pedido.estado === 'en_camino' && (
                                <Button
                                  className="h-12 px-5 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => setModalCompletar(pedido)}
                                  disabled={isPending}
                                >
                                  <CheckCircle2 className="w-5 h-5 mr-1.5" /> Completar
                                </Button>
                              )}

                              {esGestor && !cancelado && (
                                <Button
                                  variant="outline"
                                  className="h-12 px-4 text-base"
                                  onClick={() => setModalEditar(pedido)}
                                >
                                  <Pencil className="w-5 h-5 mr-1.5" /> Editar
                                </Button>
                              )}

                              {!pedido.clienteId && !cancelado && (
                                <Button
                                  variant="outline"
                                  className="h-12 px-4 text-base"
                                  onClick={() => handleGuardarCliente(pedido.id, pedido)}
                                >
                                  <User className="w-5 h-5 mr-1.5" /> Guardar como cliente
                                </Button>
                              )}

                              {esGestor && !completado && !cancelado && (
                                <Button
                                  variant="ghost"
                                  className="h-12 px-4 text-base text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleCancelar(pedido.id)}
                                  disabled={isPending}
                                >
                                  <XCircle className="w-5 h-5 mr-1.5" /> Cancelar
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* ── Diagnóstico de rutas (colapsado) ── */}
      {MAPS_HABILITADO && pendientes.length > 0 && (
        <details className="rounded-xl border border-border bg-card text-xs">
          <summary className="cursor-pointer px-3 py-2.5 font-medium text-muted-foreground select-none">
            🔍 Diagnóstico de ruta
          </summary>
          <div className="px-3 pb-3 flex flex-col gap-3">
            {pendientes.map((p, i) => {
              const parada = { direccion: p.direccion, localidad: p.localidad };
              return (
                <div key={p.id} className="rounded-lg border border-border bg-muted p-2.5 flex flex-col gap-1.5">
                  <div className="font-semibold text-foreground">#{i + 1} — {tituloPedido(p)}</div>
                  <div className="font-mono text-[11px] break-all bg-card rounded px-2 py-1">
                    "{direccionParaLog(parada)}"
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <a href={mapsUrlBusqueda(parada)} target="_blank" rel="noopener noreferrer" className="underline text-primary">Búsqueda</a>
                    <a href={mapsUrlDestino(parada)} target="_blank" rel="noopener noreferrer" className="underline text-primary">Ir a</a>
                  </div>
                </div>
              );
            })}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="underline text-primary font-medium">
                Abrir ruta completa ({pendientes.length} paradas)
              </a>
            )}
          </div>
        </details>
      )}

      {/* ── Modales ── */}
      {modalCompletar && (
        <ModalCompletarPedido
          pedido={modalCompletar}
          onClose={() => setModalCompletar(null)}
          onCompletar={async (input) => {
            await completarPedido(modalCompletar.id, input);
            setPedidos((prev) =>
              prev.map((p) =>
                p.id === modalCompletar.id
                  ? { ...p, estado: 'completado', montoCobrado: input.montoCobrado, litrosExtraidos: input.litrosExtraidos ?? null }
                  : p
              )
            );
            setModalCompletar(null);
          }}
        />
      )}

      {modalEditar && (
        <ModalEditarPedido
          pedido={modalEditar}
          onClose={() => setModalEditar(null)}
          onEditar={async (input) => {
            await editarPedido(modalEditar.id, input);
            setModalEditar(null);
            router.refresh();
          }}
        />
      )}

      {modalNuevo && (
        <ModalNuevoPedido
          clientes={clientesDisponibles}
          fecha={fecha}
          onClose={() => setModalNuevo(false)}
          onCreate={async (input) => {
            await crearPedido(input);
            setModalNuevo(false);
            router.refresh();
          }}
        />
      )}

      {modalBoleta && (
        <ModalBoletaManual onClose={() => setModalBoleta(false)} />
      )}
    </div>
  );
}
