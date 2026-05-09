'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const METODO_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  transferencia:   'Transferencia',
  tarjeta_debito:  'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  mercado_pago:    'Mercado Pago',
  cheque:          'Cheque',
  otro:            'Otro',
};

const PERIODO_LABEL: Record<string, string> = {
  hoy:        'Hoy',
  semana:     'Últimos 7 días',
  mes:        'Últimos 30 días',
  tres_meses: 'Últimos 3 meses',
};

type Props = {
  periodo: string;
  resumen: { total: number; cantidad: number; ticketPromedio: number };
  minorista: { total: number; cantidad: number };
  mayorista: { total: number; cantidad: number };
  porMetodo: { metodo: string; total: number; cantidad: number }[];
  topProductos: {
    nombre: string | null;
    categoria: string | null;
    totalCantidad: number;
    totalMonto: number;
  }[];
  dias: [string, { minorista: number; mayorista: number }][];
};

// Escapar valores para CSV (maneja comas, comillas, saltos de línea)
function csvVal(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Número con 2 decimales, coma decimal (formato Argentina para Excel)
function num(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

function buildCSV(props: Props): string {
  const { periodo, resumen, minorista, mayorista, porMetodo, topProductos, dias } = props;

  const now = new Date().toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const rows: string[] = [];

  const row = (...cells: (string | number | null | undefined)[]): string =>
    cells.map(csvVal).join(',');

  // ── Encabezado ───────────────────────────────────────────────────────────
  rows.push(row('REPORTE FARO SISTEMAS'));
  rows.push(row('Período', PERIODO_LABEL[periodo] ?? periodo));
  rows.push(row('Generado', now));
  rows.push('');

  // ── Resumen ───────────────────────────────────────────────────────────────
  rows.push(row('RESUMEN'));
  rows.push(row('Total ventas', num(resumen.total)));
  rows.push(row('Cantidad de operaciones', resumen.cantidad));
  rows.push(row('Ticket promedio', num(resumen.ticketPromedio)));
  rows.push(row('Ventas minorista', num(minorista.total)));
  rows.push(row('Operaciones minorista', minorista.cantidad));
  rows.push(row('Ventas mayorista', num(mayorista.total)));
  rows.push(row('Operaciones mayorista', mayorista.cantidad));
  rows.push('');

  // ── Ventas por día ────────────────────────────────────────────────────────
  rows.push(row('VENTAS POR DÍA'));
  rows.push(row('Fecha', 'Minorista', 'Mayorista', 'Total'));
  for (const [dia, vals] of dias) {
    const [y = '', m = '', d = ''] = dia.split('-');
    const fecha = `${d}/${m}/${y}`;
    const total = vals.minorista + vals.mayorista;
    rows.push(row(fecha, num(vals.minorista), num(vals.mayorista), num(total)));
  }
  rows.push('');

  // ── Métodos de pago ───────────────────────────────────────────────────────
  rows.push(row('MÉTODOS DE PAGO'));
  rows.push(row('Método', 'Monto', 'Cantidad', '% del total'));
  const totalMetodos = porMetodo.reduce((a, m) => a + m.total, 0);
  for (const m of porMetodo) {
    const pct = totalMetodos > 0 ? (m.total / totalMetodos) * 100 : 0;
    rows.push(row(
      METODO_LABEL[m.metodo] ?? m.metodo,
      num(m.total),
      m.cantidad,
      num(pct),
    ));
  }
  rows.push('');

  // ── Top productos ─────────────────────────────────────────────────────────
  rows.push(row('TOP PRODUCTOS'));
  rows.push(row('Producto', 'Categoría', 'Cantidad vendida', 'Monto total'));
  for (const p of topProductos) {
    rows.push(row(
      p.nombre ?? 'Sin nombre',
      p.categoria ?? '',
      num(p.totalCantidad),
      num(p.totalMonto),
    ));
  }

  return '﻿' + rows.join('\r\n'); // BOM UTF-8 para que Excel lo abra bien
}

export function ExportCsvButton(props: Props) {
  function handleExport() {
    const csv = buildCSV(props);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const fecha = new Date().toISOString().slice(0, 10);
    a.download = `reporte-faro-${props.periodo}-${fecha}.csv`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="h-8 gap-1.5 text-xs font-medium border-border/60 hover:border-border"
    >
      <Download className="h-3.5 w-3.5" />
      Exportar CSV
    </Button>
  );
}
