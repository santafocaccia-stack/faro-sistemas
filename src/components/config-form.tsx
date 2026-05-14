'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Building2, ShoppingBag, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { actualizarConfig } from '@/server/actions/config';
import type { Tenant } from '@/server/db/schema';

type Props = { tenant: Tenant };

const planLabel: Record<string, string> = {
  basico: 'Básico',
  pro: 'Pro',
  plus: 'Plus',
};

const statusBadge: Record<string, { label: string; className: string }> = {
  trial:      { label: 'Trial',       className: 'bg-warning/15 text-warning border-warning/20' },
  activo:     { label: 'Activo',      className: 'bg-success/15 text-success border-success/20' },
  moroso:     { label: 'Moroso',      className: 'bg-warning/15 text-warning border-warning/20' },
  suspendido: { label: 'Suspendido',  className: 'bg-destructive/15 text-destructive border-destructive/20' },
  cancelado:  { label: 'Cancelado',   className: 'bg-muted text-muted-foreground border-border' },
};

export function ConfigForm({ tenant }: Props) {
  const [nombre, setNombre] = useState(tenant.nombre);
  const [cuit, setCuit] = useState(tenant.cuit ?? '');
  const [direccion, setDireccion] = useState(tenant.direccion ?? '');
  const [telefono, setTelefono] = useState(tenant.telefono ?? '');
  const [emailNegocio, setEmailNegocio] = useState(tenant.emailNegocio ?? '');
  const [habilitaMayorista, setHabilitaMayorista] = useState(tenant.habilitaMayorista);
  const [habilitaMinorista, setHabilitaMinorista] = useState(tenant.habilitaMinorista);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await actualizarConfig({
          nombre,
          cuit: cuit || null,
          direccion: direccion || null,
          telefono: telefono || null,
          emailNegocio: emailNegocio || null,
          habilitaMayorista,
          habilitaMinorista,
        });
        toast.success('Configuración guardada');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  }

  const inputCls = 'h-9 bg-background/40 border-border/60 text-sm';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70';
  const status = statusBadge[tenant.status] ?? { label: tenant.status, className: 'bg-muted text-muted-foreground' };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Datos del negocio */}
      <FormSection icon={Building2} title="Datos del negocio" subtitle="Información que aparece en comprobantes y reportes">
        <div className="space-y-1.5">
          <label htmlFor="nombre" className={labelCls}>Nombre del negocio</label>
          <Input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Carnicería El Toro"
            required
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cuit" className={labelCls}>CUIT</label>
          <Input
            id="cuit"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            placeholder="20-12345678-9"
            className={`${inputCls} font-mono tabular-nums`}
          />
          <p className="text-[11px] text-muted-foreground">Usado en comprobantes y documentación fiscal</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="direccion" className={labelCls}>Dirección</label>
          <Input
            id="direccion"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Av. Corrientes 1234, CABA"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="telefono" className={labelCls}>Teléfono</label>
            <Input
              id="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="011 4567-8901"
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="emailNegocio" className={labelCls}>Email del negocio</label>
            <Input
              id="emailNegocio"
              type="email"
              value={emailNegocio}
              onChange={(e) => setEmailNegocio(e.target.value)}
              placeholder="info@negocio.com"
              className={inputCls}
            />
          </div>
        </div>
      </FormSection>

      {/* Canales activos */}
      <FormSection icon={ShoppingBag} title="Canales de venta" subtitle="Activá los modos de operación que usás">
        <CanalRow
          title="Venta Minorista"
          description="Mostrador, consumidor final, ticket por unidad"
          checked={habilitaMinorista}
          onChange={setHabilitaMinorista}
        />
        <CanalRow
          title="Venta Mayorista"
          description="Clientes comerciales, cuenta corriente, factura"
          checked={habilitaMayorista}
          onChange={setHabilitaMayorista}
        />

        {!habilitaMayorista && !habilitaMinorista && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-xs text-destructive">Debe tener al menos un canal activo</p>
          </div>
        )}
      </FormSection>

      {/* Información de cuenta */}
      <FormSection icon={CreditCard} title="Información de cuenta" subtitle="Plan y estado de la suscripción">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <InfoCell label="Plan">
            <span className="text-sm font-medium capitalize">{planLabel[tenant.plan] ?? tenant.plan}</span>
          </InfoCell>
          <InfoCell label="Estado">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${status.className}`}>
              {status.label}
            </span>
          </InfoCell>
          {tenant.trialEnd && (
            <InfoCell label="Trial hasta">
              <span className="text-sm font-medium font-mono tabular-nums">
                {new Date(tenant.trialEnd).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </InfoCell>
          )}
        </div>
      </FormSection>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending || (!habilitaMayorista && !habilitaMinorista)}
          className="glow-primary"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
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

function CanalRow({
  title, description, checked, onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
      checked ? 'bg-primary/5 border-primary/20' : 'bg-background/40 border-border/40'
    }`}>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-1">{label}</p>
      {children}
    </div>
  );
}
