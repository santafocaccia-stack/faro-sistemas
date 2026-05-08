'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Identificación */}
      <section className="bg-background border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Identificación</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              required
              value={form.nombre}
              onChange={(e) => update('nombre', e.target.value)}
              placeholder="Bola de lomo"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="codigo">Código (opcional)</Label>
            <Input
              id="codigo"
              value={form.codigo ?? ''}
              onChange={(e) => update('codigo', e.target.value)}
              placeholder="Código interno o de barras"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="categoria">Categoría</Label>
          <Input
            id="categoria"
            value={form.categoria ?? ''}
            onChange={(e) => update('categoria', e.target.value)}
            placeholder="Vacuno, cerdo, pollo..."
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            value={form.descripcion ?? ''}
            onChange={(e) => update('descripcion', e.target.value)}
            rows={2}
          />
        </div>
      </section>

      {/* Unidad y stock */}
      <section className="bg-background border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Unidad y stock</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="tipoUnidad">Tipo de unidad</Label>
            <Select
              value={form.tipoUnidad}
              onValueChange={(v) => update('tipoUnidad', v as 'por_kg' | 'por_unidad')}
            >
              <SelectTrigger id="tipoUnidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="por_kg">Por kilogramo</SelectItem>
                <SelectItem value="por_unidad">Por unidad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="stockActual">Stock actual ({unidad})</Label>
            <Input
              id="stockActual"
              type="number"
              step={form.tipoUnidad === 'por_kg' ? '0.001' : '1'}
              value={form.stockActual}
              onChange={(e) => update('stockActual', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stockMinimo">Stock mínimo (opcional)</Label>
            <Input
              id="stockMinimo"
              type="number"
              step={form.tipoUnidad === 'por_kg' ? '0.001' : '1'}
              value={form.stockMinimo ?? ''}
              onChange={(e) => update('stockMinimo', e.target.value)}
              placeholder="Alerta de stock bajo"
            />
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="bg-background border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Precios</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="costoPromedio">Costo promedio ($/{unidad})</Label>
            <Input
              id="costoPromedio"
              type="number"
              step="0.01"
              value={form.costoPromedio}
              onChange={(e) => update('costoPromedio', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="precioMayorista">Precio mayorista ($/{unidad})</Label>
            <Input
              id="precioMayorista"
              type="number"
              step="0.01"
              required
              value={form.precioMayorista}
              onChange={(e) => update('precioMayorista', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="precioMinorista">Precio minorista ($/{unidad})</Label>
            <Input
              id="precioMinorista"
              type="number"
              step="0.01"
              required
              value={form.precioMinorista}
              onChange={(e) => update('precioMinorista', e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Estado */}
      <section className="bg-background border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="activo" className="font-semibold">Producto activo</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Si está inactivo, no aparece en el listado de venta.
            </p>
          </div>
          <Switch
            id="activo"
            checked={form.activo}
            onCheckedChange={(v) => update('activo', v)}
          />
        </div>
      </section>

      {/* Acciones */}
      <div className="flex items-center justify-between">
        {isEdit ? (
          <Button type="button" variant="ghost" onClick={handleDesactivar} disabled={isPending}>
            Desactivar producto
          </Button>
        ) : <div />}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </div>
    </form>
  );
}
