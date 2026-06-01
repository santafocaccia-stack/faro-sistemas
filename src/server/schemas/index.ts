/**
 * Schemas Zod compartidos para validación de inputs en server actions.
 *
 * Patrón de uso en cualquier action:
 *
 *   import { productoInputSchema } from '@/server/schemas';
 *   export async function crearProducto(input: unknown) {
 *     const data = productoInputSchema.parse(input);  // tira si es inválido
 *     ...
 *   }
 *
 * Si querés un error más amigable usar `.safeParse(input)` y formatear el error.
 */
import { z } from 'zod';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Numérico-como-string (Drizzle numeric viene como string). Validates >= 0. */
const numericString = (msg = 'Número inválido') =>
  z.string().refine((s) => s !== '' && !isNaN(Number(s)) && Number(s) >= 0, msg);

/**
 * Numérico opcional — string con número válido, null, o undefined.
 * Convierte string vacío automáticamente a null (común al venir de un input vacío).
 */
const optionalNumericString = (msg = 'Número inválido') =>
  z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.string().refine((s) => !isNaN(Number(s)) && Number(s) >= 0, msg).nullable(),
  );

/** Numérico-como-string que admite negativos (ej: descuentos). */
const numericStringSigned = (msg = 'Número inválido') =>
  z.string().refine((s) => s !== '' && !isNaN(Number(s)), msg);

const uuid = z.string().uuid('ID inválido');

// ── Productos ────────────────────────────────────────────────────────────────

export const vinculoProveedorSchema = z.object({
  proveedorId: uuid,
  precioCosto: numericString('Precio de costo inválido'),
  markupMayorista: z.string().nullable().optional(),
  markupMinorista: z.string().nullable().optional(),
  esPrincipal: z.boolean(),
});

export const productoInputSchema = z.object({
  codigo: z.string().trim().max(60).nullable().optional(),
  codigoPlu: z.string().trim().max(8).nullable().optional(),
  nombre: z.string().trim().min(1, 'El nombre es requerido').max(120, 'Máximo 120 caracteres'),
  descripcion: z.string().trim().max(500).nullable().optional(),
  categoriaId: uuid.nullable().optional(),
  grupoVarianteId: uuid.nullable().optional(),
  tipoUnidad: z.enum(['por_kg', 'por_unidad'], { message: 'Tipo de unidad inválido' }),
  stockActual: numericString('Stock inválido'),
  stockMinimo: optionalNumericString('Stock mínimo inválido').optional(),
  costoPromedio: numericString('Costo inválido'),
  precioMayorista: numericString('Precio mayorista inválido'),
  precioMinorista: numericString('Precio minorista inválido'),
  activo: z.boolean(),
  vinculos: z.array(vinculoProveedorSchema).optional(),
});

export const ajustarStockSchema = z.object({
  productoId: uuid,
  tipo: z.enum(['entrada', 'salida'], { message: 'Tipo de ajuste inválido' }),
  cantidad: z.string().refine(
    (s) => s !== '' && !isNaN(Number(s)) && Number(s) > 0,
    'La cantidad debe ser mayor que cero',
  ),
});

export const fijarStockSchema = z.object({
  productoId: uuid,
  nuevoStock: numericString('Stock inválido'),
});

// ── Ventas ───────────────────────────────────────────────────────────────────

export const lineaVentaSchema = z.object({
  productoId: uuid.nullable(),
  descripcion: z.string().trim().min(1, 'Descripción requerida').max(200),
  cantidad: z.string().refine(
    (s) => s !== '' && !isNaN(Number(s)) && Number(s) > 0,
    'Cantidad debe ser mayor que cero',
  ),
  precioUnitario: numericString('Precio unitario inválido'),
  subtotal: numericString('Subtotal inválido'),
});

export const nuevaVentaSchema = z.object({
  canal: z.enum(['mayorista', 'minorista'], { message: 'Canal inválido' }),
  clienteId: uuid,
  tipoPago: z.enum(['contado', 'cuenta_corriente'], { message: 'Tipo de pago inválido' }),
  metodoPago: z.enum([
    'efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito', 'mercado_pago',
  ]).optional(),
  lineas: z.array(lineaVentaSchema).min(1, 'La venta debe tener al menos un ítem'),
  descuento: numericStringSigned('Descuento inválido').optional(),
  notas: z.string().trim().max(500).optional(),
});

// ── Clientes ─────────────────────────────────────────────────────────────────

export const clienteInputSchema = z.object({
  razonSocial: z.string().trim().min(1, 'La razón social es requerida').max(200),
  tipo: z.enum(['minorista', 'mayorista', 'ambos']),
  cuit: z.string().trim().max(20).nullable().optional(),
  condicionIva: z.enum([
    'responsable_inscripto',
    'monotributo',
    'exento',
    'consumidor_final',
  ]).optional(),
  esConsumidorFinal: z.boolean().optional(),
  habilitaCuentaCorriente: z.boolean().optional(),
  limiteCredito: numericString('Límite de crédito inválido').nullable().optional(),
  telefono: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email('Email inválido').nullable().optional().or(z.literal('')),
  direccion: z.string().trim().max(200).nullable().optional(),
  notas: z.string().trim().max(500).nullable().optional(),
});

// ── Helpers de error ─────────────────────────────────────────────────────────

/**
 * Convierte un ZodError en un mensaje legible para mostrar al usuario.
 *   "Nombre: El nombre es requerido | Precio: Número inválido"
 */
export function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => {
      const path = i.path.length > 0 ? `${i.path.join('.')}: ` : '';
      return `${path}${i.message}`;
    })
    .join(' · ');
}
