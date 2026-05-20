'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Send, Trash2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  confirmarPedido, recibirPedido, actualizarLineaPedido, eliminarLineaPedido,
} from '@/server/actions/pedidos';
import { formatKg } from '@/lib/utils';
import type { PedidoProveedor, PedidoLinea, Proveedor } from '@/server/db/schema';

type Linea = {
  linea: PedidoLinea;
  productoNombre: string;
  tipoUnidad: 'por_kg' | 'por_unidad';
};

type Props = {
  data: {
    pedido: PedidoProveedor;
    proveedor: Proveedor;
    lineas: Linea[];
  };
  negocioNombre: string;
};

/**
 * Arma el texto del pedido para enviar por WhatsApp.
 * Formato pensado para que el distribuidor lo lea de un vistazo.
 */
function armarMensajePedido(
  negocioNombre: string,
  proveedorNombre: string,
  lineas: Linea[],
  cantidades: Record<string, string>,
  notas: string,
): string {
  const fecha = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const items = lineas
    .map((l) => {
      const cant = cantidades[l.linea.id] ?? l.linea.cantidadPedida;
      const unidad = l.tipoUnidad === 'por_kg' ? 'kg' : 'un';
      return `• ${l.productoNombre} — ${cant} ${unidad}`;
    })
    .join('\n');

  let msg = `*PEDIDO — ${negocioNombre}*\n${fecha}\n\n`;
  msg += `Proveedor: ${proveedorNombre}\n\n`;
  msg += items;
  if (notas.trim()) {
    msg += `\n\nNota: ${notas.trim()}`;
  }
  return msg;
}

/** Extrae un teléfono usable para wa.me del campo contacto del proveedor */
function telefonoParaWhatsApp(contacto: string | null): string {
  if (!contacto) return '';
  const digitos = contacto.replace(/\D/g, '');
  // Solo pre-llenamos el destinatario si parece un número argentino
  // completo (empieza con 54). Si no, abrimos WhatsApp sin destinatario
  // y el usuario elige el contacto — evita mandar a un número equivocado.
  if (digitos.startsWith('54') && digitos.length >= 12) return digitos;
  return '';
}

export function PedidoDetalle({ data, negocioNombre }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { pedido, proveedor, lineas } = data;

  // Estado local de cantidades para modo edición
  const [cantidades, setCantidades] = useState<Record<string, string>>(
    Object.fromEntries(lineas.map((l) => [l.linea.id, l.linea.cantidadPedida]))
  );
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, string>>(
    Object.fromEntries(lineas.map((l) => [l.linea.id, l.linea.cantidadPedida]))
  );
  const [notas, setNotas] = useState(pedido.notas ?? '');

  const esBorrador = pedido.estado === 'borrador';
  const esEnviado = pedido.estado === 'enviado';
  const esRecibido = pedido.estado === 'recibido';

  function handleActualizarCantidad(lineaId: string) {
    const cantidad = cantidades[lineaId];
    if (!cantidad || Number(cantidad) <= 0) return;
    startTransition(async () => {
      await actualizarLineaPedido(lineaId, cantidad);
      toast.success('Cantidad actualizada');
      router.refresh();
    });
  }

  function handleEliminarLinea(lineaId: string) {
    if (!confirm('¿Eliminar esta línea del pedido?')) return;
    startTransition(async () => {
      await eliminarLineaPedido(lineaId);
      toast.success('Línea eliminada');
      router.refresh();
    });
  }

  function handleConfirmar() {
    startTransition(async () => {
      try {
        await confirmarPedido(pedido.id, notas || undefined);
        toast.success('Pedido marcado como enviado');
        router.refresh();
      } catch {
        toast.error('Error al confirmar el pedido');
      }
    });
  }

  /** Abre WhatsApp con el pedido armado y marca el pedido como enviado */
  function handleEnviarWhatsApp() {
    if (lineas.length === 0) {
      toast.error('El pedido no tiene productos');
      return;
    }
    const mensaje = armarMensajePedido(
      negocioNombre,
      proveedor.nombre,
      lineas,
      cantidades,
      notas,
    );
    const telefono = telefonoParaWhatsApp(proveedor.contacto);
    const url = telefono
      ? `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;

    // Abrir WhatsApp (web o app según el dispositivo)
    window.open(url, '_blank');

    // Marcar el pedido como enviado
    startTransition(async () => {
      try {
        await confirmarPedido(pedido.id, notas || undefined);
        toast.success('Pedido abierto en WhatsApp y marcado como enviado');
        router.refresh();
      } catch {
        toast.error('WhatsApp se abrió, pero no se pudo marcar como enviado');
      }
    });
  }

  function handleRecibir() {
    startTransition(async () => {
      try {
        const lineasRecibidas = lineas.map((l) => ({
          lineaId: l.linea.id,
          cantidadRecibida: cantidadesRecibidas[l.linea.id] ?? '0',
        }));
        await recibirPedido(pedido.id, lineasRecibidas);
        toast.success('Mercadería recibida — stock actualizado');
        router.refresh();
      } catch {
        toast.error('Error al registrar la recepción');
      }
    });
  }

  const inputCls = 'h-8 w-24 bg-background/40 border-border/60 text-sm font-mono tabular-nums text-right';

  return (
    <div className="space-y-4">
      {/* Badge de estado */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
          esBorrador ? 'bg-yellow-500/10 text-yellow-400' :
          esEnviado  ? 'bg-blue-500/10 text-blue-400' :
          'bg-emerald-500/10 text-emerald-400'
        }`}>
          {esBorrador ? 'Borrador — revisá antes de enviar' :
           esEnviado  ? 'Enviado — esperando recepción' :
           'Recibido'}
        </span>
      </div>

      {/* Tabla de líneas */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 grid grid-cols-[1fr_auto_auto] gap-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          <span>Producto</span>
          <span className="text-right">{esBorrador ? 'Cantidad pedida' : esEnviado ? 'Pedido / A recibir' : 'Pedido / Recibido'}</span>
          {esBorrador && <span />}
        </div>

        {lineas.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sin productos en este pedido
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {lineas.map(({ linea, productoNombre, tipoUnidad }) => {
              const esKg = tipoUnidad === 'por_kg';
              const unidad = esKg ? 'kg' : 'un';

              return (
                <div
                  key={linea.id}
                  className="px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-4 items-center"
                >
                  <span className="text-sm font-medium">{productoNombre}</span>

                  <div className="flex items-center gap-2">
                    {esBorrador ? (
                      <>
                        <Input
                          type="number"
                          step={esKg ? '0.001' : '1'}
                          min="0"
                          value={cantidades[linea.id] ?? linea.cantidadPedida}
                          onChange={(e) =>
                            setCantidades((prev) => ({ ...prev, [linea.id]: e.target.value }))
                          }
                          onBlur={() => handleActualizarCantidad(linea.id)}
                          className={inputCls}
                        />
                        <span className="text-xs text-muted-foreground">{unidad}</span>
                      </>
                    ) : esEnviado ? (
                      <>
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {esKg ? formatKg(Number(linea.cantidadPedida)) : `${linea.cantidadPedida} un`}
                        </span>
                        <span className="text-muted-foreground/40">/</span>
                        <Input
                          type="number"
                          step={esKg ? '0.001' : '1'}
                          min="0"
                          value={cantidadesRecibidas[linea.id] ?? linea.cantidadPedida}
                          onChange={(e) =>
                            setCantidadesRecibidas((prev) => ({ ...prev, [linea.id]: e.target.value }))
                          }
                          className={inputCls}
                        />
                        <span className="text-xs text-muted-foreground">{unidad}</span>
                      </>
                    ) : (
                      <div className="text-right">
                        <p className="text-sm tabular-nums">
                          {esKg ? formatKg(Number(linea.cantidadPedida)) : `${linea.cantidadPedida} un`}
                        </p>
                        {linea.cantidadRecibida && (
                          <p className="text-xs text-emerald-400 tabular-nums">
                            Rec: {esKg ? formatKg(Number(linea.cantidadRecibida)) : `${linea.cantidadRecibida} un`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {esBorrador && (
                    <button
                      onClick={() => handleEliminarLinea(linea.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notas y acciones */}
      {esBorrador && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Notas para el proveedor (opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Entregar a la mañana, confirmar precio de lomo..."
              className="w-full bg-background/40 border border-border/60 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Acción principal: enviar por WhatsApp */}
            <Button
              onClick={handleEnviarWhatsApp}
              disabled={isPending || lineas.length === 0}
              className="bg-[#25D366] hover:bg-[#1fb855] text-white flex-1 sm:flex-none"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Enviar por WhatsApp
            </Button>
            {/* Secundaria: marcar enviado sin abrir WhatsApp */}
            <Button
              variant="outline"
              onClick={handleConfirmar}
              disabled={isPending || lineas.length === 0}
              className="flex-1 sm:flex-none"
            >
              <Send className="h-4 w-4 mr-2" />
              Solo marcar enviado
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            Al enviar por WhatsApp el pedido se arma como mensaje y se marca como enviado.
            {!proveedor.contacto && ' Como el proveedor no tiene teléfono cargado, vas a elegir el contacto en WhatsApp.'}
          </p>
        </div>
      )}

      {esEnviado && (
        <Button
          onClick={handleRecibir}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <Check className="h-4 w-4 mr-2" />
          Confirmar recepción y actualizar stock
        </Button>
      )}

      {esRecibido && (
        <p className="text-sm text-emerald-400 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Pedido recibido — stock actualizado correctamente
        </p>
      )}
    </div>
  );
}
