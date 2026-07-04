import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { cifrarToken, descifrarToken } from '../cifrado';

const KEY = crypto.randomBytes(32).toString('base64');

describe('cifrado de tokens MP (AES-256-GCM)', () => {
  const original = process.env.MP_TOKEN_ENC_KEY;
  beforeAll(() => { process.env.MP_TOKEN_ENC_KEY = KEY; });
  afterAll(() => { process.env.MP_TOKEN_ENC_KEY = original; });

  it('round-trip: descifrar(cifrar(x)) === x', () => {
    const token = 'APP_USR-1234567890-secreto-de-mp';
    const guardado = cifrarToken(token);
    expect(guardado).toMatch(/^enc:v1:/);
    expect(guardado).not.toContain(token);
    expect(descifrarToken(guardado)).toBe(token);
  });

  it('cada cifrado usa IV distinto (no determinístico)', () => {
    expect(cifrarToken('mismo')).not.toBe(cifrarToken('mismo'));
  });

  it('valores legado en texto plano se devuelven tal cual', () => {
    expect(descifrarToken('APP_USR-legado-plano')).toBe('APP_USR-legado-plano');
    expect(descifrarToken(null)).toBeNull();
  });

  it('ciphertext manipulado lanza (GCM auth tag)', () => {
    const guardado = cifrarToken('secreto');
    const partes = guardado.split(':');
    // Corromper el ciphertext (última parte)
    partes[partes.length - 1] = Buffer.from('xxxxxxxxxxxx').toString('base64url');
    expect(() => descifrarToken(partes.join(':'))).toThrow();
  });

  it('clave de longitud inválida lanza', () => {
    process.env.MP_TOKEN_ENC_KEY = Buffer.from('corta').toString('base64');
    expect(() => cifrarToken('x')).toThrow(/32 bytes/);
    process.env.MP_TOKEN_ENC_KEY = KEY;
  });
});
