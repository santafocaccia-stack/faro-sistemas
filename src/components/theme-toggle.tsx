'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Toggle claro/oscuro. La clase `dark` en <html> la aplica el script inline
 * del layout raíz antes del primer paint; acá solo la alternamos y persistimos.
 * Preferencia por dispositivo (localStorage), igual que la escala de fuente.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [esOscuro, setEsOscuro] = useState<boolean | null>(null);

  useEffect(() => {
    setEsOscuro(document.documentElement.classList.contains('dark'));
  }, []);

  function alternar() {
    const oscuro = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', oscuro);
    try {
      localStorage.setItem('gesto:theme', oscuro ? 'dark' : 'light');
    } catch {
      /* noop */
    }
    setEsOscuro(oscuro);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={esOscuro ? 'Tema claro' : 'Tema oscuro'}
      className={`inline-flex items-center justify-center h-9 w-9 rounded-md border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${className}`}
    >
      {/* Antes de hidratar no sabemos el tema: mostramos ambos apilados vía CSS */}
      {esOscuro === null ? (
        <>
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="h-4 w-4 hidden dark:block" />
        </>
      ) : esOscuro ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
