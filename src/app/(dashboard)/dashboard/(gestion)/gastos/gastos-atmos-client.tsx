'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Loader2,
  TrendingUp, TrendingDown, Wallet, Calendar, CalendarDays,
} from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { crearGasto, anularGasto } from '@/server/actions/gastos';

type GastoRow = {
  id: string;
  fecha: string; // ISO
  categoria: string;
  monto: string;
  descripcion: string | null;
  metodoPago: string | null;
};

type Periodo = { ingresos: number; gastos: number };

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-input bg-background text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';

function addDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y!, m! - 1, d! + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function etiquetaFecha(iso: string, hoy: string): string {
  if (iso === hoy) return 'Hoy';
  if (iso === addDias(hoy, 1)) return 'Mañana';
  if (iso === addDias(hoy, -1)) return 'Ayer';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function GastosAtmosClient({
  fecha,
  gastosDelDia,
  cobradoDelDia,
  resumenSemana,
  resumenMes,
  nombreMes,
  categorias,
}: {
  fecha: string;
  gastosDelDia: GastoRow[];
  cobradoDelDia: number;
  resumenSemana: Periodo;
  resumenMes: Periodo;
  nombreMes: string;
  categorias: string[];
}) {
  const router = useRouter();
  const hoyStr = new Date().toLocaleDateString('en-CA');
  const esHoy = fecha === hoyStr;
  const [pending, start] = useTransition();

  // Form
  const [showForm, setShowForm] = useState(false);
  const [fCategoria, setFCategoria] = useState('');
  const [fMonto, setFMonto] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [error, setError] = useState('');

  function irAFecha(f: string) {
    router.push(`/dashboard/gastos?fecha=${f}`);
  }

  const gastosTotalDia = gastosDelDia.reduce((s, g) => s + Number(g.monto), 0);
  const balanceDia = cobradoDelDia - gastosTotalDia;

  const guardar = () =>
    start(async () => {
      setError('');
      if (!fCategoria.trim() || !fMonto) {
        setError('Completá categoría y monto');
        return;
      }
      const r = await crearGasto({
        fecha,                       // el gasto se carga en el día seleccionado
        categoria: fCategoria,
        monto: fMonto,
        descripcion: fDesc || null,
        metodoPago: null,
      });
      if (!r.ok) { setError(r.error ?? 'Error'); return; }
      setFCategoria(''); setFMonto(''); setFDesc('');
      setShowForm(false);
      router.refresh();
    });

  const borrar = (id: string) =>
    start(async () => {
      await anularGasto(id);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">

      {/* ── Navegador de día ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground capitalize">
            {etiquetaFecha(fecha, hoyStr)}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => irAFecha(addDias(fecha, -1))}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition-colors"
              aria-label="Día anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <input
              type="date"
              value={fecha}
              onChange={(e) => e.target.value && irAFecha(e.target.value)}
              className="h-11 px-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground"
            />
            <button
              type="button"
              onClick={() => irAFecha(addDias(fecha, 1))}
              className="h-11 w-11 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition-colors"
              aria-label="Día siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {!esHoy && (
              <button
                type="button"
                onClick={() => irAFecha(hoyStr)}
                className="h-11 px-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-sm font-semibold"
              >
                Hoy
              </button>
            )}
          </div>
        </div>
        {pending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      {/* ── Balance del día ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-green-600/30 bg-green-50 px-3 py-4 text-center">
          <div className="font-bold text-lg text-green-700 tabular-nums">{formatARS(cobradoDelDia)}</div>
          <div className="text-green-700/80 text-xs font-medium mt-0.5">Cobrado</div>
        </div>
        <div className="rounded-2xl border border-red-600/30 bg-red-50 px-3 py-4 text-center">
          <div className="font-bold text-lg text-red-700 tabular-nums">{formatARS(gastosTotalDia)}</div>
          <div className="text-red-700/80 text-xs font-medium mt-0.5">Gastos</div>
        </div>
        <div className={`rounded-2xl border px-3 py-4 text-center ${
          balanceDia >= 0 ? 'border-emerald-600/40 bg-emerald-100' : 'border-red-600/40 bg-red-100'
        }`}>
          <div className={`font-bold text-lg flex items-center justify-center gap-1 tabular-nums ${
            balanceDia >= 0 ? 'text-emerald-800' : 'text-red-800'
          }`}>
            {balanceDia >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {formatARS(Math.abs(balanceDia))}
          </div>
          <div className={`text-xs font-semibold mt-0.5 ${balanceDia >= 0 ? 'text-emerald-800/80' : 'text-red-800/80'}`}>
            Balance del día
          </div>
        </div>
      </div>

      {/* ── Gastos del día ── */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">
            Gastos {esHoy ? 'de hoy' : `del ${new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`}
          </h3>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="h-11 px-4 text-base font-semibold glow-primary">
              <Plus className="w-5 h-5 mr-1.5" /> Cargar gasto
            </Button>
          )}
        </div>

        {/* Form de carga — limpio, del día seleccionado */}
        {showForm && (
          <div className="rounded-xl border border-border bg-background p-4 mb-4 flex flex-col gap-3">
            <div>
              <label className="text-sm font-semibold mb-1.5 block text-foreground">¿En qué gastaste?</label>
              <input
                value={fCategoria}
                onChange={(e) => setFCategoria(e.target.value)}
                placeholder="Elegí o escribí…"
                className={inputCls}
                autoFocus
              />
              {categorias.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {categorias.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setFCategoria(c)}
                      className={`px-3 h-9 rounded-full text-sm font-medium transition-colors ${
                        fCategoria === c
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block text-foreground">¿Cuánto?</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xl">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={fMonto}
                  onChange={(e) => setFMonto(e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-4 rounded-xl border-2 border-input bg-background text-2xl font-bold text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block text-foreground">
                Detalle <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input
                value={fDesc}
                onChange={(e) => setFDesc(e.target.value)}
                placeholder="Ej: carga en YPF"
                className={inputCls}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button onClick={() => { setShowForm(false); setError(''); }} variant="outline" className="flex-1 h-12 text-base" disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={pending} className="flex-1 h-12 text-base font-semibold glow-primary">
                {pending ? 'Guardando...' : 'Guardar gasto'}
              </Button>
            </div>
          </div>
        )}

        {/* Lista de gastos del día */}
        {gastosDelDia.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {esHoy ? 'Todavía no cargaste gastos hoy.' : 'No hay gastos cargados este día.'}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {gastosDelDia.map((g) => (
              <div key={g.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{g.categoria}</p>
                  {g.descripcion && <p className="text-sm text-muted-foreground truncate">{g.descripcion}</p>}
                </div>
                <span className="font-bold tabular-nums text-base text-foreground">{formatARS(Number(g.monto))}</span>
                <button
                  onClick={() => borrar(g.id)}
                  disabled={pending}
                  className="text-muted-foreground/60 hover:text-destructive transition-colors p-2"
                  aria-label="Borrar gasto"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Resumen semana / mes (solo lectura) ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <ResumenPeriodo icon={Calendar} titulo="Esta semana" periodo={resumenSemana} />
        <ResumenPeriodo icon={CalendarDays} titulo={nombreMes} periodo={resumenMes} />
      </div>
    </div>
  );
}

function ResumenPeriodo({
  icon: Icon, titulo, periodo,
}: {
  icon: typeof Wallet;
  titulo: string;
  periodo: Periodo;
}) {
  const balance = periodo.ingresos - periodo.gastos;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-3 capitalize">
        <Icon className="h-4 w-4 text-primary" /> {titulo}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cobrado</p>
          <p className="font-bold text-sm tabular-nums text-green-700">{formatARS(periodo.ingresos)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Gastos</p>
          <p className="font-bold text-sm tabular-nums text-red-700">{formatARS(periodo.gastos)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Balance</p>
          <p className={`font-bold text-sm tabular-nums ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatARS(balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
