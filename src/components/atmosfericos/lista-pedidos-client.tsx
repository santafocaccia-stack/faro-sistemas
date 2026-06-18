'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DragDropContext, Droppable, Draggable, type DropResult,
} from '@hello-pangea/dnd';
import { createClient } from '@/lib/supabase/client';
import { mapsUrlRuta, mapsUrlDestino } from '@/lib/geo';
import {
  reordenarPedidos, crearPedido, completarPedido,
  marcarEnCamino, cancelarPedido, guardarClienteDesdePedido,
} from '@/server/actions/pedidos-atmosfericos';
import type { PedidoDelDia } from '@/server/actions/pedidos-atmosfericos';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  MapPin, GripVertical, CheckCircle2, Truck, XCircle,
  Plus, Phone, Droplets, DollarSign, User, ChevronDown, Navigation, History,
} from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { ModalCompletarPedido } from './modal-completar-pedido';
import { ModalNuevoPedido } from './modal-nuevo-pedido';

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
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente:   'Pendiente',
  en_camino:   'En camino',
  completado:  'Completado',
  cancelado:   'Cancelado',
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente:  'bg-muted text-muted-foreground',
  en_camino:  'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completado: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelado:  'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
};

export function ListaPedidosClient({
  pedidosIniciales, clientesDisponibles, fecha, tenantId, esGestor,
}: Props) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<PedidoDelDia[]>(pedidosIniciales);
  const [modalCompletar, setModalCompletar] = useState<PedidoDelDia | null>(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sincronizar con los datos del servidor cuando cambian (router.refresh)
  useEffect(() => {
    setPedidos(pedidosIniciales);
  }, [pedidosIniciales]);

  // ── Real-time via Supabase ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pedidos-atmos-${tenantId}-${fecha}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos_atmosfericos',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Al recibir cualquier cambio, re-ejecutar el server component
          // (liviano: no recarga toda la página, sólo refetchea los datos).
          router.refresh();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tenantId, fecha, router]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;

    const nuevaLista = Array.from(pedidos);
    const [movido] = nuevaLista.splice(result.source.index, 1) as [typeof nuevaLista[number]];
    nuevaLista.splice(result.destination.index, 0, movido);
    setPedidos(nuevaLista); // Optimista

    const ids = nuevaLista.map((p) => p.id);
    startTransition(() => reordenarPedidos(ids, fecha));
  }, [pedidos, fecha]);

  // ── Acciones ─────────────────────────────────────────────────────────────
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

  async function handleGuardarCliente(id: string, nombre: string) {
    await guardarClienteDesdePedido(id, nombre);
    setPedidos((prev) => prev.map((p) =>
      p.id === id ? { ...p, clienteNombre: nombre } : p
    ));
  }

  const pendientes = pedidos.filter((p) => p.estado !== 'cancelado' && p.estado !== 'completado');
  const completados = pedidos.filter((p) => p.estado === 'completado');
  const mapsUrl = mapsUrlRuta(pendientes);

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos del día</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/atmosfericos/historial">
            <Button variant="ghost" size="sm">
              <History className="w-4 h-4 mr-1" /> Historial
            </Button>
          </Link>
          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Navigation className="w-4 h-4 mr-1" /> Ver ruta
              </Button>
            </a>
          )}
          {esGestor && (
            <Button size="sm" onClick={() => setModalNuevo(true)}>
              <Plus className="w-4 h-4 mr-1" /> Agregar pedido
            </Button>
          )}
        </div>
      </div>

      {/* ── Resumen ── */}
      <div className="flex gap-3 text-sm">
        <span className="px-2 py-1 rounded-md bg-muted">
          {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''}
        </span>
        <span className="px-2 py-1 rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
          {completados.length} completado{completados.length !== 1 ? 's' : ''}
        </span>
        {completados.length > 0 && (
          <span className="px-2 py-1 rounded-md bg-muted ml-auto font-medium">
            Total cobrado:{' '}
            {formatARS(
              completados.reduce((s, p) => s + Number(p.montoCobrado ?? 0), 0)
            )}
          </span>
        )}
      </div>

      {/* ── Lista con drag-and-drop ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="pedidos" isDropDisabled={!esGestor}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex flex-col gap-2"
            >
              {pedidos.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No hay pedidos para este día.{' '}
                  {esGestor && (
                    <button onClick={() => setModalNuevo(true)} className="underline">
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
                        rounded-xl border bg-card shadow-sm transition-shadow
                        ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''}
                        ${pedido.estado === 'cancelado' ? 'opacity-50' : ''}
                      `}
                    >
                      {/* ── Card header ── */}
                      <div className="flex items-start gap-3 p-4">
                        {/* Número de orden */}
                        <div className="flex items-center gap-1 shrink-0">
                          {esGestor && pedido.estado === 'pendiente' && (
                            <span {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                              <GripVertical className="w-4 h-4" />
                            </span>
                          )}
                          <span className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-sm font-bold">
                            {index + 1}
                          </span>
                        </div>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-semibold leading-tight">
                                {pedido.clienteNombre ?? pedido.nombreContacto ?? 'Sin nombre'}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {pedido.direccion}
                                {pedido.localidad ? `, ${pedido.localidad}` : ''}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[pedido.estado]}`}>
                              {ESTADO_LABEL[pedido.estado]}
                            </span>
                          </div>

                          {/* Datos del pozo (si completado) */}
                          {pedido.estado === 'completado' && (
                            <div className="flex gap-3 mt-2 text-sm">
                              {pedido.litrosExtraidos && (
                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                  <Droplets className="w-3 h-3" />
                                  {pedido.litrosExtraidos} L
                                </span>
                              )}
                              {pedido.montoCobrado && (
                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <DollarSign className="w-3 h-3" />
                                  {formatARS(Number(pedido.montoCobrado))}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Litros del pozo del cliente */}
                          {pedido.estado !== 'completado' && (pedido.litrosPozo ?? pedido.clienteLitrosPozo) && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Droplets className="w-3 h-3" />
                              Pozo estimado: {pedido.litrosPozo ?? pedido.clienteLitrosPozo} L
                            </p>
                          )}
                        </div>

                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandido(expandido === pedido.id ? null : pedido.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandido === pedido.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {/* ── Expanded content ── */}
                      {expandido === pedido.id && (
                        <div className="px-4 pb-4 border-t pt-3 flex flex-col gap-3">
                          {pedido.referencias && (
                            <p className="text-sm text-muted-foreground">
                              📍 {pedido.referencias}
                            </p>
                          )}
                          {pedido.clienteTelefono && (
                            <a
                              href={`tel:${pedido.clienteTelefono}`}
                              className="text-sm flex items-center gap-2 text-primary"
                            >
                              <Phone className="w-4 h-4" /> {pedido.clienteTelefono}
                            </a>
                          )}
                          {pedido.notas && (
                            <p className="text-sm text-muted-foreground bg-muted rounded-lg px-3 py-2">
                              {pedido.notas}
                            </p>
                          )}

                          {/* Historial del cliente */}
                          {pedido.clienteLitrosPozo && pedido.estado !== 'completado' && (
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                              Pozo de {pedido.clienteNombre}: {pedido.clienteLitrosPozo} L estimados
                            </div>
                          )}

                          {/* Acciones */}
                          <div className="flex gap-2 flex-wrap pt-1">
                            <a
                              href={mapsUrlDestino({ direccion: pedido.direccion, localidad: pedido.localidad })}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline">
                                <Navigation className="w-3 h-3 mr-1" /> Cómo llegar
                              </Button>
                            </a>

                            {pedido.estado === 'pendiente' && (
                              <>
                                <Button
                                  size="sm" variant="outline"
                                  onClick={() => handleEnCamino(pedido.id)}
                                  disabled={isPending}
                                >
                                  <Truck className="w-3 h-3 mr-1" /> En camino
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setModalCompletar(pedido)}
                                  disabled={isPending}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Completar
                                </Button>
                              </>
                            )}

                            {pedido.estado === 'en_camino' && (
                              <Button
                                size="sm"
                                onClick={() => setModalCompletar(pedido)}
                                disabled={isPending}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Completar
                              </Button>
                            )}

                            {/* Guardar como cliente si es ad-hoc */}
                            {!pedido.clienteId && pedido.estado !== 'cancelado' && (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => {
                                  const nombre = prompt('Nombre del cliente:', pedido.nombreContacto ?? '');
                                  if (nombre) handleGuardarCliente(pedido.id, nombre);
                                }}
                              >
                                <User className="w-3 h-3 mr-1" /> Guardar cliente
                              </Button>
                            )}

                            {esGestor && pedido.estado !== 'completado' && pedido.estado !== 'cancelado' && (
                              <Button
                                size="sm" variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleCancelar(pedido.id)}
                                disabled={isPending}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Cancelar
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
