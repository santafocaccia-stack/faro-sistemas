import { Lock } from 'lucide-react';
import { requireSession } from '@/server/auth/session';

/**
 * Pantalla de respaldo cuando un usuario no tiene permisos para abrir ninguna
 * sección (caso raro: el dueño le quitó todos los accesos). No lleva guard de
 * permiso para evitar loops de redirección.
 */
export default async function SinAccesoPage() {
  await requireSession();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Lock className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <h1 className="text-lg font-semibold tracking-tight">Sin accesos asignados</h1>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
        Tu cuenta todavía no tiene permisos para usar ninguna sección. Pedile al
        dueño del negocio que te asigne acceso desde Configuración → Equipo.
      </p>
    </div>
  );
}
