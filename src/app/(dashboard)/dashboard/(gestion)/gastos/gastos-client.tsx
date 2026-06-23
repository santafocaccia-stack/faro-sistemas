'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Sparkles, TrendingUp, TrendingDown, Wallet, Loader2 } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  obtenerBalanceMensual,
  listarGastos,
  crearGasto,
  anularGasto,
  analizarMes,
} from '@/server/actions/gastos';
import type { BalanceMensual } from '@/lib/balance';

type GastoRow = {
  id: string;
  fecha: string; // ISO
  categoria: string;
  monto: string;
  descripcion: string | null;
  metodoPago: string | null;
};

const inputCls = 'h-9 bg-background border-border';
const selCls = 'h-9 bg-background border border-border rounded-md px-3 text-sm w-full';

const METODOS: { v: string; l: string }[] = [
  { v: 'efectivo', l: 'Efectivo' },
  { v: 'transferencia', l: 'Transferencia' },
  { v: 'tarjeta_debito', l: 'Débito' },
  { v: 'tarjeta_credito', l: 'Crédito' },
  { v: 'mercado_pago', l: 'Mercado Pago' },
  { v: 'cheque', l: 'Cheque' },
  { v: 'otro', l: 'Otro' },
];

function deltaTxt(p: number | null): { txt: string; up: boolean } {
  if (p === null) return { txt: 's/d', up: true };
  return { txt: `${p > 0 ? '+' : ''}${p.toFixed(1)}%`, up: p >= 0 };
}

export function GastosClient({
  mesInicial,
  balanceInicial,
  gastosIniciales,
  categorias,
}: {
  mesInicial: string;
  balanceInicial: BalanceMensual;
  gastosIniciales: GastoRow[];
  categorias: string[];
}) {
  const [mes, setMes] = useState(mesInicial);
  const [balance, setBalance] = useState(balanceInicial);
  const [gastos, setGastos] = useState<GastoRow[]>(gastosIniciales);
  const [pending, start] = useTransition();

  const [analisis, setAnalisis] = useState<string | null>(null);
  const [analisisIA, setAnalisisIA] = useState(false);
  const [analizando, setAnalizando] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [fCategoria, setFCategoria] = useState('');
  const [fMonto, setFMonto] = useState('');
  const [fFecha, setFFecha] = useState(`${mesInicial}-01`);
  const [fDesc, setFDesc] = useState('');
  const [fMetodo, setFMetodo] = useState('');
  const [error, setError] = useState('');

  const recargar = (m: string) =>
    start(async () => {
      const [b, gs] = await Promise.all([obtenerBalanceMensual(m), listarGastos(m)]);
      setBalance(b);
      setGastos(gs.map((g) => ({ ...g, fecha: new Date(g.fecha).toISOString() })));
      setAnalisis(null); // el análisis es por mes
    });

  const cambiarMes = (m: string) => {
    setMes(m);
    setFFecha(`${m}-01`);
    recargar(m);
  };

  const guardar = () =>
    start(async () => {
      setError('');
      const r = await crearGasto({
        fecha: fFecha,
        categoria: fCategoria,
        monto: fMonto,
        descripcion: fDesc || null,
        metodoPago: fMetodo || null,
      });
      if (!r.ok) return setError(r.error ?? 'Error');
      setFCategoria(''); setFMonto(''); setFDesc(''); setFMetodo('');
      setShowForm(false);
      recargar(mes);
    });

  const borrar = (id: string) =>
    start(async () => {
      await anularGasto(id);
      recargar(mes);
    });

  const analizar = () =>
    start(async () => {
      setAnalizando(true);
      const r = await analizarMes(mes);
      setAnalizando(false);
      if (r.ok) { setAnalisis(r.analisis); setAnalisisIA(r.generadoPorIA); }
      else setAnalisis(`No se pudo generar: ${r.error}`);
    });

  const dIng = deltaTxt(balance.comparacion.ingresosDeltaPct);
  const dGas = deltaTxt(balance.comparacion.gastosDeltaPct);
  const dGan = deltaTxt(balance.comparacion.gananciaDeltaPct);

  return (
    <div className="space-y-6">
      {/* Selector de mes */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Mes</label>
        <input
          type="month"
          value={mes}
          onChange={(e) => cambiarMes(e.target.value)}
          className={`${selCls} max-w-[180px]`}
        />
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Balance */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card label="Ingresos" valor={formatARS(balance.ingresos)} delta={dIng} icon={TrendingUp} />
        <Card label="Gastos" valor={formatARS(balance.gastos)} delta={dGas} icon={TrendingDown} invert />
        <Card
          label="Ganancia neta"
          valor={formatARS(balance.ganancia)}
          delta={dGan}
          icon={Wallet}
          highlight={balance.ganancia >= 0 ? 'pos' : 'neg'}
          sub={balance.margenPct !== null ? `margen ${balance.margenPct.toFixed(1)}%` : undefined}
        />
      </div>

      {/* Gastos por categoría */}
      {balance.gastosPorCategoria.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3">Gastos por categoría</h3>
          <div className="space-y-2">
            {balance.gastosPorCategoria.map((c) => (
              <div key={c.categoria} className="flex items-center gap-3 text-sm">
                <span className="w-36 shrink-0 truncate">{c.categoria}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary/70" style={{ width: `${c.pct}%` }} />
                </div>
                <span className="w-28 text-right tabular-nums">{formatARS(c.monto)}</span>
                <span className="w-12 text-right text-muted-foreground">{c.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Análisis con IA */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Análisis del mes
          </h3>
          <Button onClick={analizar} disabled={analizando || pending} className="h-9">
            {analizando ? <Loader2 className="h-4 w-4 animate-spin sm:mr-1.5" /> : <Sparkles className="h-4 w-4 sm:mr-1.5" />}
            {analisis ? 'Regenerar' : 'Generar análisis'}
          </Button>
        </div>
        {!analisis && !analizando && (
          <p className="text-sm text-muted-foreground">
            Generá un análisis del balance: qué pasó este mes, los puntos clave y recomendaciones.
          </p>
        )}
        {analizando && <p className="text-sm text-muted-foreground">Analizando el mes…</p>}
        {analisis && (
          <div className="mt-2">
            <Markdown text={analisis} />
            {!analisisIA && (
              <p className="text-[11px] text-muted-foreground/70 mt-3">
                Resumen automático. Configurá la IA para el análisis detallado.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Gastos del mes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Gastos del mes</h3>
          <Button onClick={() => setShowForm((s) => !s)} variant="outline" className="h-9">
            <Plus className="h-4 w-4 sm:mr-1.5" /> Agregar gasto
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg border border-border bg-background/40 p-4 mb-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Categoría *">
                <input
                  list="categorias-gasto"
                  value={fCategoria}
                  onChange={(e) => setFCategoria(e.target.value)}
                  placeholder="Elegí o escribí…"
                  className={selCls}
                />
                <datalist id="categorias-gasto">
                  {categorias.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field label="Monto ($) *">
                <Input className={inputCls} type="number" value={fMonto} onChange={(e) => setFMonto(e.target.value)} placeholder="0" />
              </Field>
              <Field label="Fecha">
                <Input className={inputCls} type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} />
              </Field>
              <Field label="Método de pago">
                <select className={selCls} value={fMetodo} onChange={(e) => setFMetodo(e.target.value)}>
                  <option value="">—</option>
                  {METODOS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </Field>
              <Field label="Descripción">
                <Input className={inputCls} value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="Opcional" />
              </Field>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={guardar} disabled={pending} className="h-9">Guardar gasto</Button>
              <Button onClick={() => { setShowForm(false); setError(''); }} variant="ghost" className="h-9">Cancelar</Button>
            </div>
          </div>
        )}

        {gastos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No hay gastos cargados este mes.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {gastos.map((g) => (
              <div key={g.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground tabular-nums">
                  {new Date(g.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="font-medium">{g.categoria}</span>
                  {g.descripcion && <span className="text-muted-foreground"> — {g.descripcion}</span>}
                </span>
                <span className="w-28 text-right tabular-nums font-medium">{formatARS(g.monto)}</span>
                <button
                  onClick={() => borrar(g.id)}
                  disabled={pending}
                  className="text-muted-foreground/60 hover:text-destructive transition-colors p-1"
                  aria-label="Borrar gasto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</label>
      {children}
    </div>
  );
}

function Card({
  label, valor, delta, icon: Icon, invert, highlight, sub,
}: {
  label: string;
  valor: string;
  delta: { txt: string; up: boolean };
  icon: typeof Wallet;
  invert?: boolean;
  highlight?: 'pos' | 'neg';
  sub?: string;
}) {
  // Para gastos, "subir" es malo → invertimos el color del delta.
  const good = invert ? !delta.up : delta.up;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${highlight === 'neg' ? 'text-destructive' : highlight === 'pos' ? 'text-success' : ''}`}>
        {valor}
      </p>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs ${good ? 'text-success' : 'text-destructive'}`}>{delta.txt} vs mes ant.</span>
        {sub && <span className="text-xs text-muted-foreground">· {sub}</span>}
      </div>
    </div>
  );
}

/** Renderer markdown mínimo: ## / ### encabezados, **negrita**, viñetas "-". */
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length) {
      out.push(
        <ul key={key} className="list-disc pl-5 space-y-1 my-2">
          {bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (l.startsWith('- ') || l.startsWith('* ')) { bullets.push(l.slice(2)); return; }
    flush(`u${i}`);
    if (l.startsWith('### ')) out.push(<h4 key={i} className="text-sm font-semibold mt-3 mb-1">{inline(l.slice(4))}</h4>);
    else if (l.startsWith('## ')) out.push(<h3 key={i} className="text-base font-semibold mt-4 mb-1">{inline(l.slice(3))}</h3>);
    else if (l) out.push(<p key={i} className="text-sm leading-relaxed my-1">{inline(l)}</p>);
  });
  flush('uend');
  return <div className="text-sm">{out}</div>;
}

/** Negritas **...** dentro de una línea. */
function inline(s: string): React.ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>,
  );
}
