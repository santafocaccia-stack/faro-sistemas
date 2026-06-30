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
  ChevronLeft, ChevronRight, Pencil, TrendingUp, TrendingDown,
} from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { ModalCompletarPedido } from './modal-completar-pedido';
import { ModalNuevoPedido } from './modal-nuevo-pedido';
import { ModalEditarPedido } from './modal-editar-pedido';

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

const ESTADO_COLOR: Record<string, string> = {
  pendiente:  'bg-amber-100 text-amber-800 border border-amber-300',
  en_camino:  'bg-blue-500 text-white',
  completado: 'bg-green-500 text-white',
  cancelado:  'bg-gray-200 text-gray-500',
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
    // Pre-fill con dirección si no hay nombre
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
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Pedidos · {etiquetaFecha(fecha, hoyStr)}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => irAFecha(addDias(fecha, -1))}
              className="h-10 w-10 flex items-center justify-center rounded-xl border-2 border-gray-300 hover:bg-gray-100 transition-colors"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && irAFecha(e.target.value)}
              className="h-10 px-3 rounded-xl border-2 border-gray-300 bg-white text-sm font-medium"
            />
            <button
              type="button"
              onClick={() => irAFecha(addDias(fecha, 1))}
              className="h-10 w-10 flex items-center justify-center rounded-xl border-2 border-gray-300 hover:bg-gray-100 transition-colors"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {!esHoy && (
              <button
                type="button"
                onClick={() => irAFecha(hoyStr)}
                className="h-10 px-4 rounded-xl border-2 border-gray-300 hover:bg-gray-100 transition-colors text-sm font-semibold"
              >
                Hoy
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/atmosfericos/historial">
            <Button variant="outline" className="h-11 px-4 text-base">
              <History className="w-5 h-5 mr-2" /> Historial
            </Button>
          </Link>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-11 px-4 text-base">
                <Navigation className="w-5 h-5 mr-2" /> Ver ruta
              </Button>
            </a>
          )}
          {esGestor && (
            <Button className="h-11 px-4 text-base font-semibold" onClick={() => setModalNuevo(true)}>
              <Plus className="w-5 h-5 mr-2" /> Agregar pedido
            </Button>
          )}
        </div>
      </div>

      {/* ── Resumen del día ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div className="rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-center">
          <div className="font-bold text-lg">{pendientes.length}</div>
          <div className="text-gray-500 text-xs">pendiente{pendientes.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-xl border-2 border-green-300 bg-green-50 px-3 py-2.5 text-center">
          <div className="font-bold text-lg text-green-700">{completados.length}</div>
          <div className="text-green-600 text-xs">completado{completados.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2.5 text-center">
          <div className="font-bold text-base text-blue-700">{formatARS(cobradoHoy)}</div>
          <div className="text-blue-500 text-xs">cobrado</div>
        </div>
        {esHoy && (
          <div className={`rounded-xl border-2 px-3 py-2.5 text-center ${
            balanceHoy >= 0
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-red-300 bg-red-50'
          }`}>
            <div className={`font-bold text-base flex items-center justify-center gap-1 ${
              balanceHoy >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {balanceHoy >= 0
                ? <TrendingUp className="w-4 h-4" />
                : <TrendingDown className="w-4 h-4" />
              }
              {formatARS(Math.abs(balanceHoy))}
            </div>
            <div className={`text-xs ${balanceHoy >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              balance{gastosHoy > 0 ? ` (−${formatARS(gastosHoy)} gastos)` : ''}
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
                <div className="text-center py-16 text-gray-400">
                  No hay pedidos para este día.{' '}
                  {esGestor && (
                    <button onClick={() => setModalNuevo(true)} className="underline text-blue-600 font-medium">
                      Agregá uno
                    </button>
                  )}
                </div>
              )}

              {pedidos.map((pedido, index) => (
                <Draggable
                  key={pedido.id}
                  draggableId={pedido.id}
                  index={index}
                  isDragDisabled={!esGestor || pedido.estado === 'completado' || pedido.estado === 'cancelado'}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`
                        rounded-2xl border-2 bg-white shadow-sm transition-shadow
                        ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-400' : 'border-gray-200'}
                        ${pedido.estado === 'cancelado' ? 'opacity-50' : ''}
                        ${pedido.estado === 'completado' ? 'border-green-200 bg-green-50/30' : ''}
                      `}
                    >
                      {/* ── Card header ── */}
                      <div
                        className="flex items-start gap-3 p-4 cursor-pointer"
                        onClick={() => setExpandido(expandido === pedido.id ? null : pedido.id)}
                      >
                        {/* Número + drag handle */}
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {esGestor && pedido.estado === 'pendiente' && (
                            <span {...provided.dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-500" onClick={(e) => e.stopPropagation()}>
                              <GripVertical className="w-5 h-5" />
                            </span>
                          )}
                          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                            {index + 1}
                          </span>
                        </div>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="font-bold text-base leading-tight text-gray-900">
                              {tituloPedido(pedido)}
                            </p>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${ESTADO_COLOR[pedido.estado]}`}>
                              {ESTADO_LABEL[pedido.estado]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            {pedido.direccion}{pedido.localidad ? `, ${pedido.localidad}` : ''}
                          </p>

                          {/* Info rápida siempre visible */}
                          {pedido.estado === 'completado' && (
                            <div className="flex gap-3 mt-1.5 text-sm flex-wrap">
                              {pedido.litrosExtraidos && (
                                <span className="flex items-center gap-1 text-blue-600 font-medium">
                                  <Droplets className="w-3.5 h-3.5" />
                                  {pedido.litrosExtraidos} L
                                </span>
                              )}
                              {pedido.montoCobrado && (
                                <span className="flex items-center gap-1 text-green-700 font-bold">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {formatARS(Number(pedido.montoCobrado))}
                                </span>
                              )}
                            </div>
                          )}
                          {pedido.estado !== 'completado' && (pedido.litrosPozo ?? pedido.clienteLitrosPozo) && (
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Droplets className="w-3 h-3" />
                              Pozo: {pedido.litrosPozo ?? pedido.clienteLitrosPozo} L
                            </p>
                          )}
                          {/* Notas siempre visibles */}
                          {pedido.notas && (
                            <p className="text-sm text-gray-500 mt-1 italic truncate">
                              📝 {pedido.notas}
                            </p>
                          )}
                        </div>

                        <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 mt-0.5 transition-transform ${expandido === pedido.id ? 'rotate-180' : ''}`} />
                      </div>

                      {/* ── Expanded content ── */}
                      {expandido === pedido.id && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex flex-col gap-3">
                          {pedido.referencias && (
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                              📍 {pedido.referencias}
                            </p>
                          )}
                          {pedido.notas && (
                            <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                              📝 {pedido.notas}
                            </p>
                          )}
                          {pedido.clienteTelefono && (
                            <a
                              href={`tel:${pedido.clienteTelefono}`}
                              className="text-base flex items-center gap-2 text-blue-600 font-medium"
                            >
                              <Phone className="w-5 h-5" /> {pedido.clienteTelefono}
                            </a>
                          )}

                          {/* Acciones */}
                          <div className="flex gap-2 flex-wrap pt-1">
                            <a
                              href={mapsUrlDestino({ direccion: pedido.direccion, localidad: pedido.localidad, mapsLink: pedido.mapsLink })}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" className="h-11 px-4 text-base">
                                <Navigation className="w-4 h-4 mr-1.5" /> Cómo llegar
                              </Button>
                            </a>

                            {pedido.estado === 'pendiente' && (
                              <>
                                <Button
                                  variant="outline"
                                  className="h-11 px-4 text-base"
                                  onClick={() => handleEnCamino(pedido.id)}
                                  disabled={isPending}
                                >
                                  <Truck className="w-4 h-4 mr-1.5" /> En camino
                                </Button>
                                <Button
                                  className="h-11 px-4 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => setModalCompletar(pedido)}
                                  disabled={isPending}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Completar
                                </Button>
                              </>
                            )}

                            {pedido.estado === 'en_camino' && (
                              <Button
                                className="h-11 px-4 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => setModalCompletar(pedido)}
                                disabled={isPending}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Completar
                              </Button>
                            )}

                            {/* Editar */}
                            {esGestor && pedido.estado !== 'cancelado' && (
                              <Button
                                variant="outline"
                                className="h-11 px-4 text-base"
                                onClick={() => setModalEditar(pedido)}
                              >
                                <Pencil className="w-4 h-4 mr-1.5" /> Editar
                              </Button>
                            )}

                            {/* Guardar como cliente */}
                            {!pedido.clienteId && pedido.estado !== 'cancelado' && (
                              <Button
                                variant="outline"
                                className="h-11 px-4 text-base"
                                onClick={() => handleGuardarCliente(pedido.id, pedido)}
                              >
                                <User className="w-4 h-4 mr-1.5" /> Guardar como cliente
                              </Button>
                            )}

                            {esGestor && pedido.estado !== 'completado' && pedido.estado !== 'cancelado' && (
                              <Button
                                variant="ghost"
                                className="h-11 px-4 text-base text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleCancelar(pedido.id)}
                                disabled={isPending}
                              >
                                <XCircle className="w-4 h-4 mr-1.5" /> Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* ── Diagnóstico de rutas (colapsado) ── */}
      {pendientes.length > 0 && (
        <details className="rounded-xl border bg-gray-50 text-xs">
          <summary className="cursor-pointer px-3 py-2 font-medium text-gray-400 select-none">
            🔍 Diagnóstico de ruta
          </summary>
          <div className="px-3 pb-3 flex flex-col gap-3">
            {pendientes.map((p, i) => {
              const parada = { direccion: p.direccion, localidad: p.localidad };
              return (
                <div key={p.id} className="rounded-lg border bg-white p-2.5 flex flex-col gap-1.5">
                  <div className="font-semibold">#{i + 1} — {tituloPedido(p)}</div>
                  <div className="font-mono text-[11px] break-all bg-gray-50 rounded px-2 py-1">
                    "{direccionParaLog(parada)}"
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <a href={mapsUrlBusqueda(parada)} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Búsqueda</a>
                    <a href={mapsUrlDestino(parada)} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Ir a</a>
                  </div>
                </div>
              );
            })}
            {mapsUrl && (
              <div className="rounded-lg border bg-white p-2.5 flex flex-col gap-1.5">
                <div className="font-semibold">Ruta completa ({pendientes.length} paradas)</div>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Abrir ruta completa</a>
              </div>
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
    </div>
  );
}
