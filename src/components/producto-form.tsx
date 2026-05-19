'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tag, Boxes, DollarSign, ScanBarcode, Camera, Truck, Plus, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { crearProducto, actualizarProducto, desactivarProducto, type ProductoInput } from '@/server/actions/productos';
import type { Producto, Categoria, GrupoVariante, Proveedor, ProductoProveedor } from '@/server/db/schema';
import type { VinculoProveedorInput } from '@/server/actions/proveedores';
import { BarcodeScannerModal } from '@/components/barcode-scanner-modal';

type VinculoLocal = VinculoProveedorInput & { _key: string };

type Props = {
  producto?: Producto;
  categorias: Categoria[];
  gruposVariantes: GrupoVariante[];
  proveedoresDisponibles: Proveedor[];
  vinculosIniciales?: { rel: ProductoProveedor; proveedor: Proveedor }[];
};

export function ProductoForm({
  producto,
  categorias,
  gruposVariantes,
  proveedoresDisponibles,
  vinculosIniciales = [],
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!producto;
  const [codigoFocused, setCodigoFocused] = useState(false);
  const codigoRef = useRef<HTMLInputElement>(null);
  const [scannerAbierto, setScannerAbierto] = useState(false);

  const [form, setForm] = useState<Omit<ProductoInput, 'vinculos'>>({
    codigo: producto?.codigo ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    categoriaId: producto?.categoriaId ?? '',
    grupoVarianteId: producto?.grupoVarianteId ?? '',
    tipoUnidad: producto?.tipoUnidad ?? 'por_kg',
    stockActual: producto?.stockActual ?? '0',
    stockMinimo: producto?.stockMinimo ?? '',
    costoPromedio: producto?.costoPromedio ?? '0',
    precioMayorista: producto?.precioMayorista ?? '0',
    precioMinorista: producto?.precioMinorista ?? '0',
    activo: producto?.activo ?? true,
  });

  // Vinculos con proveedores
  const [vinculos, setVinculos] = useState<VinculoLocal[]>(
    vinculosIniciales.map((v) => ({
      _key: v.rel.id,
      proveedorId: v.rel.proveedorId,
      precioCosto: v.rel.precioCosto,
      markupMayorista: v.rel.markupMayorista ?? '',
      markupMinorista: v.rel.markupMinorista ?? '',
      esPrincipal: v.rel.esPrincipal,
    }))
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function agregarVinculo() {
    const proveedoresUsados = new Set(vinculos.map((v) => v.proveedorId));
    const disponible = proveedoresDisponibles.find((p) => !proveedoresUsados.has(p.id));
    if (!disponible) { toast.error('Ya están todos los proveedores vinculados'); return; }

    setVinculos((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        proveedorId: disponible.id,
        precioCosto: '0',
        markupMayorista: '',
        markupMinorista: '',
        esPrincipal: prev.length === 0,
      },
    ]);
  }

  function actualizarVinculo(key: string, campo: keyof VinculoProveedorInput, valor: string | boolean) {
    setVinculos((prev) =>
      prev.map((v) => v._key === key ? { ...v, [campo]: valor } : v)
    );
  }

  function marcarPrincipal(key: string) {
    setVinculos((prev) =>
      prev.map((v) => ({ ...v, esPrincipal: v._key === key }))
    );
  }

  function eliminarVinculo(key: string) {
    setVinculos((prev) => {
      const restantes = prev.filter((v) => v._key !== key);
      // Si se eliminó el principal, hacer principal al primero
      if (restantes.length > 0 && !restantes.some((v) => v.esPrincipal)) {
        restantes[0]!.esPrincipal = true;
      }
      return restantes;
    });
  }

  // Calcular precio sugerido en base a costo + markup del proveedor principal
  function calcularPreciosSugeridos() {
    const principal = vinculos.find((v) => v.esPrincipal);
    if (!principal) return;

    const costo = Number(principal.precioCosto);
    if (!costo) return;

    const provInfo = proveedoresDisponibles.find((p) => p.id === principal.proveedorId);
    if (!provInfo) return;

    const mMay = Number(principal.markupMayorista || provInfo.markupMayorista);
    const mMin = Number(principal.markupMinorista || provInfo.markupMinorista);

    if (mMay > 0) update('precioMayorista', (costo * (1 + mMay / 100)).toFixed(2));
    if (mMin > 0) update('precioMinorista', (costo * (1 + mMin / 100)).toFixed(2));
    update('costoPromedio', costo.toFixed(2));

    toast.success('Precios calculados desde el costo');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const input: ProductoInput = {
          ...form,
          categoriaId: form.categoriaId || null,
          grupoVarianteId: form.grupoVarianteId || null,
          vinculos: vinculos.map(({ _key: _, ...v }) => v),
        };

        if (isEdit) {
          await actualizarProducto(producto.id, input);
          toast.success('Producto actualizado');
        } else {
          await crearProducto(input);
          toast.success('Producto creado');
        }
        router.push('/dashboard/productos');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  }

  function handleDesactivar() {
    if (!isEdit) return;
    if (!confirm('¿Desactivar este producto? No aparecerá más en las ventas.')) return;
    startTransition(async () => {
      await desactivarProducto(producto.id);
      toast.success('Producto desactivado');
      router.push('/dashboard/productos');
    });
  }

  const unidad = form.tipoUnidad === 'por_kg' ? 'kg' : 'un';
  const inputCls = 'h-9 bg-background/40 border-border/60 text-sm';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Identificación */}
      <FormSection icon={Tag} title="Identificación" subtitle="Datos básicos del producto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre *" htmlFor="nombre">
            <Input
              id="nombre"
              required
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              placeholder="Bola de lomo"
              className={inputCls}
            />
          </Field>
          <Field label="Código de barras" htmlFor="codigo" hint="opcional">
            <div className="relative">
              <ScanBarcode
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${
                  codigoFocused ? 'text-primary' : 'text-muted-foreground/50'
                }`}
                strokeWidth={1.75}
              />
              <Input
                ref={codigoRef}
                id="codigo"
                value={form.codigo ?? ''}
                onChange={(e) => update('codigo', e.target.value)}
                onFocus={() => setCodigoFocused(true)}
                onBlur={() => setCodigoFocused(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                placeholder="Escaneá o ingresá el código"
                className={`${inputCls} pl-8 pr-10 font-mono`}
              />
              <button
                type="button"
                onClick={() => setScannerAbierto(true)}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-95"
                aria-label="Escanear con cámara"
                title="Escanear con cámara"
              >
                <Camera className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Categoría" htmlFor="categoriaId">
            <Select
              value={form.categoriaId ?? ''}
              onValueChange={(v) => update('categoriaId', v === '__none' ? '' : v)}
            >
              <SelectTrigger id="categoriaId" className={inputCls}>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin categoría</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Grupo de variantes" htmlFor="grupoVarianteId" hint="opcional">
            <Select
              value={form.grupoVarianteId ?? ''}
              onValueChange={(v) => update('grupoVarianteId', v === '__none' ? '' : v)}
            >
              <SelectTrigger id="grupoVarianteId" className={inputCls}>
                <SelectValue placeholder="Sin grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin grupo</SelectItem>
                {gruposVariantes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Descripción" htmlFor="descripcion">
          <Textarea
            id="descripcion"
            value={form.descripcion ?? ''}
            onChange={(e) => update('descripcion', e.target.value)}
            rows={2}
            className="bg-background/40 border-border/60 text-sm"
          />
        </Field>
      </FormSection>

      {/* Unidad y stock */}
      <FormSection icon={Boxes} title="Unidad y stock" subtitle="Cómo se mide y cuánto hay disponible">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Tipo de unidad" htmlFor="tipoUnidad" className="col-span-2 sm:col-span-1">
            <Select
              value={form.tipoUnidad}
              onValueChange={(v) => update('tipoUnidad', v as 'por_kg' | 'por_unidad')}
            >
              <SelectTrigger id="tipoUnidad" className={inputCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="por_kg">Por kilogramo</SelectItem>
                <SelectItem value="por_unidad">Por unidad</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Stock actual (${unidad})`} htmlFor="stockActual">
            <Input
              id="stockActual"
              type="number"
              step={form.tipoUnidad === 'por_kg' ? '0.001' : '1'}
              value={form.stockActual}
              onChange={(e) => update('stockActual', e.target.value)}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </Field>
          <Field label="Stock mínimo" htmlFor="stockMinimo" hint="alerta">
            <Input
              id="stockMinimo"
              type="number"
              step={form.tipoUnidad === 'por_kg' ? '0.001' : '1'}
              value={form.stockMinimo ?? ''}
              onChange={(e) => update('stockMinimo', e.target.value)}
              placeholder="—"
              className={`${inputCls} font-mono tabular-nums`}
            />
          </Field>
        </div>
      </FormSection>

      {/* Proveedores */}
      <FormSection
        icon={Truck}
        title="Proveedores"
        subtitle="Proveedores que surten este producto y sus costos"
        action={
          proveedoresDisponibles.length > 0 ? (
            <button
              type="button"
              onClick={agregarVinculo}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar proveedor
            </button>
          ) : undefined
        }
      >
        {proveedoresDisponibles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay proveedores creados.{' '}
            <a href="/dashboard/proveedores/nuevo" className="text-primary underline">Crear uno</a>.
          </p>
        ) : vinculos.length === 0 ? (
          <p className="text-sm text-muted-foreground/60">
            Sin proveedores vinculados — el carrito de pedidos no se actualizará al vender este producto.
          </p>
        ) : (
          <div className="space-y-3">
            {vinculos.map((v) => {
              const provInfo = proveedoresDisponibles.find((p) => p.id === v.proveedorId);
              const proveedoresDisp = proveedoresDisponibles.filter(
                (p) => p.id === v.proveedorId || !vinculos.some((vv) => vv._key !== v._key && vv.proveedorId === p.id)
              );

              return (
                <div
                  key={v._key}
                  className={`rounded-lg border p-3 space-y-3 ${
                    v.esPrincipal ? 'border-primary/30 bg-primary/5' : 'border-border/60 bg-background/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Select
                      value={v.proveedorId}
                      onValueChange={(val) => actualizarVinculo(v._key, 'proveedorId', val)}
                    >
                      <SelectTrigger className="h-8 text-sm flex-1 bg-background/40 border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedoresDisp.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Botón principal */}
                    <button
                      type="button"
                      onClick={() => marcarPrincipal(v._key)}
                      title={v.esPrincipal ? 'Proveedor principal' : 'Marcar como principal'}
                      className={`shrink-0 p-1.5 rounded-md transition-colors ${
                        v.esPrincipal
                          ? 'text-yellow-400 bg-yellow-400/10'
                          : 'text-muted-foreground/40 hover:text-yellow-400 hover:bg-yellow-400/10'
                      }`}
                    >
                      <Star className="h-3.5 w-3.5" fill={v.esPrincipal ? 'currentColor' : 'none'} />
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarVinculo(v._key)}
                      className="shrink-0 p-1.5 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className={labelCls}>Precio costo</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.precioCosto}
                        onChange={(e) => actualizarVinculo(v._key, 'precioCosto', e.target.value)}
                        className="h-8 text-xs font-mono tabular-nums bg-background/40 border-border/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>
                        % May
                        {provInfo && !v.markupMayorista && (
                          <span className="ml-1 text-muted-foreground/40 normal-case">(def: {provInfo.markupMayorista}%)</span>
                        )}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.markupMayorista ?? ''}
                        onChange={(e) => actualizarVinculo(v._key, 'markupMayorista', e.target.value)}
                        placeholder={provInfo?.markupMayorista ?? '0'}
                        className="h-8 text-xs font-mono tabular-nums bg-background/40 border-border/60"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>
                        % Min
                        {provInfo && !v.markupMinorista && (
                          <span className="ml-1 text-muted-foreground/40 normal-case">(def: {provInfo.markupMinorista}%)</span>
                        )}
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={v.markupMinorista ?? ''}
                        onChange={(e) => actualizarVinculo(v._key, 'markupMinorista', e.target.value)}
                        placeholder={provInfo?.markupMinorista ?? '0'}
                        className="h-8 text-xs font-mono tabular-nums bg-background/40 border-border/60"
                      />
                    </div>
                  </div>

                  {v.esPrincipal && (
                    <p className="text-[10px] text-primary/60">
                      ★ Principal — el carrito de pedidos se acumula a este proveedor al vender
                    </p>
                  )}
                </div>
              );
            })}

            {vinculos.some((v) => v.esPrincipal && Number(v.precioCosto) > 0) && (
              <button
                type="button"
                onClick={calcularPreciosSugeridos}
                className="text-xs text-primary/80 hover:text-primary underline transition-colors"
              >
                Calcular precios de venta desde el costo del proveedor principal
              </button>
            )}
          </div>
        )}
      </FormSection>

      {/* Precios */}
      <FormSection icon={DollarSign} title="Precios de venta" subtitle="Costo promedio y precio por canal">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label={`Costo promedio ($/${unidad})`} htmlFor="costoPromedio">
            <Input
              id="costoPromedio"
              type="number"
              step="0.01"
              value={form.costoPromedio}
              onChange={(e) => update('costoPromedio', e.target.value)}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </Field>
          <Field label={`P. mayorista ($/${unidad}) *`} htmlFor="precioMayorista">
            <Input
              id="precioMayorista"
              type="number"
              step="0.01"
              required
              value={form.precioMayorista}
              onChange={(e) => update('precioMayorista', e.target.value)}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </Field>
          <Field label={`P. minorista ($/${unidad}) *`} htmlFor="precioMinorista">
            <Input
              id="precioMinorista"
              type="number"
              step="0.01"
              required
              value={form.precioMinorista}
              onChange={(e) => update('precioMinorista', e.target.value)}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </Field>
        </div>
      </FormSection>

      {/* Estado */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="activo" className="text-sm font-semibold">Producto activo</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Si está inactivo, no aparece en el punto de venta.
            </p>
          </div>
          <Switch
            id="activo"
            checked={form.activo}
            onCheckedChange={(v) => update('activo', v)}
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDesactivar}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 order-last sm:order-first"
          >
            Desactivar producto
          </Button>
        ) : <div className="hidden sm:block" />}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="glow-primary flex-1 sm:flex-none">
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </div>

      {/* Modal scanner cámara */}
      <BarcodeScannerModal
        open={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onDetected={(codigo) => {
          update('codigo', codigo.trim());
          setScannerAbierto(false);
          toast.success('Código escaneado', { duration: 1500 });
        }}
      />
    </form>
  );

}

function Field({
  label, htmlFor, hint, className, children,
}: { label: string; htmlFor: string; hint?: string; className?: string; children: React.ReactNode }) {
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70';
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}{hint && <span className="ml-1 normal-case text-muted-foreground/40">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function FormSection({
  icon: Icon, title, subtitle, action, children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
