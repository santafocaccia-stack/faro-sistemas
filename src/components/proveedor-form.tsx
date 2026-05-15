'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Truck, Phone, Calendar, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { crearProveedor, actualizarProveedor, desactivarProveedor } from '@/server/actions/proveedores';
import type { Proveedor } from '@/server/db/schema';

const DIAS = [
  { value: 'lunes',     label: 'Lun' },
  { value: 'martes',    label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves',    label: 'Jue' },
  { value: 'viernes',   label: 'Vie' },
  { value: 'sabado',    label: 'Sáb' },
  { value: 'domingo',   label: 'Dom' },
];

type Props = { proveedor?: Proveedor };

export function ProveedorForm({ proveedor }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!proveedor;

  const [nombre, setNombre] = useState(proveedor?.nombre ?? '');
  const [contacto, setContacto] = useState(proveedor?.contacto ?? '');
  const [dias, setDias] = useState<string[]>(proveedor?.diasPedido ?? []);
  const [markupMay, setMarkupMay] = useState(proveedor?.markupMayorista ?? '0');
  const [markupMin, setMarkupMin] = useState(proveedor?.markupMinorista ?? '0');

  const inputCls = 'h-9 bg-background/40 border-border/60 text-sm';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70';

  function toggleDia(dia: string) {
    setDias((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return; }

    const input = {
      nombre,
      contacto: contacto || null,
      diasPedido: dias,
      markupMayorista: markupMay || '0',
      markupMinorista: markupMin || '0',
    };

    startTransition(async () => {
      try {
        if (isEdit) {
          await actualizarProveedor(proveedor.id, input);
          toast.success('Proveedor actualizado');
        } else {
          await crearProveedor(input);
          toast.success('Proveedor creado');
        }
        router.push('/dashboard/proveedores');
      } catch {
        toast.error('Error al guardar el proveedor');
      }
    });
  }

  function handleDesactivar() {
    if (!isEdit) return;
    if (!confirm('¿Desactivar este proveedor?')) return;
    startTransition(async () => {
      await desactivarProveedor(proveedor.id);
      toast.success('Proveedor desactivado');
      router.push('/dashboard/proveedores');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">

      {/* Datos básicos */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Truck className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Datos del proveedor</h2>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>Nombre *</label>
          <Input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Distribuidora el Campo"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>
            <Phone className="inline h-3 w-3 mr-1" />
            Contacto
            <span className="ml-1 normal-case text-muted-foreground/40">(teléfono o mail)</span>
          </label>
          <Input
            value={contacto}
            onChange={(e) => setContacto(e.target.value)}
            placeholder="11 1234-5678"
            className={inputCls}
          />
        </div>
      </div>

      {/* Días de pedido */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Días de pedido</h2>
            <p className="text-[11px] text-muted-foreground">Qué días de la semana se hace el pedido a este proveedor</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {DIAS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDia(d.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dias.includes(d.value)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {dias.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60">Sin días seleccionados — el carrito no tendrá fecha automática</p>
        )}
      </div>

      {/* Markups */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Percent className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Markup por defecto</h2>
            <p className="text-[11px] text-muted-foreground">Porcentaje de ganancia sobre el costo para calcular precio sugerido. Se puede sobreescribir por producto.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Markup mayorista (%)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={markupMay}
              onChange={(e) => setMarkupMay(e.target.value)}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Markup minorista (%)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={markupMin}
              onChange={(e) => setMarkupMin(e.target.value)}
              className={`${inputCls} font-mono tabular-nums`}
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/60">
          Ejemplo: costo $1000 + 30% mayorista → precio mayorista sugerido $1300
        </p>
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
            Desactivar proveedor
          </Button>
        ) : <div className="hidden sm:block" />}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="glow-primary flex-1 sm:flex-none">
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
        </div>
      </div>
    </form>
  );
}
