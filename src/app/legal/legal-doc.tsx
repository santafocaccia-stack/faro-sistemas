import type { ReactNode } from 'react';

/* Datos compartidos por todos los documentos legales. */
export const UPDATED = '21 de junio de 2026';
export const TITULAR_NOMBRE = 'Tomás de Sousa';

/* Marca visual para los datos que el responsable debe completar
   antes de publicar (CUIT, domicilio, email de contacto, etc.). */
export function Ph({ children }: { children: ReactNode }) {
  return <mark className="legal-ph">{children}</mark>;
}

/* Encabezado común de cada documento legal. */
export function LegalDoc({
  title,
  updated = UPDATED,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <article className="legal-prose">
      <p className="legal-eyebrow">Gesto · Legal</p>
      <h1>{title}</h1>
      <p className="legal-updated">Última actualización: {updated}</p>
      {children}
    </article>
  );
}
