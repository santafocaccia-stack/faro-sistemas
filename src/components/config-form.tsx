'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Building2, ShoppingBag, CreditCard, Wallet, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { planTiene } from '@/lib/planes';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { actualizarConfig } from '@/server/actions/config';
import { cancelarSuscripcion } from '@/server/actions/suscripcion';
import { desconectarMP } from '@/server/actions/mp-negocio';
import type { Tenant } from '@/server/db/schema';
import Link from 'next/link';

type Props = { tenant: Tenant; mpStatus?: string };

const planLabel: Record<string, string> = {
  servicios:    'Gesto Servicios',
  market:       'Gesto Market',
  food:         'Gesto Food',
  balanza:      'Gesto Balanza',
  prestamista:  'Gesto Préstamos',
  atmosfericos: 'Gesto Atmosféricos',
  // legacy
  basico: 'Básico',
  pro:    'Pro',
  plus:   'Plus',
};

const statusBadge: Record<string, { label: string; className: string }> = {
  trial:      { label: 'Trial',       className: 'bg-warning/15 text-warning border-warning/20' },
  activo:     { label: 'Activo',      className: 'bg-success/15 text-success border-success/20' },
  moroso:     { label: 'Moroso',      className: 'bg-warning/15 text-warning border-warning/20' },
  suspendido: { label: 'Suspendido',  className: 'bg-destructive/15 text-destructive border-destructive/20' },
  cancelado:  { label: 'Cancelado',   className: 'bg-muted text-muted-foreground border-border' },
};

export function ConfigForm({ tenant, mpStatus }: Props) {
  const [nombre, setNombre] = useState(tenant.nombre);
  const [cuit, setCuit] = useState(tenant.cuit ?? '');
  const [direccion, setDireccion] = useState(tenant.direccion ?? '');
  const [telefono, setTelefono] = useState(tenant.telefono ?? '');
  const [emailNegocio, setEmailNegocio] = useState(tenant.emailNegocio ?? '');
  const [habilitaMayorista, setHabilitaMayorista] = useState(tenant.habilitaMayorista);
  const [habilitaMinorista, setHabilitaMinorista] = useState(tenant.habilitaMinorista);
  const [preciosVivos, setPreciosVivos] = useState(tenant.preciosVivos);
  const [margenObjetivo, setMargenObjetivo] = useState(String(tenant.margenObjetivo ?? '50'));
  const [isPending, startTransition] = useTransition();
  const tieneProductos = planTiene(tenant.plan, 'productos');
  // Los canales mayorista/minorista solo aplican a planes con punto de venta
  // (market/food/balanza). Servicios, préstamos y atmosféricos no venden por canal.
  const tieneCanales = planTiene(tenant.plan, 'pos');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await actualizarConfig({
        nombre,
        cuit: cuit || null,
        direccion: direccion || null,
        telefono: telefono || null,
        emailNegocio: emailNegocio || null,
        habilitaMayorista,
        habilitaMinorista,
        preciosVivos,
        margenObjetivo,
      });
      if (!result.ok) { toast.error(result.error ?? 'Error al guardar'); return; }
      toast.success('Configuración guardada');
    });
  }

  const inputCls = 'h-9 bg-background/40 border-border/60 text-sm';
  const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70';
  const status = statusBadge[tenant.status] ?? { label: tenant.status, className: 'bg-muted text-muted-foreground' };

  return (
    <>
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

      {/* Canales activos — solo planes con punto de venta */}
      {tieneCanales && (
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
      )}

      {/* Precios vivos — solo planes con productos */}
      {tieneProductos && (
        <FormSection icon={TrendingUp} title="Precios vivos" subtitle="Actualizá precios en masa con redondeo a números lindos">
          <CanalRow
            title="Activar Precios vivos"
            description="Agrega un botón en Productos para subir/bajar precios por % y redondear (ej: $3778 → $3800)"
            checked={preciosVivos}
            onChange={setPreciosVivos}
          />
          {preciosVivos && (
            <div className="space-y-1.5 pt-1">
              <label htmlFor="margen" className={labelCls}>Recargo objetivo sobre el costo (%)</label>
              <Input
                id="margen"
                type="number"
                min="0"
                value={margenObjetivo}
                onChange={(e) => setMargenObjetivo(e.target.value)}
                placeholder="50"
                className={`${inputCls} font-mono tabular-nums max-w-[140px]`}
              />
              <p className="text-[11px] text-muted-foreground">
                Si un producto queda con menos recargo que esto, Gesto te avisa que perdiste margen y te sugiere el precio.
              </p>
            </div>
          )}
        </FormSection>
      )}

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
        {(tenant.status === 'trial' || tenant.status === 'moroso' || tenant.status === 'suspendido') && (
          <Link
            href="/planes"
            className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all"
          >
            {tenant.status === 'trial' ? 'Ver planes y suscribirse' : 'Regularizar suscripción'}
          </Link>
        )}
        {tenant.status === 'activo' && tenant.mpSubscriptionId && (
          <CancelarSuscripcionBtn />
        )}
      </FormSection>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending || (tieneCanales && !habilitaMayorista && !habilitaMinorista)}
          className="glow-primary"
        >
          {isPending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>

    {/* Mercado Pago: el cobro con QR/tarjeta solo está cableado en el POS. */}
    {tieneCanales && <MPSection tenant={tenant} mpStatus={mpStatus} />}
    </>
  );
}

function CancelarSuscripcionBtn() {
  const [isPending, startTransition] = useTransition();

  function handleCancelar() {
    startTransition(async () => {
      const result = await cancelarSuscripcion();
      if (!result.ok) { toast.error(result.error ?? 'Error al cancelar'); return; }
      toast.success('Suscripción cancelada');
    });
  }

  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          disabled={isPending}
          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors underline underline-offset-2"
        >
          {isPending ? 'Cancelando...' : 'Cancelar suscripción'}
        </button>
      }
      title="¿Cancelar la suscripción?"
      description="Tu cuenta se desactivará al final del período de facturación. Esta acción no se puede deshacer."
      confirmLabel="Sí, cancelar"
      onConfirm={handleCancelar}
    />
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

function MPSection({ tenant, mpStatus }: { tenant: Tenant; mpStatus?: string }) {
  const [isPending, startTransition] = useTransition();
  const conectado = !!tenant.mpNegocioAccessToken;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 mt-4">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wallet className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Mercado Pago</h2>
          <p className="text-[11px] text-muted-foreground">Para cobrar con tarjeta y QR a tus clientes</p>
        </div>
      </div>

      {mpStatus === 'ok' && (
        <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
          Cuenta conectada correctamente
        </div>
      )}
      {mpStatus === 'error' && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Hubo un error al conectar. Intentá de nuevo.
        </div>
      )}

      {conectado ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-success flex-shrink-0" />
            <span className="font-medium">Cuenta conectada</span>
            <span className="text-xs text-muted-foreground font-mono">ID: {tenant.mpNegocioUserId}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Los cobros con tarjeta y QR van directo a tu cuenta de Mercado Pago.
          </p>
          <button
            type="button"
            onClick={() => startTransition(() => desconectarMP())}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
          >
            {isPending ? 'Desconectando...' : 'Desconectar cuenta'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Conectá tu cuenta para que tus clientes puedan pagarte con tarjeta de crédito, débito o QR directamente desde el POS.
          </p>
          <a
            href="/api/mp-oauth/start"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#009EE3] text-white text-sm font-medium hover:brightness-110 transition-all"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.33c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.891z"/>
            </svg>
            Conectar con Mercado Pago
          </a>
        </div>
      )}
    </div>
  );
}
