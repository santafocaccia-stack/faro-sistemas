'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Tag, Boxes, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { crearProducto, actualizarProducto, desactivarProducto, type ProductoInput } from '@/server/actions/productos';
import type { Producto } from '@/server/db/schema';

type Props = {
  producto?: Producto;
};

export function ProductoForm({ producto }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!producto;

  const [form, setForm] = useState<ProductoInput>({
    codigo: producto?.codigo ?? '',
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    categoria: producto?.categoria ?? '',
    tipoUnidad: producto?.tipoUnidad ?? 'por_kg',
    stockActual: producto?.stockActual ?? '0',
    stockMinimo: producto?.stockMinimo ?? '',
    costoPromedio: producto?.costoPromedio ?? '0',
    precioMayorista: producto?.precioMayorista ?? '0',
    precioMinorista: producto?.precioMinorista ?? '0',
    activo: producto?.activo ?? true,
  });

  function update<K extends keyof ProductoInput>(key: K, value: ProductoInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (isEdit) {
          await actualizarProducto(producto.id, form);
          toast.success('Producto actualizado');
        } else {
          await crearProducto(form);
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
        <div className="grid grid-cols-2 gap-4">
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
          <Field label="Código" htmlFor="codigo" hint="opcional">
            <Input
              id="codigo"
              value={form.codigo ?? ''}
              onChange={(e) => update('codigo', e.target.value)}
              placeholder="Interno o de barras"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>

        <Field label="Categoría" htmlFor="categoria">
          <Input
            id="categoria"
            value={form.categoria ?? ''}
            onChange={(e) => update('categoria', e.target.value)}
            placeholder="Vacuno, cerdo, pollo..."
            className={inputCls}
          />
        </Field>

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
        <div className="grid grid-cols-3 gap-4">
          <Field label="Tipo de unidad" htmlFor="tipoUnidad">
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

      {/* Precios */}
      <FormSection icon={DollarSign} title="Precios" subtitle="Costo y precio de venta por canal">
        <div className="grid grid-cols-3 gap-4">
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
      <div className="flex items-center justify-between pt-2">
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDesactivar}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            Desactivar producto
          </Button>
        ) : <div />}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="glow-primary">
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </div>
    </form>
  );

  function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
    return (
      <div className="space-y-1.5">
        <label htmlFor={htmlFor} className={labelCls}>
          {label}{hint && <span className="ml-1 normal-case text-muted-foreground/40">({hint})</span>}
        </label>
        {children}
      </div>
    );
  }
}

function FormSection({
  icon: Icon, title, subtitle, children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
