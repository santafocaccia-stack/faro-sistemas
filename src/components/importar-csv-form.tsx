'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2, AlertCircle, ChevronLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importarProductosCSV, type CsvFila } from '@/server/actions/productos';

type FilaParsada = CsvFila & { _fila: number; _error?: string };

type Estado = 'idle' | 'preview' | 'done';

const TEMPLATE_CSV = `nombre,precio_minorista,precio_mayorista,codigo,categoria
Coca Cola 500ml,1500,1200,7790001,Bebidas
Agua Mineral 1L,800,650,,Bebidas
Alfajor Triple,450,380,77912345,
`;

const COLUMNAS_REQUERIDAS = ['nombre', 'precio_minorista'] as const;
const COLUMNAS_OPCIONALES = ['precio_mayorista', 'codigo', 'categoria'] as const;

export function ImportarCsvForm() {
  const [isPending, startTransition] = useTransition();
  const [estado, setEstado] = useState<Estado>('idle');
  const [filas, setFilas] = useState<FilaParsada[]>([]);
  const [resultado, setResultado] = useState<{ insertados: number; errores: { fila: number; error: string }[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('El archivo debe ser .csv'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const texto = ev.target?.result as string;
      const parsed = parsearCSV(texto);
      if ('error' in parsed) { toast.error(parsed.error); return; }
      setFilas(parsed);
      setEstado('preview');
    };
    reader.readAsText(file, 'utf-8');
    // Reset input para permitir re-subir el mismo archivo
    e.target.value = '';
  }

  function handleImportar() {
    const filasValidas = filas.filter((f) => !f._error);
    if (filasValidas.length === 0) { toast.error('No hay filas válidas para importar'); return; }

    startTransition(async () => {
      const result = await importarProductosCSV(
        filasValidas.map(({ _fila: _, _error: __, ...data }) => data)
      );
      setResultado({ insertados: result.insertados, errores: result.errores });
      setEstado('done');
      if (result.insertados > 0) {
        toast.success(`${result.insertados} productos importados`);
      }
    });
  }

  function handleReset() {
    setEstado('idle');
    setFilas([]);
    setResultado(null);
  }

  function descargarTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-productos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filasValidas = filas.filter((f) => !f._error);
  const filasConError = filas.filter((f) => f._error);

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
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">Importar desde CSV</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-9">
          Para migraciones desde otra herramienta. Máx. 500 productos por archivo.
        </p>
      </div>

      {estado === 'idle' && (
        <>
          {/* Formato */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Formato del archivo</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-1.5 pr-4 text-muted-foreground font-semibold">Columna</th>
                    <th className="text-left py-1.5 pr-4 text-muted-foreground font-semibold">Requerida</th>
                    <th className="text-left py-1.5 text-muted-foreground font-semibold">Ejemplo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {[
                    { col: 'nombre', req: true, ej: 'Coca Cola 500ml' },
                    { col: 'precio_minorista', req: true, ej: '1500' },
                    { col: 'precio_mayorista', req: false, ej: '1200 (si vacío, usa precio_minorista)' },
                    { col: 'codigo', req: false, ej: '7790001234' },
                    { col: 'categoria', req: false, ej: 'Bebidas (se crea si no existe)' },
                  ].map(({ col, req, ej }) => (
                    <tr key={col}>
                      <td className="py-1.5 pr-4 font-mono text-foreground">{col}</td>
                      <td className="py-1.5 pr-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${req ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {req ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{ej}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={descargarTemplate}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar plantilla CSV
            </button>
          </div>

          {/* Upload */}
          <div
            onClick={() => inputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-card hover:bg-primary/5 p-10 flex flex-col items-center gap-3 cursor-pointer transition-all"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary" strokeWidth={1.75} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Subí tu archivo CSV</p>
              <p className="text-xs text-muted-foreground mt-0.5">Hacé click o arrastrá el archivo</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        </>
      )}

      {estado === 'preview' && (
        <>
          {/* Resumen */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {filasValidas.length} válidas
            </div>
            {filasConError.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-3.5 w-3.5" />
                {filasConError.length} con errores
              </div>
            )}
          </div>

          {/* Preview tabla */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">#</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Nombre</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">P. Min</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">P. May</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Código</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Categoría</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filas.slice(0, 200).map((f) => (
                    <tr key={f._fila} className={f._error ? 'bg-destructive/5' : ''}>
                      <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{f._fila}</td>
                      <td className="px-3 py-1.5 font-medium max-w-[180px] truncate">{f.nombre}</td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums">{f.precioMinorista}</td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-muted-foreground">{f.precioMayorista || '—'}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{f.codigo || '—'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{f.categoriaNombre || '—'}</td>
                      <td className="px-3 py-1.5">
                        {f._error
                          ? <span className="text-destructive">{f._error}</span>
                          : <span className="text-emerald-400">✓</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filas.length > 200 && (
              <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
                Mostrando 200 de {filas.length} filas — todas se importarán
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cambiar archivo
            </button>
            <Button
              onClick={handleImportar}
              disabled={isPending || filasValidas.length === 0}
              className="glow-primary gap-2"
            >
              {isPending ? 'Importando...' : `Importar ${filasValidas.length} productos`}
            </Button>
          </div>
        </>
      )}

      {estado === 'done' && resultado && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {resultado.insertados > 0 && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold">{resultado.insertados} productos importados</p>
                <p className="text-sm text-muted-foreground">Ya están disponibles en el catálogo</p>
              </div>
            </div>
          )}

          {resultado.errores.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">{resultado.errores.length} errores:</p>
              <ul className="space-y-1">
                {resultado.errores.map((e, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    {e.fila > 0 ? `Fila ${e.fila}: ` : ''}{e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard/productos"
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all glow-primary"
            >
              Ver productos
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center h-9 px-4 rounded-lg border border-border text-[13px] font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Parser CSV ────────────────────────────────────────────────────────────────

function parsearCSV(texto: string): FilaParsada[] | { error: string } {
  const lineas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lineas.length < 2) return { error: 'El archivo debe tener al menos una fila de datos (más el encabezado)' };

  const headers = parsearLinea(lineas[0]!).map((h) => h.toLowerCase().trim());

  for (const col of COLUMNAS_REQUERIDAS) {
    if (!headers.includes(col)) {
      return { error: `Columna requerida "${col}" no encontrada. Encabezados detectados: ${headers.join(', ')}` };
    }
  }

  const idx = (col: string) => headers.indexOf(col);

  return lineas.slice(1).map((linea, i) => {
    const celdas = parsearLinea(linea);
    const fila = i + 2;

    const nombre = celdas[idx('nombre')]?.trim() ?? '';
    const precioMinorista = celdas[idx('precio_minorista')]?.trim() ?? '';
    const precioMayorista = celdas[idx('precio_mayorista')]?.trim() || undefined;
    const codigo = celdas[idx('codigo')]?.trim() || undefined;
    const categoriaNombre = celdas[idx('categoria')]?.trim() || undefined;

    let _error: string | undefined;
    if (!nombre) _error = 'Nombre vacío';
    else if (!precioMinorista || isNaN(Number(precioMinorista)) || Number(precioMinorista) < 0) _error = 'Precio minorista inválido';
    else if (precioMayorista && (isNaN(Number(precioMayorista)) || Number(precioMayorista) < 0)) _error = 'Precio mayorista inválido';

    return { _fila: fila, nombre, precioMinorista, precioMayorista, codigo, categoriaNombre, _error };
  });
}

function parsearLinea(linea: string): string[] {
  const resultado: string[] = [];
  let actual = '';
  let enComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i]!;
    if (c === '"') {
      if (enComillas && linea[i + 1] === '"') { actual += '"'; i++; }
      else enComillas = !enComillas;
    } else if (c === ',' && !enComillas) {
      resultado.push(actual);
      actual = '';
    } else {
      actual += c;
    }
  }
  resultado.push(actual);
  return resultado;
}
