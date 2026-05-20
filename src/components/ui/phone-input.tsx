'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Países soportados para el selector de teléfono.
 * Foco en Latinoamérica + algunos comunes. Argentina por defecto.
 */
const PAISES = [
  { code: 'AR', nombre: 'Argentina', prefijo: '54',  flag: '🇦🇷' },
  { code: 'UY', nombre: 'Uruguay',   prefijo: '598', flag: '🇺🇾' },
  { code: 'CL', nombre: 'Chile',     prefijo: '56',  flag: '🇨🇱' },
  { code: 'PY', nombre: 'Paraguay',  prefijo: '595', flag: '🇵🇾' },
  { code: 'BR', nombre: 'Brasil',    prefijo: '55',  flag: '🇧🇷' },
  { code: 'BO', nombre: 'Bolivia',   prefijo: '591', flag: '🇧🇴' },
  { code: 'PE', nombre: 'Perú',      prefijo: '51',  flag: '🇵🇪' },
  { code: 'CO', nombre: 'Colombia',  prefijo: '57',  flag: '🇨🇴' },
  { code: 'MX', nombre: 'México',    prefijo: '52',  flag: '🇲🇽' },
  { code: 'ES', nombre: 'España',    prefijo: '34',  flag: '🇪🇸' },
  { code: 'US', nombre: 'EE.UU.',    prefijo: '1',   flag: '🇺🇸' },
] as const;

const DEFAULT = PAISES[0]; // Argentina

/**
 * Descompone un número internacional completo (solo dígitos) en
 * { país, parte local }. Matchea el prefijo más largo primero.
 */
function parsearTelefono(value: string): { paisCode: string; local: string } {
  const digitos = (value ?? '').replace(/\D/g, '');
  if (!digitos) return { paisCode: DEFAULT.code, local: '' };

  const ordenadoPorLargo = [...PAISES].sort((a, b) => b.prefijo.length - a.prefijo.length);
  for (const p of ordenadoPorLargo) {
    if (digitos.startsWith(p.prefijo)) {
      return { paisCode: p.code, local: digitos.slice(p.prefijo.length) };
    }
  }
  return { paisCode: DEFAULT.code, local: digitos };
}

type Props = {
  /** Valor: número internacional completo, solo dígitos (ej: "5491112345678") */
  value: string;
  /** Devuelve el número internacional completo, o '' si la parte local está vacía */
  onChange: (telefonoCompleto: string) => void;
  placeholder?: string;
};

/**
 * Input de teléfono con selector de país (bandera + prefijo).
 * El valor que maneja es el número internacional completo, listo para WhatsApp.
 */
export function PhoneInput({ value, onChange, placeholder = '11 2345-6789' }: Props) {
  const inicial = parsearTelefono(value);
  const [paisCode, setPaisCode] = useState(inicial.paisCode);
  const [local, setLocal] = useState(inicial.local);
  const [abierto, setAbierto] = useState(false);

  const pais = PAISES.find((p) => p.code === paisCode) ?? DEFAULT;

  function emitir(prefijo: string, localNum: string) {
    const d = localNum.replace(/\D/g, '');
    onChange(d ? prefijo + d : '');
  }

  function elegirPais(code: string) {
    const nuevo = PAISES.find((p) => p.code === code) ?? DEFAULT;
    setPaisCode(code);
    setAbierto(false);
    emitir(nuevo.prefijo, local);
  }

  function cambiarLocal(v: string) {
    // Permitir solo dígitos, espacios y guiones para que el usuario formatee
    const limpio = v.replace(/[^\d\s-]/g, '');
    setLocal(limpio);
    emitir(pais.prefijo, limpio);
  }

  return (
    <div className="relative flex gap-2">
      {/* Selector de país */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-border/60 bg-background/40 text-sm hover:border-border transition-colors"
        >
          <span className="text-base leading-none">{pais.flag}</span>
          <span className="font-mono text-[13px] text-muted-foreground">+{pais.prefijo}</span>
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground/60 transition-transform', abierto && 'rotate-180')} />
        </button>

        {abierto && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
            <div className="absolute top-full left-0 mt-1 z-40 w-52 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-xl py-1">
              {PAISES.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => elegirPais(p.code)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-muted/60 transition-colors',
                    p.code === paisCode && 'bg-primary/5 font-medium',
                  )}
                >
                  <span className="text-base leading-none">{p.flag}</span>
                  <span className="flex-1 truncate">{p.nombre}</span>
                  <span className="font-mono text-[12px] text-muted-foreground">+{p.prefijo}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Input del número local */}
      <input
        type="tel"
        inputMode="tel"
        value={local}
        onChange={(e) => cambiarLocal(e.target.value)}
        placeholder={placeholder}
        className="h-9 flex-1 min-w-0 px-3 rounded-md border border-border/60 bg-background/40 text-sm font-mono tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
      />
    </div>
  );
}
