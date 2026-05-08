'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { crearCliente, actualizarCliente, desactivarCliente, type ClienteInput } from '@/server/actions/clientes';
import type { Cliente } from '@/server/db/schema';

export function ClienteForm({ cliente }: { cliente?: Cliente }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!cliente;

  const [form, setForm] = useState<ClienteInput>({
    tipo: cliente?.tipo ?? 'minorista',
    razonSocial: cliente?.razonSocial ?? '',
    nombreFantasia: cliente?.nombreFantasia ?? '',
    cuit: cliente?.cuit ?? '',
    condicionIva: cliente?.condicionIva ?? 'consumidor_final',
    email: cliente?.email ?? '',
    telefono: cliente?.telefono ?? '',
    direccion: cliente?.direccion ?? '',
    localidad: cliente?.localidad ?? '',
    habilitaCuentaCorriente: cliente?.habilitaCuentaCorriente ?? false,
    limiteCredito: cliente?.limiteCredito ?? '',
    descuentoPorcentaje: cliente?.descuentoPorcentaje ?? '',
    notas: cliente?.notas ?? '',
  });

  function set<K extends keyof ClienteInput>(key: K, value: ClienteInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        if (isEdit) {
          await actualizarCliente(cliente.id, form);
          toast.success('Cliente actualizado');
        } else {
          await crearCliente(form);
          toast.success('Cliente creado');
        }
        router.push('/dashboard/clientes');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  }

  function handleDesactivar() {
    if (!isEdit) return;
    if (!confirm('¿Desactivar este cliente?')) return;
    startTransition(async () => {
      await desactivarCliente(cliente.id);
      toast.success('Cliente desactivado');
      router.push('/dashboard/clientes');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Datos principales */}
      <section className="bg-background border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Datos del cliente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => set('tipo', v as ClienteInput['tipo'])}>
              <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minorista">Minorista</SelectItem>
                <SelectItem value="mayorista">Mayorista</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="condicionIva">Condición IVA</Label>
            <Select value={form.condicionIva} onValueChange={(v) => set('condicionIva', v as ClienteInput['condicionIva'])}>
              <SelectTrigger id="condicionIva"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consumidor_final">Consumidor final</SelectItem>
                <SelectItem value="responsable_inscripto">Responsable inscripto</SelectItem>
                <SelectItem value="monotributo">Monotributo</SelectItem>
                <SelectItem value="exento">Exento</SelectItem>
                <SelectItem value="no_categorizado">No categorizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="razonSocial">Razón social *</Label>
            <Input id="razonSocial" required value={form.razonSocial}
              onChange={(e) => set('razonSocial', e.target.value)} placeholder="Nombre o empresa" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nombreFantasia">Nombre fantasía</Label>
            <Input id="nombreFantasia" value={form.nombreFantasia ?? ''}
              onChange={(e) => set('nombreFantasia', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cuit">CUIT</Label>
          <Input id="cuit" value={form.cuit ?? ''} onChange={(e) => set('cuit', e.target.value)}
            placeholder="20-12345678-9" />
        </div>
      </section>

      {/* Contacto */}
      <section className="bg-background border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Contacto y dirección</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" value={form.telefono ?? ''}
              onChange={(e) => set('telefono', e.target.value)} placeholder="11 1234-5678" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" value={form.direccion ?? ''}
              onChange={(e) => set('direccion', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="localidad">Localidad</Label>
            <Input id="localidad" value={form.localidad ?? ''}
              onChange={(e) => set('localidad', e.target.value)} />
          </div>
        </div>
      </section>

      {/* Cuenta corriente */}
      <section className="bg-background border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="cc" className="font-semibold">Cuenta corriente</Label>
            <p className="text-sm text-muted-foreground mt-1">Permite vender a crédito y registrar pagos.</p>
          </div>
          <Switch id="cc" checked={form.habilitaCuentaCorriente}
            onCheckedChange={(v) => set('habilitaCuentaCorriente', v)} />
        </div>
        {form.habilitaCuentaCorriente && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="limiteCredito">Límite de crédito (opcional)</Label>
              <Input id="limiteCredito" type="number" step="0.01"
                value={form.limiteCredito ?? ''}
                onChange={(e) => set('limiteCredito', e.target.value)}
                placeholder="Sin límite" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="descuento">Descuento (%)</Label>
              <Input id="descuento" type="number" step="0.01" min="0" max="100"
                value={form.descuentoPorcentaje ?? ''}
                onChange={(e) => set('descuentoPorcentaje', e.target.value)}
                placeholder="0" />
            </div>
          </div>
        )}
      </section>

      {/* Notas */}
      <section className="bg-background border rounded-lg p-6 space-y-2">
        <Label htmlFor="notas" className="font-semibold">Notas internas</Label>
        <Textarea id="notas" rows={3} value={form.notas ?? ''}
          onChange={(e) => set('notas', e.target.value)} />
      </section>

      <div className="flex items-center justify-between">
        {isEdit ? (
          <Button type="button" variant="ghost" onClick={handleDesactivar} disabled={isPending}>
            Desactivar cliente
          </Button>
        ) : <div />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </div>
    </form>
  );
}
