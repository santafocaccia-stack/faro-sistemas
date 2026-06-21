/**
 * Datos del demo interactivo de la landing, por rubro. Es copy de marketing
 * (curado), no la fuente de verdad del producto — alineado con los rubros de
 * `src/lib/planes.ts`. Importable desde el cliente (sin deps de servidor).
 */
export type DemoItem = { nombre: string; precio: number };

export type RubroDemo = {
  id: string;
  nombre: string; // etiqueta del chip
  acento: string; // color de acento (hex)
  eyebrow: string;
  titulo: string;
  sub: string;
  accion: string; // texto del botón de cobro
  caja: string; // "Caja · Kiosco"
  items: DemoItem[];
  incluye: string[];
};

/** Texto oscuro para usar SOBRE los acentos (todos son tonos medios/vivos). */
export const SOBRE_ACENTO = '#1a1408';

export const RUBROS: RubroDemo[] = [
  {
    id: 'market',
    nombre: 'Kiosco',
    acento: '#ff7518',
    eyebrow: 'Sistema de gestión para tu negocio',
    titulo: 'Tu kiosco, cobrado en segundos.',
    sub: 'Punto de venta con lector de códigos, control de stock y fiado de clientes.',
    accion: 'Cobrar',
    caja: 'Caja · Kiosco',
    items: [
      { nombre: 'Alfajor Guaymallén', precio: 900 },
      { nombre: 'Coca 500ml', precio: 1200 },
      { nombre: 'Yerba 1kg', precio: 3800 },
      { nombre: 'Cigarrillos 20u', precio: 2500 },
      { nombre: 'Caramelos x10', precio: 300 },
      { nombre: 'Agua 500ml', precio: 800 },
    ],
    incluye: ['Lector de códigos', 'Stock en tiempo real', 'Fiado de clientes', 'Reportes de ventas'],
  },
  {
    id: 'balanza',
    nombre: 'Carnicería',
    acento: '#c763cf',
    eyebrow: 'Sistema de gestión para tu negocio',
    titulo: 'Tu carnicería, vendida al peso.',
    sub: 'Balanza integrada, precio por kilo y cuenta corriente de clientes.',
    accion: 'Cobrar',
    caja: 'Caja · Carnicería',
    items: [
      { nombre: 'Bola de lomo /kg', precio: 9500 },
      { nombre: 'Vacío /kg', precio: 11000 },
      { nombre: 'Asado /kg', precio: 8800 },
      { nombre: 'Pollo /kg', precio: 4200 },
      { nombre: 'Milanesa /kg', precio: 9000 },
      { nombre: 'Chorizo /kg', precio: 6500 },
    ],
    incluye: ['Venta por kilogramo', 'Balanza digital', 'Cuenta corriente', 'Reportes'],
  },
  {
    id: 'servicios',
    nombre: 'Servicios',
    acento: '#5b8ce0',
    eyebrow: 'Sistema de gestión para tu negocio',
    titulo: 'Tus servicios, presupuestados al toque.',
    sub: 'Presupuestos en PDF, seguimiento de clientes y registro de cobros.',
    accion: 'Armar presupuesto',
    caja: 'Presupuesto · Servicios',
    items: [
      { nombre: 'Mano de obra', precio: 25000 },
      { nombre: 'Visita técnica', precio: 12000 },
      { nombre: 'Repuesto', precio: 8000 },
      { nombre: 'Instalación split', precio: 45000 },
      { nombre: 'Service A/A', precio: 18000 },
      { nombre: 'Materiales', precio: 6000 },
    ],
    incluye: ['Presupuestos en PDF', 'Plantillas de servicio', 'Clientes', 'Historial de cobros'],
  },
  {
    id: 'atmosfericos',
    nombre: 'Atmosféricos',
    acento: '#1fb4c9',
    eyebrow: 'Sistema de gestión para tu negocio',
    titulo: 'Tus pozos, en ruta y al día.',
    sub: 'Pedidos del día, ruta optimizada en Google Maps y cobros por cliente.',
    accion: 'Agendar pedido',
    caja: 'Pedidos · Atmosféricos',
    items: [
      { nombre: 'Destape de pozo', precio: 35000 },
      { nombre: 'Camión atmosférico', precio: 48000 },
      { nombre: 'Pozo ciego', precio: 40000 },
      { nombre: 'Cámara séptica', precio: 55000 },
      { nombre: 'Urgencia 24h', precio: 60000 },
      { nombre: 'Visita', precio: 15000 },
    ],
    incluye: ['Pedidos del día', 'Ruta en Google Maps', 'Historial por cliente', 'Cobros'],
  },
  {
    id: 'prestamista',
    nombre: 'Préstamos',
    acento: '#25a87d',
    eyebrow: 'Sistema de gestión para tu negocio',
    titulo: 'Tu cartera de créditos, ordenada.',
    sub: 'Cuotas automáticas, cálculo de mora y total prestado, a cobrar y en mora.',
    accion: 'Registrar',
    caja: 'Cartera · Préstamos',
    items: [
      { nombre: 'Préstamo nuevo', precio: 100000 },
      { nombre: 'Cuota semanal', precio: 12000 },
      { nombre: 'Pago de cuota', precio: 8000 },
      { nombre: 'Refinanciación', precio: 50000 },
      { nombre: 'Interés mensual', precio: 9000 },
      { nombre: 'Mora', precio: 3000 },
    ],
    incluye: ['Cronograma de cuotas', 'Cálculo de mora', 'Cartera total', 'Pagos'],
  },
];

export const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Math.round(n));
