/**
 * Cifrado at-rest de los tokens OAuth de Mercado Pago (AES-256-GCM).
 *
 * Formato en DB: `enc:v1:<iv b64url>:<tag b64url>:<ciphertext b64url>`
 * Clave: env MP_TOKEN_ENC_KEY (32 bytes en base64; generar con
 * `openssl rand -base64 32` y cargar en Vercel + .env.local).
 *
 * Compatibilidad: los valores existentes en texto plano se siguen leyendo
 * (descifrar algo que no empieza con `enc:v1:` lo devuelve tal cual) y se
 * re-cifran en la próxima escritura (refresh del token o reconexión).
 *
 * Sin clave configurada: en producción cifrar LANZA (no se aceptan secretos
 * nuevos en texto plano); en dev se avisa y se guarda plano para no trabar.
 */
import crypto from 'node:crypto';

const PREFIJO = 'enc:v1:';

function clave(): Buffer | null {
  const raw = process.env.MP_TOKEN_ENC_KEY;
  if (!raw) return null;
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('MP_TOKEN_ENC_KEY debe ser 32 bytes en base64');
  return k;
}

export function cifrarToken(plano: string): string {
  const k = clave();
  if (!k) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MP_TOKEN_ENC_KEY no configurada — no se guardan tokens MP sin cifrar en producción');
    }
    console.warn('[mp/cifrado] MP_TOKEN_ENC_KEY no configurada (dev) — token guardado SIN cifrar');
    return plano;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([cipher.update(plano, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIJO}${iv.toString('base64url')}:${tag.toString('base64url')}:${ct.toString('base64url')}`;
}

export function descifrarToken(guardado: string | null): string | null {
  if (!guardado) return null;
  if (!guardado.startsWith(PREFIJO)) return guardado; // legado en texto plano
  const k = clave();
  if (!k) throw new Error('Hay tokens MP cifrados pero MP_TOKEN_ENC_KEY no está configurada');
  const [iv, tag, ct] = guardado.slice(PREFIJO.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(iv!, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag!, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ct!, 'base64url')), decipher.final()]).toString('utf8');
}
