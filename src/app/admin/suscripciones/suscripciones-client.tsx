'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, X, Search, BadgeCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PLANES_ARRAY, type PlanId } from '@/lib/planes';
import { confirmarPago, rechazarPago, activarManual } from '@/server/actions/pagos-suscripcion';

export type PagoPendiente = {
  pagoId: string;
  tenantId: string;
  tenantNombre: string;
  email: string;
  plan: PlanId;
  planNombre: string;
  montoArs: number;
  avisadoEn: string;
};

export type TenantRow = {
  id: string;
  nombre: string;
  email: string;
  plan: PlanId;
  planNombre: string;
  status: 'trial' | 'activo' | 'moroso' | 'suspendido' | 'cancelado';
  trialEnd: string | null;
  subscriptionEnd: string | null;
  createdAt: string;
};

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const fecha = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

const desde = (iso: string) => {
  const dias = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} días`;
};

const STATUS_BADGE: Record<TenantRow['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  activo:     { label: 'Activo',     variant: 'default' },
  trial:      { label: 'Prueba',     variant: 'secondary' },
  moroso:     { label: 'Moroso',     variant: 'destructive' },
  suspendido: { label: 'Suspendido', variant: 'destructive' },
  cancelado:  { label: 'Cancelado',  variant: 'outline' },
};

/** Días hasta el vencimiento relevante (subscription o trial). */
function vencimiento(t: TenantRow): { label: string; vencido: boolean } {
  const iso = t.subscriptionEnd ?? t.trialEnd;
  if (!iso) return { label: '—', vencido: false };
  const dias = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (dias < 0) return { label: `vencido ${fecha(iso)}`, vencido: true };
  if (dias === 0) return { label: 'vence hoy', vencido: true };
  return { label: `${dias} día${dias === 1 ? '' : 's'} (${fecha(iso)})`, vencido: false };
}

export function SuscripcionesClient({ pendientes, tenants }: { pendientes: PagoPendiente[]; tenants: TenantRow[] }) {
  const [q, setQ] = useState('');
  const [isPending, start] = useTransition();

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter((t) => t.nombre.toLowerCase().includes(term) || t.email.toLowerCase().includes(term));
  }, [q, tenants]);

  function handleConfirmar(p: PagoPendiente) {
    start(async () => {
      const r = await confirmarPago(p.pagoId);
      if (r.ok) toast.success(`Pago de ${p.tenantNombre} confirmado · ${p.planNombre} activado`);
      else toast.error(r.error ?? 'No se pudo confirmar');
    });
  }

  function handleRechazar(p: PagoPendiente) {
    start(async () => {
      const r = await rechazarPago(p.pagoId);
      if (r.ok) toast.success(`Aviso de ${p.tenantNombre} descartado`);
      else toast.error(r.error ?? 'No se pudo rechazar');
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight">Suscripciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Confirmá pagos por transferencia y gestioná el estado de cada negocio.
        </p>
      </div>

      {/* ── Para confirmar ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-warning" strokeWidth={2} />
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Para confirmar
          </h2>
          {pendientes.length > 0 && (
            <Badge variant="secondary" className="bg-warning/15 text-warning">{pendientes.length}</Badge>
          )}
        </div>

        {pendientes.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
            No hay transferencias pendientes de confirmar.
          </div>
        ) : (
          <div className="space-y-2">
            {pendientes.map((p) => (
              <div
                key={p.pagoId}
                className="rounded-xl border border-warning/30 bg-warning/[0.04] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.tenantNombre}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.email} · avisó {desde(p.avisadoEn)}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{ARS(p.montoArs)}</p>
                    <p className="text-xs text-muted-foreground">{p.planNombre}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" disabled={isPending} className="gap-1.5">
                          <Check className="h-3.5 w-3.5" /> Confirmar
                        </Button>
                      }
                      title={`¿Confirmar el pago de ${p.tenantNombre}?`}
                      description={`Se activará ${p.planNombre} y se sumará 1 mes al vencimiento. Le llega el comprobante por email.`}
                      confirmLabel="Sí, confirmar pago"
                      variant="default"
                      onConfirm={() => handleConfirmar(p)}
                    />
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost" disabled={isPending} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      }
                      title={`¿Descartar el aviso de ${p.tenantNombre}?`}
                      description="Usalo si no encontrás la transferencia. No activa la cuenta ni notifica al cliente."
                      confirmLabel="Descartar aviso"
                      onConfirm={() => handleRechazar(p)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Todos los negocios ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Negocios ({tenants.length})
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar negocio o email…"
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="divide-y divide-border/60">
            {filtrados.map((t) => {
              const v = vencimiento(t);
              const badge = STATUS_BADGE[t.status];
              return (
                <div key={t.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 bg-card/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{t.nombre}</p>
                      <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{t.email} · {t.planNombre}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right min-w-[7rem]">
                      <p className={`text-xs ${v.vencido ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                        {t.status === 'activo' ? 'Vence en ' : ''}{v.label}
                      </p>
                    </div>
                    <ActivarManualBtn tenant={t} disabled={isPending} onDone={start} />
                  </div>
                </div>
              );
            })}
            {filtrados.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Sin resultados.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Botón + popover mínimo para activar/renovar un tenant manualmente con plan elegible. */
function ActivarManualBtn({
  tenant,
  disabled,
  onDone,
}: {
  tenant: TenantRow;
  disabled: boolean;
  onDone: (cb: () => Promise<void>) => void;
}) {
  const [plan, setPlan] = useState<PlanId>(tenant.plan);

  function handle() {
    onDone(async () => {
      const r = await activarManual(tenant.id, plan);
      if (r.ok) toast.success(`${tenant.nombre} activado · ${PLANES_ARRAY.find((p) => p.id === plan)?.nombre}`);
      else toast.error(r.error ?? 'No se pudo activar');
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <Select value={plan} onValueChange={(v) => setPlan(v as PlanId)}>
        <SelectTrigger className="h-8 w-[8.5rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PLANES_ARRAY.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">{p.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="outline" disabled={disabled} className="gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5" /> Activar
          </Button>
        }
        title={`¿Activar ${tenant.nombre} manualmente?`}
        description="Para cuando cobraste por afuera. Activa la cuenta, suma 1 mes y manda el comprobante por email."
        confirmLabel="Activar y sumar 1 mes"
        variant="default"
        onConfirm={handle}
      />
    </div>
  );
}
