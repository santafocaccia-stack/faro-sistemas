/**
 * Datos del rediseño de la landing, por rubro. Es copy de marketing (curado),
 * no la fuente de verdad del producto — alineado con los rubros de
 * `src/lib/planes.ts` y la navegación real de `src/lib/nav.ts`.
 * Importable desde el cliente (sin deps de servidor).
 */
import {
  ShoppingCart, BookOpen, FileText, Check, MapPin, Landmark, type LucideIcon,
} from 'lucide-react';
import type { PlanId } from '@/lib/planes';

export type DemoItem = { nombre: string; precio: number };

export type Kpi = {
  l: string;     // etiqueta
  v: number;     // valor numérico (para el count-up)
  money: boolean;// formatear como $ o como entero
  t: string;     // texto de tendencia
  hl?: boolean;  // tarjeta destacada (acento)
  down?: boolean;// tendencia "negativa" (rojo, sin flecha)
};

export type Row = {
  icon: LucideIcon;
  a: string;                       // título de la fila
  b: string;                       // subtítulo
  v: string;                       // valor (ya formateado)
  tag: [ 'ok' | 'warn' | 'bad', string ];
};

export type RubroDemo = {
  id: PlanId;        // coincide con el plan → deriva nav real y si tiene POS
  chip: string;      // etiqueta del chip
  acento: string;    // color de acento (hex)
  heroWord: string;  // palabra que se intercambia en el H1
  heroSub: string;   // subtítulo del hero
  tenant: string;    // nombre del negocio demo
  planLabel: string; // nombre corto del plan (badge del sidebar)
  user: string;      // usuario demo
  title: string;     // título de la pantalla activa
  kpis: Kpi[];
  chart: number[];   // 7 valores (L..D)
  peak: number;      // índice de la barra destacada
  listTitle: string;
  rows: Row[];
  // Demo del POS
  accion: string;     // texto del botón de cobro
  accionWord: string; // verbo para la prosa ("scan, scan, cobrar")
  caja: string;       // "Caja · Kiosco"
  items: DemoItem[];
  incluye: string[];
};

/** Texto oscuro para usar SOBRE los acentos (todos son tonos medios/vivos). */
export const SOBRE_ACENTO = '#1a1408';

export const RUBROS: RubroDemo[] = [
  {
    id: 'market',
    chip: 'Kiosco',
    acento: '#ff7518',
    heroWord: 'Tu kiosco.',
    heroSub:
      'Cobrás con el escáner, llevás el stock y el fiado al día, y ves cuánto vendiste. Desde el mostrador o el celular.',
    tenant: 'Kiosco Don José',
    planLabel: 'Market',
    user: 'donjose',
    title: 'Inicio',
    kpis: [
      { l: 'Vendido hoy', v: 142300, money: true, t: '+18% vs ayer', hl: true },
      { l: 'Ventas', v: 37, money: false, t: '+6 que ayer' },
      { l: 'Ticket promedio', v: 3846, money: true, t: '+4%' },
      { l: 'Fiado por cobrar', v: 28400, money: true, t: '5 clientes', down: true },
    ],
    chart: [62, 48, 71, 55, 83, 96, 142],
    peak: 6,
    listTitle: 'Últimas ventas',
    rows: [
      { icon: ShoppingCart, a: 'Coca 500 + Alfajor + Yerba', b: 'hace 2 min · efectivo', v: '$5.900', tag: ['ok', 'OK'] },
      { icon: ShoppingCart, a: 'Cigarrillos 20u', b: 'hace 9 min · débito', v: '$2.500', tag: ['ok', 'OK'] },
      { icon: BookOpen, a: 'Fiado — Marta G.', b: 'hace 21 min · cuenta corriente', v: '$3.200', tag: ['warn', 'Fiado'] },
      { icon: ShoppingCart, a: 'Agua + Caramelos x10', b: 'hace 34 min · efectivo', v: '$1.100', tag: ['ok', 'OK'] },
    ],
    accion: 'Cobrar',
    accionWord: 'cobrar',
    caja: 'Caja · Kiosco',
    items: [
      { nombre: 'Alfajor Guaymallén', precio: 900 },
      { nombre: 'Coca 500ml', precio: 1200 },
      { nombre: 'Yerba 1kg', precio: 3800 },
      { nombre: 'Cigarrillos 20u', precio: 2500 },
      { nombre: 'Caramelos x10', precio: 300 },
      { nombre: 'Agua 500ml', precio: 800 },
    ],
    incluye: ['Escaneás y cobrás', 'Stock siempre al día', 'Fiado de cada cliente', 'Cuánto vendiste hoy'],
  },
  {
    id: 'balanza',
    chip: 'Carnicería',
    acento: '#c763cf',
    heroWord: 'Tu carnicería.',
    heroSub:
      'Vendés al peso con la balanza, anotás el fiado y sabés cuánto entró. Sin cuaderno ni cuentas a mano.',
    tenant: 'Carnicería El Buen Corte',
    planLabel: 'Balanza',
    user: 'elbuencorte',
    title: 'Inicio',
    kpis: [
      { l: 'Vendido hoy', v: 389500, money: true, t: '+12% vs ayer', hl: true },
      { l: 'Ventas', v: 52, money: false, t: '+9 que ayer' },
      { l: 'Kilos vendidos', v: 148, money: false, t: 'kg hoy' },
      { l: 'Fiado por cobrar', v: 64200, money: true, t: '8 clientes', down: true },
    ],
    chart: [210, 180, 260, 240, 310, 355, 389],
    peak: 6,
    listTitle: 'Últimas ventas',
    rows: [
      { icon: ShoppingCart, a: 'Asado 2,4kg', b: 'hace 1 min · $8.800/kg', v: '$21.120', tag: ['ok', 'OK'] },
      { icon: ShoppingCart, a: 'Pollo 1,8kg', b: 'hace 7 min · efectivo', v: '$7.560', tag: ['ok', 'OK'] },
      { icon: BookOpen, a: 'Fiado — Don Raúl', b: 'hace 15 min · cuenta corriente', v: '$14.300', tag: ['warn', 'Fiado'] },
      { icon: ShoppingCart, a: 'Milanesa 1,1kg', b: 'hace 26 min · débito', v: '$9.900', tag: ['ok', 'OK'] },
    ],
    accion: 'Cobrar',
    accionWord: 'cobrar',
    caja: 'Caja · Carnicería',
    items: [
      { nombre: 'Bola de lomo /kg', precio: 9500 },
      { nombre: 'Vacío /kg', precio: 11000 },
      { nombre: 'Asado /kg', precio: 8800 },
      { nombre: 'Pollo /kg', precio: 4200 },
      { nombre: 'Milanesa /kg', precio: 9000 },
      { nombre: 'Chorizo /kg', precio: 6500 },
    ],
    incluye: ['Vendés por kilo', 'Con balanza digital', 'Fiado al día', 'Cuánto entró hoy'],
  },
  {
    id: 'servicios',
    chip: 'Servicios',
    acento: '#5b8ce0',
    heroWord: 'Tus servicios.',
    heroSub:
      'Pasás presupuestos en un toque y los mandás por WhatsApp. Llevás la agenda y los cobros de cada cliente.',
    tenant: 'Frío Sur Climatización',
    planLabel: 'Servicios',
    user: 'friosur',
    title: 'Inicio',
    kpis: [
      { l: 'Cobrado este mes', v: 1240000, money: true, t: '+22% vs mayo', hl: true },
      { l: 'Trabajos del mes', v: 18, money: false, t: '+3 que mayo' },
      { l: 'Presupuestos abiertos', v: 7, money: false, t: 'esperando OK' },
      { l: 'Por cobrar', v: 310000, money: true, t: '4 trabajos', down: true },
    ],
    chart: [180, 220, 160, 290, 240, 310, 380],
    peak: 6,
    listTitle: 'Presupuestos recientes',
    rows: [
      { icon: FileText, a: 'Instalación split 3000f', b: 'Familia Pérez · hoy', v: '$185.000', tag: ['warn', 'Enviado'] },
      { icon: Check, a: 'Service A/A — oficina', b: 'Estudio Lemos · ayer', v: '$48.000', tag: ['ok', 'Aprobado'] },
      { icon: FileText, a: 'Cambio de compresor', b: 'Bar La Esquina · ayer', v: '$92.000', tag: ['warn', 'Enviado'] },
      { icon: Check, a: 'Mano de obra + materiales', b: 'Sra. Díaz · 2 días', v: '$31.000', tag: ['ok', 'Cobrado'] },
    ],
    accion: 'Armar presupuesto',
    accionWord: 'presupuestar',
    caja: 'Presupuesto · Servicios',
    items: [
      { nombre: 'Mano de obra', precio: 25000 },
      { nombre: 'Visita técnica', precio: 12000 },
      { nombre: 'Repuesto', precio: 8000 },
      { nombre: 'Instalación split', precio: 45000 },
      { nombre: 'Service A/A', precio: 18000 },
      { nombre: 'Materiales', precio: 6000 },
    ],
    incluye: ['Presupuestos por WhatsApp', 'Agenda de trabajos', 'Tus clientes ordenados', 'Lo que te deben'],
  },
  {
    id: 'atmosfericos',
    chip: 'Atmosféricos',
    acento: '#1fb4c9',
    heroWord: 'Tu camión.',
    heroSub:
      'Organizás los pedidos del día, salís con la ruta lista y registrás cada cobro. Todo el camión, ordenado.',
    tenant: 'Atmosféricos del Litoral',
    planLabel: 'Atmosféricos',
    user: 'litoral',
    title: 'Pedidos del día',
    kpis: [
      { l: 'Pedidos de hoy', v: 9, money: false, t: '2 urgentes', hl: true },
      { l: 'En ruta', v: 3, money: false, t: 'camión en viaje' },
      { l: 'Cobrado hoy', v: 432000, money: true, t: '+15% vs ayer' },
      { l: 'Por cobrar', v: 180000, money: true, t: '3 clientes', down: true },
    ],
    chart: [5, 7, 4, 8, 6, 9, 9],
    peak: 6,
    listTitle: 'Ruta de hoy',
    rows: [
      { icon: MapPin, a: 'Destape pozo — Av. Mitre 1240', b: '09:30 · próxima parada', v: '$35.000', tag: ['warn', 'En ruta'] },
      { icon: MapPin, a: 'Cámara séptica — B° Norte', b: '11:00 · agendado', v: '$55.000', tag: ['ok', 'Pendiente'] },
      { icon: MapPin, a: 'Urgencia 24h — Ruta 11 km4', b: 'hecho 08:10', v: '$60.000', tag: ['ok', 'Cobrado'] },
      { icon: MapPin, a: 'Pozo ciego — Las Lomas', b: '14:30 · agendado', v: '$40.000', tag: ['ok', 'Pendiente'] },
    ],
    accion: 'Agendar pedido',
    accionWord: 'agendar',
    caja: 'Pedidos · Atmosféricos',
    items: [
      { nombre: 'Destape de pozo', precio: 35000 },
      { nombre: 'Camión atmosférico', precio: 48000 },
      { nombre: 'Pozo ciego', precio: 40000 },
      { nombre: 'Cámara séptica', precio: 55000 },
      { nombre: 'Urgencia 24h', precio: 60000 },
      { nombre: 'Visita', precio: 15000 },
    ],
    incluye: ['Pedidos del día', 'Ruta en el mapa', 'Historial de cada cliente', 'Cobros al día'],
  },
  {
    id: 'prestamista',
    chip: 'Préstamos',
    acento: '#25a87d',
    heroWord: 'Tu cartera.',
    heroSub:
      'Llevás cada préstamo, las cuotas y lo que está en mora. Sabés a quién cobrarle hoy y cuánto te deben.',
    tenant: 'Créditos Aurora',
    planLabel: 'Préstamos',
    user: 'aurora',
    title: 'Inicio',
    kpis: [
      { l: 'Cartera activa', v: 4850000, money: true, t: '64 créditos', hl: true },
      { l: 'A cobrar hoy', v: 96000, money: true, t: '11 cuotas' },
      { l: 'En mora', v: 142000, money: true, t: '6 clientes', down: true },
      { l: 'Cobrado este mes', v: 1180000, money: true, t: '+9% vs mayo' },
    ],
    chart: [180, 210, 240, 260, 290, 330, 118],
    peak: 5,
    listTitle: 'Cuotas de hoy',
    rows: [
      { icon: Landmark, a: 'Cuota 4/12 — Gómez', b: 'vence hoy · semanal', v: '$12.000', tag: ['warn', 'Hoy'] },
      { icon: Landmark, a: 'Cuota 8/10 — Ferreyra', b: 'vence hoy · semanal', v: '$8.500', tag: ['warn', 'Hoy'] },
      { icon: Landmark, a: 'Cuota 2/6 — Sosa', b: 'atrasada 4 días', v: '$9.000', tag: ['bad', 'Mora'] },
      { icon: Check, a: 'Cuota 5/12 — Ibáñez', b: 'pagada hoy 10:20', v: '$11.000', tag: ['ok', 'Pagada'] },
    ],
    accion: 'Registrar',
    accionWord: 'registrar',
    caja: 'Cartera · Préstamos',
    items: [
      { nombre: 'Préstamo nuevo', precio: 100000 },
      { nombre: 'Cuota semanal', precio: 12000 },
      { nombre: 'Pago de cuota', precio: 8000 },
      { nombre: 'Refinanciación', precio: 50000 },
      { nombre: 'Interés mensual', precio: 9000 },
      { nombre: 'Mora', precio: 3000 },
    ],
    incluye: ['Cuotas automáticas', 'Quién está en mora', 'Tu cartera completa', 'Pagos al día'],
  },
];

export const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
    Math.round(n),
  );

/** rgba con alpha a partir de un hex #rrggbb (para los halos de acento). */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
