'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { crearPresupuesto, editarPresupuesto } from '@/server/actions/presupuestos';
import { formatARS } from '@/lib/utils';
import type { Producto, Cliente } from '@/server/db/schema';

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
};

export function PresupuestoForm({ productos, clientes, initialData }: Props) {
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
  const [clienteId, setClienteId] = useState<string>(initialData?.clienteId ?? '');
  const [clienteLibre, setClienteLibre] = useState(initialData?.clienteNombre ?? '');
  const [validezDias, setValidezDias] = useState(initialData?.validezDias ?? 15);
  const [descuento, setDescuento] = useState(initialData?.descuento ?? 0);
  const [notas, setNotas] = useState(initialData?.notas ?? '');

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
    if (lineas.length === 0) { toast.error('Agregá al menos un producto o servicio'); return; }
    const nombreCliente = clienteId
      ? (clientes.find((c) => c.id === clienteId)?.razonSocial ?? '')
      : clienteLibre;
    if (!nombreCliente.trim()) { toast.error('Indicá un cliente'); return; }

    const payload = {
      clienteId: clienteId || null,
      clienteNombre: clienteId ? null : clienteLibre.trim(),
      validezDias,
      notas: notas.trim() || null,
      descuento: descuento.toFixed(2),
      lineas: lineas.map((l) => ({
        productoId: l.productoId,
        descripcion: l.descripcion,
        cantidad: l.cantidad.toString(),
        precioUnitario: l.precioUnitario.toFixed(2),
        subtotal: (l.cantidad * l.precioUnitario).toFixed(2),
      })),
    };

    startTransition(async () => {
      try {
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

      {/* ── Cliente + validez ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold tracking-tight">Cliente y condiciones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1.5">
            <label className={labelCls}>Cliente registrado</label>
            <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setClienteLibre(''); }}>
              <SelectTrigger className={inputCls}>
                <SelectValue placeholder="Seleccionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.razonSocial}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>O escribí el nombre del cliente</label>
            <Input
              value={clienteLibre}
              onChange={(e) => { setClienteLibre(e.target.value); setClienteId(''); }}
              placeholder="Nombre libre..."
              className={inputCls}
              disabled={!!clienteId}
            />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Validez (días)</label>
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

          <div className="space-y-1.5 sm:col-span-2">
            <label className={labelCls}>Observaciones <span className="normal-case text-muted-foreground/40">(opcional)</span></label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Condiciones de entrega, forma de pago, aclaraciones..."
              rows={2}
              className="bg-background/40 border-border/60 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Agregar ítems ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Ítems del presupuesto</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <div className="space-y-2">
            <p className={labelCls + ' flex items-center gap-1.5'}>
              <Package className="h-3 w-3" /> Producto del catálogo
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-background border-border/60 focus-visible:border-primary/50"
                placeholder="Buscar por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            {busqueda && (
              <div className="rounded-lg border border-border bg-background/60 overflow-hidden max-h-48 overflow-y-auto">
                {productosFiltrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-5">Sin resultados</p>
                ) : (
                  productosFiltrados.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => agregarProducto(p)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/[0.04] transition-colors text-left border-b border-border/30 last:border-0"
                    >
                      <div>
                        <p className="text-[13px] font-medium">{p.nombre}</p>
                      </div>
                      <p className="text-sm font-semibold text-primary shrink-0 ml-3">
                        {formatARS(Number(p.precioMayorista))}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className={labelCls + ' flex items-center gap-1.5'}>
              <Wrench className="h-3 w-3" /> Servicio o tarea a medida
            </p>
            <button
              onClick={agregarServicio}
              className="w-full h-[38px] flex items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-background/20 text-sm text-muted-foreground hover:text-foreground hover:border-border hover:bg-background/40 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar servicio / tarea
            </button>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              Describís la tarea y ponés el precio manualmente — ideal para mano de obra, honorarios, trabajos por hora, etc.
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabla de líneas ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {lineas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Buscá un producto o agregá un servicio para empezar</p>
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
                  className={`border-b border-border/40 last:border-0 ${esServicio ? 'bg-amber-500/[0.03]' : ''}`}
                >
                  {/* ── Desktop row ── */}
                  <div className="hidden sm:grid sm:grid-cols-[28px_1fr_72px_112px_92px_32px] gap-2 px-4 py-2.5 items-center">
                    <div className="flex items-center justify-center">
                      {esServicio
                        ? <Wrench className="h-3.5 w-3.5 text-amber-500/70" />
                        : <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
                      }
                    </div>
                    {esServicio ? (
                      <Textarea
                        value={l.descripcion}
                        onChange={(e) => actualizarLinea(l.key, 'descripcion', e.target.value)}
                        className="min-h-[32px] max-h-24 bg-background/40 border-border/60 text-sm resize-none py-1.5"
                        placeholder="Ej: Colocación de cielorraso, mano de obra..."
                        rows={1}
                      />
                    ) : (
                      <Input
                        value={l.descripcion}
                        onChange={(e) => actualizarLinea(l.key, 'descripcion', e.target.value)}
                        className="h-8 bg-background/40 border-border/60 text-sm"
                        placeholder="Descripción..."
                      />
                    )}
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
                    {/* Fila 1: icono + descripción + eliminar */}
                    <div className="flex items-start gap-2">
                      <div className="h-7 w-7 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                        {esServicio
                          ? <Wrench className="h-3.5 w-3.5 text-amber-500/80" />
                          : <Package className="h-3.5 w-3.5 text-muted-foreground/60" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        {esServicio ? (
                          <Textarea
                            value={l.descripcion}
                            onChange={(e) => actualizarLinea(l.key, 'descripcion', e.target.value)}
                            className="min-h-[36px] max-h-24 bg-background/40 border-border/60 text-sm resize-none py-1.5"
                            placeholder="Describí el servicio o tarea..."
                            rows={1}
                          />
                        ) : (
                          <Input
                            value={l.descripcion}
                            onChange={(e) => actualizarLinea(l.key, 'descripcion', e.target.value)}
                            className="h-9 bg-background/40 border-border/60 text-sm"
                            placeholder="Descripción..."
                          />
                        )}
                      </div>
                      <button
                        onClick={() => eliminarLinea(l.key)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Fila 2: cantidad + precio + subtotal */}
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

            <div className="px-4 py-2.5 border-t border-border/60 flex items-center gap-3">
              <button
                onClick={agregarServicio}
                className="text-xs text-amber-500/80 hover:text-amber-500 transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar servicio
              </button>
              <span className="text-border/60">·</span>
              <button
                onClick={() => setLineas((prev) => [...prev, { key: crypto.randomUUID(), tipo: 'producto', productoId: null, descripcion: '', cantidad: 1, precioUnitario: 0 }])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Línea vacía
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
              {lineas.some((l) => l.tipo === 'producto') && lineas.some((l) => l.tipo === 'servicio') && (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Package className="h-3 w-3" /> Productos</span>
                    <span className="font-mono tabular-nums">
                      {formatARS(lineas.filter((l) => l.tipo === 'producto').reduce((a, l) => a + l.cantidad * l.precioUnitario, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Wrench className="h-3 w-3 text-amber-500/70" /> Servicios</span>
                    <span className="font-mono tabular-nums">
                      {formatARS(lineas.filter((l) => l.tipo === 'servicio').reduce((a, l) => a + l.cantidad * l.precioUnitario, 0))}
                    </span>
                  </div>
                  <div className="h-px bg-border/40" />
                </>
              )}

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

      {/* ── Acciones ─────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} className="w-full sm:w-auto">
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={isPending || lineas.length === 0} className="glow-primary w-full sm:w-auto">
          {isPending
            ? (isEdit ? 'Guardando...' : 'Creando...')
            : (isEdit ? 'Guardar cambios' : 'Crear presupuesto')
          }
        </Button>
      </div>
    </div>
  );
}
