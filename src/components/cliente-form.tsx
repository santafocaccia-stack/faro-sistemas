'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, Phone, BookOpen, FileText, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { crearCliente, actualizarCliente, desactivarCliente, type ClienteInput } from '@/server/actions/clientes';
import type { Cliente } from '@/server/db/schema';

export function ClienteForm({ cliente, plan }: { cliente?: Cliente; plan?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!cliente;
  const esAtmos = plan === 'atmosfericos';

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
    habilitaCuentaCorriente: esAtmos ? false : (cliente?.habilitaCuentaCorriente ?? false),
    limiteCredito: cliente?.limiteCredito ?? '',
    descuentoPorcentaje: cliente?.descuentoPorcentaje ?? '',
    notas: cliente?.notas ?? '',
    litrosPozoEstimado: cliente?.litrosPozoEstimado ?? '',
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
    startTransition(async () => {
      await desactivarCliente(cliente.id);
      toast.success('Cliente desactivado');
      router.push('/dashboard/clientes');
    });
  }

  const inputCls = 'h-9 bg-background/40 border-border/60 text-sm';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Datos principales */}
      <FormSection icon={User} title="Datos del cliente">
        {!esAtmos && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Minorista/Mayorista es jerga de comercio: en servicios/préstamos no aplica */}
            {plan !== 'servicios' && plan !== 'prestamista' && (
            <Field label="Tipo" htmlFor="tipo" labelCls={labelCls}>
              <Select value={form.tipo} onValueChange={(v) => set('tipo', v as ClienteInput['tipo'])}>
                <SelectTrigger id="tipo" className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minorista">Minorista</SelectItem>
                  <SelectItem value="mayorista">Mayorista</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            )}
            <Field label="Condición IVA" htmlFor="condicionIva" labelCls={labelCls}>
              <Select value={form.condicionIva} onValueChange={(v) => set('condicionIva', v as ClienteInput['condicionIva'])}>
                <SelectTrigger id="condicionIva" className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consumidor_final">Consumidor final</SelectItem>
                  <SelectItem value="responsable_inscripto">Responsable inscripto</SelectItem>
                  <SelectItem value="monotributo">Monotributo</SelectItem>
                  <SelectItem value="exento">Exento</SelectItem>
                  <SelectItem value="no_categorizado">No categorizado</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )}
        <div className={!esAtmos ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
          <Field label={esAtmos ? 'Nombre del cliente *' : 'Razón social *'} htmlFor="razonSocial" labelCls={labelCls}>
            <Input id="razonSocial" required value={form.razonSocial}
              onChange={(e) => set('razonSocial', e.target.value)}
              placeholder={esAtmos ? 'Nombre de la persona o familia' : 'Nombre o empresa'}
              className={inputCls} />
          </Field>
          {!esAtmos && (
            <Field label="Nombre fantasía" htmlFor="nombreFantasia" labelCls={labelCls} hint="opcional">
              <Input id="nombreFantasia" value={form.nombreFantasia ?? ''}
                onChange={(e) => set('nombreFantasia', e.target.value)} className={inputCls} />
            </Field>
          )}
        </div>
        {!esAtmos && (
          <Field label="CUIT" htmlFor="cuit" labelCls={labelCls}>
            <Input id="cuit" value={form.cuit ?? ''} onChange={(e) => set('cuit', e.target.value)}
              placeholder="20-12345678-9" className={`${inputCls} font-mono`} />
          </Field>
        )}
      </FormSection>

      {/* Contacto y dirección */}
      <FormSection icon={Phone} title="Contacto y dirección">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Teléfono" htmlFor="telefono" labelCls={labelCls}>
            <Input id="telefono" value={form.telefono ?? ''}
              onChange={(e) => set('telefono', e.target.value)} placeholder="11 1234-5678" className={`${inputCls} font-mono`} />
          </Field>
          {!esAtmos && (
            <Field label="Email" htmlFor="email" labelCls={labelCls}>
              <Input id="email" type="email" value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)} className={inputCls} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={esAtmos ? 'Dirección *' : 'Dirección'} htmlFor="direccion" labelCls={labelCls}>
            <Input id="direccion" value={form.direccion ?? ''}
              onChange={(e) => set('direccion', e.target.value)}
              required={esAtmos}
              className={inputCls} />
          </Field>
          <Field label="Localidad" htmlFor="localidad" labelCls={labelCls}>
            <Input id="localidad" value={form.localidad ?? ''}
              onChange={(e) => set('localidad', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </FormSection>

      {/* Litros del pozo — solo para atmosféricos */}
      {esAtmos && (
        <FormSection icon={Droplets} title="Datos del pozo">
          <Field label="Capacidad estimada del pozo (litros)" htmlFor="litrosPozo" labelCls={labelCls}>
            <Input
              id="litrosPozo"
              type="number"
              inputMode="decimal"
              value={form.litrosPozoEstimado ?? ''}
              onChange={(e) => set('litrosPozoEstimado', e.target.value || null)}
              placeholder="Ej: 2000"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </FormSection>
      )}

      {/* Cuenta corriente — solo para planes que la usan */}
      {!esAtmos && (
        <FormSection icon={BookOpen} title="Cuenta corriente">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Habilitar cuenta corriente</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {plan === 'servicios'
                  ? 'Permite dejarle saldo pendiente y registrar cobros después'
                  : 'Permite vender a crédito y registrar cobros'}
              </p>
            </div>
            <Switch
              id="cc"
              checked={form.habilitaCuentaCorriente}
              onCheckedChange={(v) => set('habilitaCuentaCorriente', v)}
            />
          </div>
          {form.habilitaCuentaCorriente && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/40">
              <Field label="Límite de crédito" htmlFor="limiteCredito" labelCls={labelCls} hint="opcional">
                <Input id="limiteCredito" type="number" step="0.01"
                  value={form.limiteCredito ?? ''}
                  onChange={(e) => set('limiteCredito', e.target.value)}
                  placeholder="Sin límite"
                  className={`${inputCls} font-mono tabular-nums`} />
              </Field>
              <Field label="Descuento %" htmlFor="descuento" labelCls={labelCls}>
                <Input id="descuento" type="number" step="0.01" min="0" max="100"
                  value={form.descuentoPorcentaje ?? ''}
                  onChange={(e) => set('descuentoPorcentaje', e.target.value)}
                  placeholder="0"
                  className={`${inputCls} font-mono tabular-nums`} />
              </Field>
            </div>
          )}
        </FormSection>
      )}

      {/* Notas */}
      <FormSection icon={FileText} title="Notas">
        <Textarea
          id="notas"
          rows={3}
          value={form.notas ?? ''}
          onChange={(e) => set('notas', e.target.value)}
          placeholder={esAtmos
            ? 'Referencias, horarios, observaciones del lugar...'
            : 'Información adicional, preferencias, datos de contacto...'}
          className="bg-background/40 border-border/60 text-sm"
        />
      </FormSection>

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {isEdit ? (
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 order-last sm:order-first"
              >
                Desactivar cliente
              </Button>
            }
            title="¿Desactivar este cliente?"
            description="El cliente no aparecerá en la lista. Podés reactivarlo después."
            confirmLabel="Sí, desactivar"
            onConfirm={handleDesactivar}
          />
        ) : <div className="hidden sm:block" />}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} className="glow-primary flex-1 sm:flex-none">
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </div>
    </form>
  );
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

function Field({
  label, htmlFor, hint, labelCls, children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  labelCls: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className={labelCls}>
        {label}{hint && <span className="ml-1 normal-case text-muted-foreground/40">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
