/**
 * Códigos de error tipados para server actions.
 *
 * El patrón existente { ok: false, error: string } se extiende con un `code`
 * que permite al cliente manejar casos específicos sin parsear el mensaje.
 *
 * Backward-compatible: `error` sigue siendo el mensaje legible para humanos.
 * Los clientes que solo muestran `error` no necesitan cambios.
 */

export type ErrorCode =
  // Validación
  | 'VALIDATION_ERROR'       // input inválido (schema/zod)
  | 'CAMPO_REQUERIDO'        // campo obligatorio vacío
  // Auth / acceso
  | 'NO_AUTORIZADO'          // sin sesión
  | 'SIN_PERMISO'            // sesión presente pero sin el permiso necesario
  // Recursos
  | 'NO_ENCONTRADO'          // entidad no existe o no pertenece al tenant
  | 'YA_EXISTE'              // violación de unicidad (email, slug, etc.)
  // Negocio
  | 'LIMITE_CREDITO'         // cliente superó su límite de crédito
  | 'SIN_STOCK'              // producto sin stock suficiente
  | 'ESTADO_INVALIDO'        // operación inválida para el estado actual
  // Idempotencia
  | 'OPERACION_DUPLICADA'    // idempotency key ya fue procesada (use el resultado cacheado)
  // Genérico
  | 'ERROR_INTERNO';         // error inesperado del servidor

/** Resultado de error con código tipado */
export type ErrorResult = {
  ok: false;
  error: string;     // mensaje legible para el usuario
  code: ErrorCode;
};

/** Resultado exitoso genérico */
export type OkResult<T = void> = T extends void
  ? { ok: true }
  : { ok: true } & T;

/** Resultado de un server action */
export type ActionResult<T = void> = OkResult<T> | ErrorResult;

/** Crea un resultado de error tipado */
export function err(code: ErrorCode, message: string): ErrorResult {
  return { ok: false, code, error: message };
}

/** Crea un resultado exitoso */
export function ok(): { ok: true };
export function ok<T extends object>(data: T): { ok: true } & T;
export function ok<T extends object>(data?: T): { ok: true } | ({ ok: true } & T) {
  if (data) return { ok: true, ...data };
  return { ok: true };
}
