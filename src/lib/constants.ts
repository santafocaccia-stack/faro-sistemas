/**
 * Constantes compartidas entre server actions, componentes cliente y route handlers.
 * No importar desde Server Components directamente (usar los valores del schema cuando sea posible).
 */

export const METODO_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  transferencia:   'Transferencia',
  tarjeta_debito:  'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  mercado_pago:    'Mercado Pago',
  cheque:          'Cheque',
  otro:            'Otro',
};

export const ESTADO_VENTA_LABEL: Record<string, string> = {
  pagada:    'Pagada',
  pendiente: 'Pendiente',
  parcial:   'Parcial',
  anulada:   'Anulada',
};

export const PRESUPUESTO_ESTADO_LABEL: Record<string, string> = {
  borrador:  'Borrador',
  enviado:   'Enviado',
  aprobado:  'Aprobado',
  rechazado: 'Rechazado',
  vencido:   'Vencido',
};
