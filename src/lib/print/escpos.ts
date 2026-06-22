/**
 * Motor ESC/POS — arma los bytes de un ticket para impresoras térmicas
 * (Bluetooth o USB). Independiente del transporte: devuelve un Uint8Array que
 * luego se envía por Web Bluetooth o WebUSB.
 *
 * Codepage CP850 (Multilingual Latin 1): cubre acentos y ñ del español.
 */

// Mapa de caracteres no-ASCII → byte en CP850.
const CP850: Record<string, number> = {
  'Ç': 128, 'ü': 129, 'é': 130, 'â': 131, 'ä': 132, 'à': 133, 'å': 134, 'ç': 135,
  'ê': 136, 'ë': 137, 'è': 138, 'ï': 139, 'î': 140, 'ì': 141, 'Ä': 142, 'Å': 143,
  'É': 144, 'æ': 145, 'Æ': 146, 'ô': 147, 'ö': 148, 'ò': 149, 'û': 150, 'ù': 151,
  'ÿ': 152, 'Ö': 153, 'Ü': 154, 'á': 160, 'í': 161, 'ó': 162, 'ú': 163, 'ñ': 164,
  'Ñ': 165, 'ª': 166, 'º': 167, '¿': 168, '¡': 173, '«': 174, '»': 175, '°': 248,
};

function encChar(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code < 128) return code;
  return CP850[ch] ?? 0x3f; // '?' para lo que no esté mapeado
}

function encode(text: string): number[] {
  return Array.from(text).map(encChar);
}

/** Builder encadenable de comandos ESC/POS. */
export class EscPos {
  private buf: number[] = [];

  raw(...b: number[]) { this.buf.push(...b); return this; }
  /** Reset + selección de codepage CP850. */
  init() { return this.raw(0x1b, 0x40).raw(0x1b, 0x74, 0x02); }
  text(s: string) { this.buf.push(...encode(s)); return this; }
  line(s = '') { return this.text(s).raw(0x0a); }
  align(a: 'left' | 'center' | 'right') {
    return this.raw(0x1b, 0x61, a === 'center' ? 1 : a === 'right' ? 2 : 0);
  }
  bold(on: boolean) { return this.raw(0x1b, 0x45, on ? 1 : 0); }
  /** Tamaño doble (alto y ancho) o normal. */
  size(big: boolean) { return this.raw(0x1d, 0x21, big ? 0x11 : 0x00); }
  feed(n = 1) { return this.raw(0x1b, 0x64, n); }
  cut() { return this.raw(0x1d, 0x56, 0x00); }
  bytes() { return new Uint8Array(this.buf); }
}

// ── Formato ─────────────────────────────────────────────────────────────────

/** "$1.234,50" usando solo ASCII (evita el NBSP que mete Intl). */
function money(n: number): string {
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  const miles = int!.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + '$' + miles + ',' + dec;
}

/** Cantidad: entero para unidades, 3 decimales para peso. */
function cant(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(3).replace('.', ',');
}

function fecha(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Fila "izquierda ........ derecha" en `ancho` columnas. Trunca la izquierda si no entra. */
function fila(izq: string, der: string, ancho: number): string {
  if (izq.length + der.length >= ancho) {
    izq = izq.slice(0, Math.max(0, ancho - der.length - 1));
    return izq + ' ' + der;
  }
  return izq + ' '.repeat(ancho - izq.length - der.length) + der;
}

export type TicketLinea = {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type TicketData = {
  negocioNombre: string;
  negocioCuit?: string | null;
  negocioDireccion?: string | null;
  negocioTelefono?: string | null;
  numero: number;
  fecha: Date;
  clienteNombre?: string | null;
  metodoPago?: string | null;
  lineas: TicketLinea[];
  subtotal: number;
  descuento?: number;
  total: number;
  /** Caracteres por línea: 32 para 58mm, 48 para 80mm (default). */
  ancho?: 32 | 48;
};

/** Arma el ticket completo en bytes ESC/POS. */
export function construirTicket(d: TicketData): Uint8Array {
  const W = d.ancho ?? 48;
  const p = new EscPos().init();

  // Encabezado
  p.align('center').bold(true).size(true).line(d.negocioNombre).size(false).bold(false);
  if (d.negocioDireccion) p.line(d.negocioDireccion);
  if (d.negocioTelefono) p.line('Tel: ' + d.negocioTelefono);
  if (d.negocioCuit) p.line('CUIT: ' + d.negocioCuit);
  p.line('-'.repeat(W));

  // Datos del comprobante
  p.align('left');
  p.line(`Ticket #${String(d.numero).padStart(5, '0')}`);
  p.line(fecha(d.fecha));
  if (d.clienteNombre) p.line('Cliente: ' + d.clienteNombre);
  p.line('-'.repeat(W));

  // Ítems
  for (const l of d.lineas) {
    p.line(l.descripcion);
    p.line(fila(`  ${cant(l.cantidad)} x ${money(l.precioUnitario)}`, money(l.subtotal), W));
  }
  p.line('-'.repeat(W));

  // Totales
  if (d.descuento && d.descuento > 0) {
    p.line(fila('Subtotal', money(d.subtotal), W));
    p.line(fila('Descuento', '-' + money(d.descuento), W));
  }
  // TOTAL en doble tamaño → ancho efectivo a la mitad
  p.bold(true).size(true).line(fila('TOTAL', money(d.total), Math.floor(W / 2))).size(false).bold(false);
  if (d.metodoPago) p.line('Pago: ' + d.metodoPago);

  // Pie
  p.align('center').feed(1).line('Gracias por su compra').line('Comprobante no fiscal');
  p.feed(3).cut();

  return p.bytes();
}
