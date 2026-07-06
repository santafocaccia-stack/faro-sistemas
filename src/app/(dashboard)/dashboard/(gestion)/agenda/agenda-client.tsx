'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus, Trash2, AlarmClock, CalendarDays, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  crearTurno,
  cambiarEstadoTurno,
  eliminarTurno,
  crearVencimiento,
  marcarVencimientoPagado,
  eliminarVencimiento,
} from '@/server/actions/agenda';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const ESTADO_TURNO: Record<string, { label: string; cls: string }> = {
  agendado: { label: 'Agendado', cls: 'bg-muted text-muted-foreground' },
  confirmado: { label: 'Confirmado', cls: 'bg-blue-500/10 text-blue-400' },
  en_curso: { label: 'En curso', cls: 'bg-warning/10 text-warning' },
  completado: { label: 'Completado', cls: 'bg-success/10 text-success' },
  cancelado: { label: 'Cancelado', cls: 'bg-destructive/10 text-destructive' },
  no_asistio: { label: 'No asistió', cls: 'bg-destructive/10 text-destructive' },
};
const TIPOS_VENC = [
  ['monotributo_afip', 'Monotributo / AFIP'], ['iva', 'IVA'], ['ganancias', 'Ganancias'],
  ['vtv', 'VTV'], ['seguro_rc', 'Seguro resp. civil'], ['seguro_auto', 'Seguro del auto'],
  ['art', 'ART'], ['matricula', 'Matrícula'], ['habilitacion', 'Habilitación'],
  ['certificacion', 'Certificación'], ['herramienta', 'Herramienta'], ['otro', 'Otro'],
] as const;
const PERIODICIDADES = [
  ['unico', 'Único'], ['mensual', 'Mensual'], ['bimestral', 'Bimestral'],
  ['trimestral', 'Trimestral'], ['semestral', 'Semestral'], ['anual', 'Anual'],
] as const;

type TurnoVM = {
  id: string; titulo: string; descripcion: string | null; direccion: string | null;
  inicio: string; duracionMin: number; estado: string; clienteNombre: string | null;
};
type VencVM = {
  id: string; titulo: string; tipo: string; proximoVencimiento: string;
  periodicidad: string; diasRestantes: number; alerta: 'vencido' | 'por_vencer' | 'al_dia';
  montoEstimado: string | null;
};

const inputCls = 'h-9 bg-background border-border';

export function AgendaClient({
  turnos, vencimientos, lunesISO, offset,
}: {
  turnos: TurnoVM[]; vencimientos: VencVM[]; lunesISO: string; offset: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [formTurno, setFormTurno] = useState(false);
  const [formVenc, setFormVenc] = useState(false);

  const lunes = new Date(lunesISO);
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes); d.setDate(lunes.getDate() + i); return d;
  });
  const domingo = dias[6]!;
  const fmtRango = (d: Date) => d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  const turnosDelDia = (fecha: Date) =>
    turnos.filter((t) => new Date(t.inicio).toDateString() === fecha.toDateString());

  const refresh = () => router.refresh();

  // ── Form turno ──
  const [tTitulo, setTTitulo] = useState('');
  const [tFecha, setTFecha] = useState('');
  const [tHora, setTHora] = useState('09:00');
  const [tDur, setTDur] = useState('60');
  const [tDir, setTDir] = useState('');
  const guardarTurno = () =>
    start(async () => {
      const r = await crearTurno({
        titulo: tTitulo, inicio: new Date(`${tFecha}T${tHora}`).toISOString(),
        duracionMin: Number(tDur) || 60, direccion: tDir || null,
      });
      if (r.ok) { setFormTurno(false); setTTitulo(''); setTFecha(''); setTDir(''); refresh(); }
    });

  // ── Form vencimiento ──
  const [vTitulo, setVTitulo] = useState('');
  const [vTipo, setVTipo] = useState('otro');
  const [vFecha, setVFecha] = useState('');
  const [vPer, setVPer] = useState('anual');
  const [vAviso, setVAviso] = useState('7');
  const guardarVenc = () =>
    start(async () => {
      const r = await crearVencimiento({
        titulo: vTitulo, tipo: vTipo as never, proximoVencimiento: vFecha,
        periodicidad: vPer as never, diasAvisoAnticipado: Number(vAviso) || 7,
      });
      if (r.ok) { setFormVenc(false); setVTitulo(''); setVFecha(''); refresh(); }
    });

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-8 animate-fade-up">
      {/* Header semana */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Semana del {fmtRango(lunes)} al {fmtRango(domingo)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link href={`/dashboard/agenda?semana=${offset - 1}`} aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          {offset !== 0 && (
            <Button asChild variant="outline" size="sm" className="h-9"><Link href="/dashboard/agenda">Hoy</Link></Button>
          )}
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link href={`/dashboard/agenda?semana=${offset + 1}`} aria-label="Semana siguiente"><ChevronRight className="h-4 w-4" /></Link>
          </Button>
          <Button size="sm" className="h-9 glow-primary" onClick={() => setFormTurno((v) => !v)}>
            <Plus className="h-4 w-4 mr-1.5" />Nuevo turno
          </Button>
        </div>
      </div>

      {/* Form turno */}
      {formTurno && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Trabajo a realizar</span>
            <Input className={inputCls} placeholder="ej: Cambio de termotanque" value={tTitulo} onChange={(e) => setTTitulo(e.target.value)} />
          </label>
          <label className="space-y-1 block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Dirección</span>
            <Input className={inputCls} placeholder="Dirección del trabajo" value={tDir} onChange={(e) => setTDir(e.target.value)} />
          </label>
          <label className="space-y-1 block">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Día del turno</span>
            <Input className={inputCls} type="date" value={tFecha} onChange={(e) => setTFecha(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <label className="space-y-1 block flex-1">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Hora</span>
              <Input className={inputCls} type="time" value={tHora} onChange={(e) => setTHora(e.target.value)} />
            </label>
            <label className="space-y-1 block w-24">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Duración</span>
              <Input className={inputCls} type="number" placeholder="min" value={tDur} onChange={(e) => setTDur(e.target.value)} />
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setFormTurno(false)}>Cancelar</Button>
            <Button size="sm" className="glow-primary" disabled={pending || !tTitulo || !tFecha} onClick={guardarTurno}>Guardar turno</Button>
          </div>
        </div>
      )}

      {/* Semana */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dias.map((dia, i) => {
          const items = turnosDelDia(dia);
          const esHoy = dia.toDateString() === new Date().toDateString();
          return (
            <div key={i} className={`rounded-xl border bg-card p-3 min-h-[90px] ${esHoy ? 'border-primary/40' : 'border-border'}`}>
              <div className="flex items-baseline justify-between mb-2">
                <span className={`text-[13px] font-medium ${esHoy ? 'text-primary' : ''}`}>{DIAS[i]}</span>
                <span className="text-[11px] text-muted-foreground">{dia.getDate()}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/60">Sin turnos</p>
              ) : (
                <div className="space-y-1.5">
                  {items.map((t) => {
                    const badge = ESTADO_TURNO[t.estado] ?? ESTADO_TURNO.agendado!;
                    const hora = new Date(t.inicio).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div key={t.id} className="rounded-lg bg-background border border-border/60 px-2.5 py-2 group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium truncate">{hora} · {t.titulo}</p>
                            {t.direccion && <p className="text-[11px] text-muted-foreground truncate">{t.direccion}</p>}
                          </div>
                          <button onClick={() => start(async () => { await eliminarTurno(t.id); refresh(); })}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <select value={t.estado}
                          onChange={(e) => start(async () => { await cambiarEstadoTurno(t.id, e.target.value as never); refresh(); })}
                          className={`mt-1.5 text-[10px] rounded px-1.5 py-0.5 border-0 ${badge.cls}`}>
                          {Object.entries(ESTADO_TURNO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vencimientos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlarmClock className="h-4 w-4 text-primary" />
            <h2 className="text-[15px] font-semibold">Vencimientos</h2>
          </div>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setFormVenc((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Agregar
          </Button>
        </div>

        {formVenc && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Qué vence</span>
              <Input className={inputCls} placeholder="ej: VTV camioneta" value={vTitulo} onChange={(e) => setVTitulo(e.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Tipo</span>
              <select className={`${inputCls} rounded-md px-3 w-full`} value={vTipo} onChange={(e) => setVTipo(e.target.value)}>
                {TIPOS_VENC.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Primer vencimiento</span>
              <Input className={inputCls} type="date" value={vFecha} onChange={(e) => setVFecha(e.target.value)} />
            </label>
            <label className="space-y-1 block">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">Se repite</span>
              <select className={`${inputCls} rounded-md px-3 w-full`} value={vPer} onChange={(e) => setVPer(e.target.value)}>
                {PERIODICIDADES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Avisar</span>
              <Input className={inputCls} type="number" value={vAviso} onChange={(e) => setVAviso(e.target.value)} />
              <span className="text-xs text-muted-foreground">días antes</span>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setFormVenc(false)}>Cancelar</Button>
              <Button size="sm" className="glow-primary" disabled={pending || !vTitulo || !vFecha} onClick={guardarVenc}>Guardar</Button>
            </div>
          </div>
        )}

        {vencimientos.length === 0 ? (
          <div className="rounded-xl border border-border bg-card flex flex-col items-center justify-center py-12 text-center">
            <CalendarDays className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Sin vencimientos cargados</p>
            <p className="text-xs text-muted-foreground mt-1">Cargá seguro, monotributo, VTV, matrícula… y te avisamos antes</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border/40">
            {vencimientos.map((v) => {
              const tipoLabel = TIPOS_VENC.find(([k]) => k === v.tipo)?.[1] ?? v.tipo;
              const alertaCls = v.alerta === 'vencido' ? 'text-destructive' : v.alerta === 'por_vencer' ? 'text-warning' : 'text-muted-foreground';
              const alertaTxt = v.alerta === 'vencido' ? `Vencido hace ${Math.abs(v.diasRestantes)} días` : v.alerta === 'por_vencer' ? `Vence en ${v.diasRestantes} días` : `En ${v.diasRestantes} días`;
              return (
                <div key={v.id} className="flex items-center justify-between gap-3 px-4 py-3 group">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{v.titulo}</p>
                    <p className="text-[11px] text-muted-foreground">{tipoLabel} · <span className={alertaCls}>{alertaTxt}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="outline" className="h-8 text-xs" disabled={pending}
                      onClick={() => start(async () => { await marcarVencimientoPagado(v.id); refresh(); })}>
                      <Check className="h-3.5 w-3.5 mr-1" />Pagado
                    </Button>
                    <button onClick={() => start(async () => { await eliminarVencimiento(v.id); refresh(); })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
