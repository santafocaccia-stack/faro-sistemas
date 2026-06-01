'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearPrestamo } from '@/server/actions/prestamos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatARS } from '@/lib/utils';

const inputCls = 'h-9 bg-background border-border';
const selCls = 'h-9 bg-background border border-border rounded-md px-3 text-sm w-full';
const PERIODOS: Record<string, number> = { diaria: 365, semanal: 52, quincenal: 24, mensual: 12 };

function hoyISO(addDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + addDays);
  return d.toISOString().slice(0, 10);
}

export function PrestamoForm({ clientes }: { clientes: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const [clienteId, setClienteId] = useState('');
  const [capital, setCapital] = useState('');
  const [tasa, setTasa] = useState('');
  const [frecuencia, setFrecuencia] = useState('mensual');
  const [cuotas, setCuotas] = useState('12');
  const [sistema, setSistema] = useState('frances');
  const [fOtorg, setFOtorg] = useState(hoyISO());
  const [fPrimer, setFPrimer] = useState(hoyISO(30));
  const [punit, setPunit] = useState('');
  const [gracia, setGracia] = useState('0');

  // Preview de la primera cuota (sistema francés)
  const preview = useMemo(() => {
    const cap = Number(capital), t = Number(tasa), n = Number(cuotas);
    if (!cap || !n || isNaN(t)) return null;
    const i = t / 100 / (PERIODOS[frecuencia] ?? 12);
    const C = sistema === 'aleman'
      ? cap / n + cap * i
      : i === 0 ? cap / n : (cap * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    return { cuota: C, total: sistema === 'frances' ? C * n : null };
  }, [capital, tasa, cuotas, frecuencia, sistema]);

  const submit = () =>
    start(async () => {
      setError('');
      if (!clienteId) return setError('Elegí un deudor');
      const r = await crearPrestamo({
        clienteId, capital, tasaNominalAnual: tasa, frecuencia: frecuencia as never,
        cantidadCuotas: cuotas, sistema: sistema as never, fechaOtorgamiento: fOtorg,
        fechaPrimerVencimiento: fPrimer, tasaPunitoriaAnual: punit || null, diasGracia: gracia,
      });
      if (r.ok) router.push(`/dashboard/prestamos/${r.id}`);
      else setError(r.error);
    });

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <Field label="Deudor *">
        <select className={selCls} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">Elegí un cliente…</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        {clientes.length === 0 && <p className="text-[11px] text-warning">No tenés clientes. Cargá uno en la sección Clientes primero.</p>}
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Capital ($) *"><Input className={inputCls} type="number" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="100000" /></Field>
        <Field label="Tasa nominal anual (%) *"><Input className={inputCls} type="number" value={tasa} onChange={(e) => setTasa(e.target.value)} placeholder="120" /></Field>
        <Field label="Frecuencia">
          <select className={selCls} value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
            <option value="mensual">Mensual</option><option value="quincenal">Quincenal</option>
            <option value="semanal">Semanal</option><option value="diaria">Diaria</option>
          </select>
        </Field>
        <Field label="Cantidad de cuotas *"><Input className={inputCls} type="number" value={cuotas} onChange={(e) => setCuotas(e.target.value)} /></Field>
        <Field label="Sistema">
          <select className={selCls} value={sistema} onChange={(e) => setSistema(e.target.value)}>
            <option value="frances">Francés (cuota fija)</option>
            <option value="aleman">Alemán (cuota decreciente)</option>
            <option value="americano">Americano (interés + capital al final)</option>
          </select>
        </Field>
        <Field label="Días de gracia (mora)"><Input className={inputCls} type="number" value={gracia} onChange={(e) => setGracia(e.target.value)} /></Field>
        <Field label="Fecha de otorgamiento"><Input className={inputCls} type="date" value={fOtorg} onChange={(e) => setFOtorg(e.target.value)} /></Field>
        <Field label="1er vencimiento"><Input className={inputCls} type="date" value={fPrimer} onChange={(e) => setFPrimer(e.target.value)} /></Field>
        <Field label="Tasa punitoria anual (%)"><Input className={inputCls} type="number" value={punit} onChange={(e) => setPunit(e.target.value)} placeholder="opcional" /></Field>
      </div>

      {preview && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Cuota estimada</p>
            <p className="text-lg font-semibold font-mono tabular-nums">{formatARS(preview.cuota.toFixed(2))}</p>
          </div>
          {preview.total && (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Total a devolver</p>
              <p className="text-sm font-mono tabular-nums">{formatARS(preview.total.toFixed(2))}</p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button className="glow-primary" disabled={pending || !clienteId || !capital || !cuotas} onClick={submit}>
          {pending ? 'Creando…' : 'Crear préstamo'}
        </Button>
      </div>
    </div>
  );
}
