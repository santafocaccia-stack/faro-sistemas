'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, ScanBarcode, Camera, Zap, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { crearProducto } from '@/server/actions/productos';
import { buscarEnOFF } from '@/server/actions/productos-off';
import { BarcodeScannerModal } from '@/components/barcode-scanner-modal';
import { ejemplosPlan } from '@/lib/planes';
import type { Categoria } from '@/server/db/schema';

type Props = { categorias: Categoria[]; plan?: string };

const EMPTY_FORM = {
  codigo: '',
  nombre: '',
  precioMinorista: '',
  precioMayorista: '',
  stockInicial: '',
  categoriaId: '',
};

export function CargaRapidaForm({ categorias, plan }: Props) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(EMPTY_FORM);
  const [scannerAbierto, setScannerAbierto] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(null);
  const [totalSesion, setTotalSesion] = useState(0);
  const [sugerenciaOFF, setSugerenciaOFF] = useState<string | null>(null);

  const codigoRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const precioMinRef = useRef<HTMLInputElement>(null);
  const precioMayRef = useRef<HTMLInputElement>(null);
  const stockRef = useRef<HTMLInputElement>(null);

  // Auto-focus en código al montar
  useEffect(() => {
    codigoRef.current?.focus();
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function autocompletarDesdeOFF(codigo: string) {
    if (!codigo.trim()) return;
    const nombre = await buscarEnOFF(codigo.trim());
    if (nombre) setSugerenciaOFF(nombre);
  }

  function aplicarSugerencia() {
    if (!sugerenciaOFF) return;
    setForm((prev) => ({ ...prev, nombre: sugerenciaOFF }));
    setSugerenciaOFF(null);
    precioMinRef.current?.focus();
  }

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setSugerenciaOFF(null);
    requestAnimationFrame(() => {
      codigoRef.current?.focus();
    });
  }, []);

  function handleCodigoKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      autocompletarDesdeOFF(form.codigo);
      nombreRef.current?.focus();
    }
  }

  function handleNombreKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      precioMinRef.current?.focus();
    }
  }

  function handlePrecioMinKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      precioMayRef.current?.focus();
    }
  }

  function handlePrecioMayKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      stockRef.current?.focus();
    }
  }

  function handleStockKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGuardar();
    }
  }

  function handleGuardar() {
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      nombreRef.current?.focus();
      return;
    }

    startTransition(async () => {
      const result = await crearProducto({
        codigo: form.codigo.trim() || null,
        nombre: normalizarNombre(form.nombre),
        descripcion: null,
        categoriaId: form.categoriaId || null,
        grupoVarianteId: null,
        tipoUnidad: 'por_unidad',
        stockActual: form.stockInicial.trim() || '0',
        stockMinimo: null,
        costoPromedio: '0',
        precioMayorista: form.precioMayorista.trim() || '0',
        precioMinorista: form.precioMinorista.trim() || '0',
        activo: true,
        vinculos: [],
      });

      if (!result.ok) {
        toast.error(result.error, { duration: 6000 });
        return;
      }

      const nombre = normalizarNombre(form.nombre);
      setUltimoGuardado(nombre);
      setTotalSesion((n) => n + 1);
      resetForm();
    });
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/dashboard/productos"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 group"
        >
          <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Productos
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
              </div>
              <h1 className="text-[22px] font-semibold tracking-tight">Carga rápida</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Scan → nombre → precio → guardar y siguiente
            </p>
          </div>

          {totalSesion > 0 && (
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {totalSesion} {totalSesion === 1 ? 'producto' : 'productos'}
            </div>
          )}
        </div>
      </div>

      {/* Último guardado */}
      {ultimoGuardado && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-[13px] text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span><span className="font-medium">{ultimoGuardado}</span> guardado</span>
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">

        {/* Código de barras */}
        <div className="space-y-1.5">
          <label htmlFor="cr-codigo" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            Código de barras <span className="normal-case text-muted-foreground/40">(opcional)</span>
          </label>
          <div className="relative">
            <ScanBarcode
              className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50"
              strokeWidth={1.75}
            />
            <Input
              ref={codigoRef}
              id="cr-codigo"
              value={form.codigo}
              onChange={(e) => update('codigo', e.target.value)}
              onKeyDown={handleCodigoKeyDown}
              placeholder="Escaneá o escribí el código"
              className="h-10 bg-background/40 border-border/60 text-sm pl-8 pr-10 font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setScannerAbierto(true)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-95"
              aria-label="Escanear con cámara"
            >
              <Camera className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Nombre */}
        <div className="space-y-1.5">
          <label htmlFor="cr-nombre" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            Nombre *
          </label>
          <Input
            ref={nombreRef}
            id="cr-nombre"
            value={form.nombre}
            onChange={(e) => { update('nombre', e.target.value); setSugerenciaOFF(null); }}
            onKeyDown={handleNombreKeyDown}
            placeholder={`Ej: ${ejemplosPlan(plan).producto}`}
            className="h-10 bg-background/40 border-border/60 text-sm"
            autoComplete="off"
          />
          {sugerenciaOFF && (
            <button
              type="button"
              onClick={aplicarSugerencia}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 text-[12px] text-left hover:bg-primary/12 transition-colors group"
            >
              <Sparkles className="h-3 w-3 text-primary shrink-0" />
              <span className="text-muted-foreground">Sugerido:</span>
              <span className="text-foreground font-medium truncate">{sugerenciaOFF}</span>
              <span className="ml-auto text-primary/60 group-hover:text-primary text-[11px] shrink-0">Aplicar →</span>
            </button>
          )}
        </div>

        {/* Precios */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="cr-min" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              P. Minorista *
            </label>
            <Input
              ref={precioMinRef}
              id="cr-min"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.precioMinorista}
              onChange={(e) => update('precioMinorista', e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={handlePrecioMinKeyDown}
              placeholder="0.00"
              className="h-10 bg-background/40 border-border/60 text-sm font-mono tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cr-may" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              P. Mayorista
            </label>
            <Input
              ref={precioMayRef}
              id="cr-may"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.precioMayorista}
              onChange={(e) => update('precioMayorista', e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={handlePrecioMayKeyDown}
              placeholder="0.00"
              className="h-10 bg-background/40 border-border/60 text-sm font-mono tabular-nums"
            />
          </div>
        </div>

        {/* Stock inicial */}
        <div className="space-y-1.5">
          <label htmlFor="cr-stock" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            Stock inicial <span className="normal-case text-muted-foreground/40">(opcional)</span>
          </label>
          <Input
            ref={stockRef}
            id="cr-stock"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={form.stockInicial}
            onChange={(e) => update('stockInicial', e.target.value)}
            onFocus={(e) => e.target.select()}
            onKeyDown={handleStockKeyDown}
            placeholder="0"
            className="h-10 bg-background/40 border-border/60 text-sm font-mono tabular-nums"
          />
        </div>

        {/* Categoría */}
        {categorias.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="cr-cat" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Categoría <span className="normal-case text-muted-foreground/40">(opcional)</span>
            </label>
            <Select
              value={form.categoriaId}
              onValueChange={(v) => update('categoriaId', v === '__none' ? '' : v)}
            >
              <SelectTrigger id="cr-cat" className="h-10 bg-background/40 border-border/60 text-sm">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin categoría</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/productos"
          className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-border bg-card text-[13px] font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
        >
          {totalSesion > 0 ? `Listo (${totalSesion})` : 'Cancelar'}
        </Link>

        <Button
          onClick={handleGuardar}
          disabled={isPending || !form.nombre.trim()}
          className="glow-primary gap-2"
        >
          {isPending ? 'Guardando...' : 'Guardar y siguiente →'}
        </Button>
      </div>

      {/* Hint teclado */}
      <p className="text-[11px] text-muted-foreground/40 text-center">
        Enter avanza entre campos · Enter en Stock guarda
      </p>

      {/* Scanner modal */}
      <BarcodeScannerModal
        open={scannerAbierto}
        onClose={() => setScannerAbierto(false)}
        onDetected={(codigo) => {
          update('codigo', codigo.trim());
          setScannerAbierto(false);
          autocompletarDesdeOFF(codigo.trim());
          nombreRef.current?.focus();
        }}
      />
    </div>
  );
}

function normalizarNombre(s: string): string {
  const trimmed = s.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  if (trimmed === trimmed.toUpperCase() && /\p{L}/u.test(trimmed)) return trimmed;
  return trimmed.toLowerCase().replace(/(^|\s|\()\p{L}/gu, (m) => m.toUpperCase());
}
