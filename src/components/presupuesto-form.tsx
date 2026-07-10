'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Package, Wrench, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { crearPresupuesto, editarPresupuesto, crearBoleta } from '@/server/actions/presupuestos';
import { formatARS } from '@/lib/utils';
import type { Producto, Cliente, MetodoPago } from '@/server/db/schema';

const METODOS: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'otro', label: 'Otro' },
];

type TipoLinea = 'producto' | 'servicio';

type LineaEdit = {
  key: string;
  tipo: TipoLinea;
  productoId: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
};

type InitialData = {
  id: string;
  clienteId?: string | null;
  clienteNombre?: string | null;
  validezDias: number;
  notas?: string | null;
  descuento: number;
  lineas: {
    productoId?: string | null;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
  }[];
};

type Props = {
  productos: Producto[];
  clientes: Cliente[];
  initialData?: InitialData;
  /** Descripciones que el negocio ya usó antes — sugerencias editables. */
  sugerencias?: string[];
  /** 'presupuesto' (cotización) o 'boleta' (comprobante de cobro). */
  modo?: 'presupuesto' | 'boleta';
};

export function PresupuestoForm({ productos, clientes, initialData, sugerencias = [], modo = 'presupuesto' }: Props) {
  const esBoleta = modo === 'boleta';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!initialData;

  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState<LineaEdit[]>(() =>
    initialData?.lineas.map((l) => ({
      key: crypto.randomUUID(),
      tipo: l.productoId ? 'producto' : 'servicio' as TipoLinea,
      productoId: l.productoId ?? null,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
    })) ?? []
  );
  // Cliente unificado: un solo campo. Si coincide con uno registrado lo linkea;
  // si no, queda como nombre libre.
  const [clienteTexto, setClienteTexto] = useState<string>(
    initialData?.clienteNombre ??
    clientes.find((c) => c.id === initialData?.clienteId)?.razonSocial ??
    '',
  );
  const [validezDias, setValidezDias] = useState(initialData?.validezDias ?? 15);
  const [descuento, setDescuento] = useState(initialData?.descuento ?? 0);
  const [notas, setNotas] = useState(initialData?.notas ?? '');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  );

  const subtotal = lineas.reduce((a, l) => a + l.cantidad * l.precioUnitario, 0);
  const total = subtotal - descuento;

  function agregarProducto(p: Producto) {
    setLineas((prev) => {
      const existe = prev.find((l) => l.productoId === p.id);
      if (existe) return prev.map((l) => l.productoId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l);
      return [...prev, {
        key: crypto.randomUUID(),
        tipo: 'producto',
        productoId: p.id,
        descripcion: p.nombre,
        cantidad: 1,
        precioUnitario: Number(p.precioMayorista),
      }];
    });
    setBusqueda('');
  }

  function agregarServicio() {
    setLineas((prev) => [...prev, {
      key: crypto.randomUUID(),
      tipo: 'servicio',
      productoId: null,
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
    }]);
  }

  function actualizarLinea(key: string, campo: keyof LineaEdit, valor: string | number) {
    setLineas((prev) => prev.map((l) => l.key === key ? { ...l, [campo]: valor } : l));
  }

  function eliminarLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  function handleGuardar() {
    if (lineas.length === 0) { toast.error('Agregá al menos una tarea o producto'); return; }
    const txt = clienteTexto.trim();
    if (!txt) { toast.error('Indicá un cliente'); return; }

    // ¿Coincide con un cliente registrado? → lo linkeamos; si no, nombre libre.
    const match = clientes.find((c) => c.razonSocial.toLowerCase().trim() === txt.toLowerCase());

    const clienteId = match?.id ?? null;
    const clienteNombre = match ? null : txt;
    const lineasPayload = lineas.map((l) => ({
      productoId: l.productoId,
      descripcion: l.descripcion,
      cantidad: l.cantidad.toString(),
      precioUnitario: l.precioUnitario.toFixed(2),
      subtotal: (l.cantidad * l.precioUnitario).toFixed(2),
    }));

    startTransition(async () => {
      try {
        if (esBoleta) {
          const { id } = await crearBoleta({
            clienteId,
            clienteNombre,
            notas: notas.trim() || null,
            descuento: descuento.toFixed(2),
            metodoPago,
            lineas: lineasPayload,
          });
          toast.success('Boleta emitida');
          router.push(`/dashboard/presupuestos/${id}`);
          return;
        }

        const payload = {
          clienteId,
          clienteNombre,
          validezDias,
          notas: notas.trim() || null,
          descuento: descuento.toFixed(2),
          lineas: lineasPayload,
        };
        if (isEdit) {
          await editarPresupuesto(initialData.id, payload);
          toast.success('Presupuesto actualizado');
          router.push(`/dashboard/presupuestos/${initialData.id}`);
        } else {
          const { id } = await crearPresupuesto(payload);
          toast.success('Presupuesto creado');
          router.push(`/dashboard/presupuestos/${id}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  }

  const inputCls = 'h-9 bg-background/40 border-border/60 text-sm';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70';

  return (
    <div className="space-y-4">

      <datalist id="gesto-clientes">
        {clientes.map((c) => <option key={c.id} value={c.razonSocial} />)}
      </datalist>
      {sugerencias.length > 0 && (
        <datalist id="gesto-desc-sugeridas">
          {sugerencias.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}

      {/* ── Cliente (un solo campo) ────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
        <label className={labelCls}>Cliente</label>
        <Input
          list="gesto-clientes"
          value={clienteTexto}
          onChange={(e) => setClienteTexto(e.target.value)}
          placeholder="Elegí un cliente o escribí un nombre nuevo..."
          className={inputCls}
        />
        <p className="text-[11px] text-muted-foreground/50">
          Si ya es cliente, elegilo de la lista; si no, escribí el nombre y listo.
        </p>
      </div>

      {/* ── Método de pago (solo boleta) ──────────────────────────────── */}
      {esBoleta && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-1.5">
          <label className={labelCls}>Método de pago</label>
          <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as MetodoPago)}>
            <SelectTrigger className={inputCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Agregar ítems ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <button
          onClick={agregarServicio}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/25 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Agregar tarea o mano de obra
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-background/40 border-border/60 text-sm"
            placeholder="¿Usás materiales del catálogo? Buscalos acá..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-xl overflow-hidden max-h-56 overflow-y-auto">
              {productosFiltrados.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-5">Sin resultados en el catálogo</p>
              ) : (
                productosFiltrados.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => agregarProducto(p)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-foreground/[0.04] transition-colors text-left border-b border-border/30 last:border-0"
                  >
                    <p className="text-[13px] font-medium">{p.nombre}</p>
                    <p className="text-sm font-semibold text-primary shrink-0 ml-3">
                      {formatARS(Number(p.precioMayorista))}
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabla de líneas ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {lineas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Agregá una tarea o un material para empezar</p>
          </div>
        ) : (
          <>
            {/* Header — solo desktop */}
            <div className="hidden sm:grid sm:grid-cols-[28px_1fr_72px_112px_92px_32px] gap-2 px-4 py-2 bg-muted/30 border-b border-border/60">
              {['', 'Descripción', 'Cant.', 'P. unit.', 'Subtotal', ''].map((h, i) => (
                <p key={i} className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">{h}</p>
              ))}
            </div>

            {lineas.map((l) => {
              const sub = l.cantidad * l.precioUnitario;
              const esServicio = l.tipo === 'servicio';
              return (
                <div
                  key={l.key}
                  className={`border-b border-border/40 last:border-0 ${esServicio ? 'bg-primary/[0.03]' : ''}`}
                >
                  {/* ── Desktop row ── */}
                  <div className="hidden sm:grid sm:grid-cols-[28px_1fr_72px_112px_92px_32px] gap-2 px-4 py-2.5 items-center">
                    <div className="flex items-center justify-center">
                      {esServicio
                        ? <Wrench className="h-3.5 w-3.5 text-primary/70" />
                        : <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
                      }
                    </div>
                    <Input
                      list="gesto-desc-sugeridas"
                      value={l.descripcion}
                      onChange={(e) => actualizarLinea(l.key, 'descripcion', e.target.value)}
                      className="h-8 bg-background/40 border-border/60 text-sm"
                      placeholder={esServicio ? 'Ej: Colocación de cielorraso, mano de obra...' : 'Descripción...'}
                    />
                    <Input
                      type="number" min="0.001" step="0.001"
                      value={l.cantidad}
                      onChange={(e) => actualizarLinea(l.key, 'cantidad', Number(e.target.value))}
                      className="h-8 bg-background/40 border-border/60 text-sm font-mono text-right"
                    />
                    <Input
                      type="number" min="0" step="0.01"
                      value={l.precioUnitario}
                      onChange={(e) => actualizarLinea(l.key, 'precioUnitario', Number(e.target.value))}
                      className="h-8 bg-background/40 border-border/60 text-sm font-mono text-right"
                    />
                    <p className="text-sm font-semibold tabular-nums text-right font-mono">{formatARS(sub)}</p>
                    <button
                      onClick={() => eliminarLinea(l.key)}
                      className="text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* ── Mobile card ── */}
                  <div className="sm:hidden px-3 py-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                        {esServicio
                          ? <Wrench className="h-3.5 w-3.5 text-primary/80" />
                          : <Package className="h-3.5 w-3.5 text-muted-foreground/60" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <Input
                          list="gesto-desc-sugeridas"
                          value={l.descripcion}
                          onChange={(e) => actualizarLinea(l.key, 'descripcion', e.target.value)}
                          className="h-9 bg-background/40 border-border/60 text-sm"
                          placeholder={esServicio ? 'Describí la tarea...' : 'Descripción...'}
                        />
                      </div>
                      <button
                        onClick={() => eliminarLinea(l.key)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pl-9">
                      <div className="flex flex-col gap-0.5 w-20">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">Cant.</span>
                        <Input
                          type="number" min="0.001" step="0.001"
                          value={l.cantidad}
                          onChange={(e) => actualizarLinea(l.key, 'cantidad', Number(e.target.value))}
                          className="h-8 bg-background/40 border-border/60 text-sm font-mono text-right px-2"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">P. unit.</span>
                        <Input
                          type="number" min="0" step="0.01"
                          value={l.precioUnitario}
                          onChange={(e) => actualizarLinea(l.key, 'precioUnitario', Number(e.target.value))}
                          className="h-8 bg-background/40 border-border/60 text-sm font-mono text-right px-2"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 items-end shrink-0">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/50">Subtotal</span>
                        <p className="h-8 flex items-center text-sm font-semibold tabular-nums font-mono text-primary/90">
                          {formatARS(sub)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="px-4 py-2.5 border-t border-border/60">
              <button
                onClick={agregarServicio}
                className="text-xs text-primary/80 hover:text-primary transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar otra tarea
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Totales + descuento ──────────────────────────────────────── */}
      {lineas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col sm:items-end gap-3">
            <div className="w-full sm:max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatARS(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground shrink-0">Descuento $</span>
                <Input
                  type="number" min="0" step="0.01"
                  value={descuento}
                  onChange={(e) => setDescuento(Number(e.target.value))}
                  className="h-7 w-28 bg-background/40 border-border/60 text-sm font-mono text-right"
                />
              </div>
              <div className="h-px bg-border/60" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span className="font-mono tabular-nums text-primary">{formatARS(total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Más opciones (plegable) ──────────────────────────────────── */}
      <details className="rounded-xl border border-border bg-card group">
        <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer list-none select-none">
          <span className="text-sm font-medium text-muted-foreground">Más opciones ({esBoleta ? 'notas' : 'validez, notas'})</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-5 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!esBoleta && (
            <div className="space-y-1.5">
              <label className={labelCls}>Validez del presupuesto</label>
              <Select value={String(validezDias)} onValueChange={(v) => setValidezDias(Number(v))}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[7, 15, 30, 60, 90].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} días</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelCls}>Observaciones</label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Condiciones de entrega, forma de pago, aclaraciones..."
              rows={2}
              className="bg-background/40 border-border/60 text-sm"
            />
          </div>
        </div>
      </details>

      {/* ── Acciones ─────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={isPending || lineas.length === 0} className="glow-primary w-full sm:w-auto">
          {isPending
            ? (esBoleta ? 'Emitiendo...' : isEdit ? 'Guardando...' : 'Creando...')
            : (esBoleta ? 'Cobrar y emitir boleta' : isEdit ? 'Guardar cambios' : 'Crear presupuesto')
          }
        </Button>
      </div>
    </div>
  );
}
