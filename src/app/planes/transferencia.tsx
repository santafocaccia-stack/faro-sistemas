'use client';

import { useState, useTransition } from 'react';
import { Copy, Check, Landmark, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { PlanId } from '@/lib/planes';
import type { DatosTransferencia } from '@/lib/transferencia';
import { avisarTransferencia } from '@/server/actions/pagos-suscripcion';

type PlanLite = { id: PlanId; nombre: string; precioUsd: number };

const ARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function DatoCopiable({ label, value }: { label: string; value: string }) {
  const [copiado, setCopiado] = useState(false);
  function copiar() {
    navigator.clipboard.writeText(value).then(() => {
      setCopiado(true);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopiado(false), 1500);
    });
  }
  return (
    <button
      onClick={copiar}
      className="w-full flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2 text-left hover:border-border transition-colors"
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      {copiado ? (
        <Check className="h-4 w-4 text-success shrink-0" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}

export function PagarTransferencia({
  planes,
  planActual,
  dolarMep,
  datos,
}: {
  planes: PlanLite[];
  planActual: PlanId;
  dolarMep: number;
  datos: DatosTransferencia;
}) {
  const [planId, setPlanId] = useState<PlanId>(planActual);
  const [avisado, setAvisado] = useState(false);
  const [isPending, start] = useTransition();

  const plan = planes.find((p) => p.id === planId) ?? planes[0]!;
  const monto = Math.round(plan.precioUsd * dolarMep);

  function handleAvisar() {
    start(async () => {
      const r = await avisarTransferencia(planId);
      if (r.ok) {
        setAvisado(true);
        toast.success('¡Listo! Recibimos tu aviso, estamos verificando el pago.');
      } else {
        toast.error(r.error ?? 'No se pudo registrar el aviso');
      }
    });
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card/50 p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="icon-chip size-9 shrink-0">
          <Landmark className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="font-semibold tracking-tight">Pagar por transferencia</h2>
          <p className="text-xs text-muted-foreground">Activación en el día, en horario hábil.</p>
        </div>
      </div>

      {avisado ? (
        <div className="rounded-xl border border-success/30 bg-success/[0.06] px-4 py-6 text-center">
          <Check className="h-7 w-7 text-success mx-auto mb-2" />
          <p className="font-medium">Recibimos tu aviso</p>
          <p className="text-sm text-muted-foreground mt-1">
            Estamos verificando tu transferencia. Te avisamos por email apenas se confirme y tu
            cuenta quede activa.
          </p>
        </div>
      ) : (
        <>
          {/* Plan + monto */}
          <div className="flex items-end justify-between gap-3 mb-4">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Versión</label>
              <Select value={planId} onValueChange={(v) => setPlanId(v as PlanId)}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {planes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">A transferir</p>
              <p className="text-2xl font-bold text-primary leading-tight">{ARS(monto)}</p>
              <p className="text-[11px] text-muted-foreground">USD {plan.precioUsd} · MEP ${dolarMep.toLocaleString('es-AR')}</p>
            </div>
          </div>

          {/* Datos bancarios */}
          {datos.configurada ? (
            <div className="space-y-2">
              {datos.alias && <DatoCopiable label="Alias" value={datos.alias} />}
              {datos.cbu && <DatoCopiable label="CBU" value={datos.cbu} />}
              {datos.titular && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Titular: <span className="text-foreground/80 font-medium">{datos.titular}</span>
                  {datos.cuit && <> · CUIT {datos.cuit}</>}
                  {datos.banco && <> · {datos.banco}</>}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-warning/30 bg-warning/[0.06] px-3 py-3 text-sm text-muted-foreground">
              Datos de transferencia no configurados. Cargá las variables <code>TRANSFER_*</code> en el entorno.
            </div>
          )}

          {/* Acción */}
          <ConfirmDialog
            trigger={
              <Button className="w-full mt-4 gap-2" disabled={isPending || !datos.configurada}>
                <Send className="h-4 w-4" />
                {isPending ? 'Registrando…' : 'Ya transferí'}
              </Button>
            }
            title="¿Ya hiciste la transferencia?"
            description={`Vamos a verificar el ingreso de ${ARS(monto)} y activar tu versión ${plan.nombre}. Te confirmamos por email.`}
            confirmLabel="Sí, ya transferí"
            variant="default"
            onConfirm={handleAvisar}
          />
          <p className="text-[11px] text-muted-foreground/70 text-center mt-2">
            Apretá solo después de hacer la transferencia. No se cobra automáticamente.
          </p>
        </>
      )}
    </div>
  );
}
