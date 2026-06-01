import { listarEquipo } from '@/server/actions/equipo';
import { requireSession } from '@/server/auth/session';
import { descripcionAdmin, descripcionEmpleado } from '@/lib/nav';
import { EquipoForm } from '@/components/equipo-form';

export default async function EquipoPage() {
  const [session, equipo] = await Promise.all([
    requireSession(),
    listarEquipo(),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">Equipo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestioná quién tiene acceso al sistema
        </p>
      </div>

      {/* Info de roles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            rol: 'Dueño',
            desc: 'Acceso total. Puede invitar miembros, cambiar roles y configurar el negocio.',
            color: 'text-primary',
            bg: 'bg-primary/5 border-primary/15',
          },
          {
            rol: 'Admin',
            desc: descripcionAdmin(session.plan),
            color: 'text-warning',
            bg: 'bg-warning/5 border-warning/15',
          },
          {
            rol: 'Empleado',
            desc: descripcionEmpleado(session.plan),
            color: 'text-muted-foreground',
            bg: 'bg-muted/40 border-border/40',
          },
        ].map((r) => (
          <div key={r.rol} className={`rounded-xl border p-4 ${r.bg}`}>
            <p className={`text-[11px] font-bold uppercase tracking-[0.08em] mb-1 ${r.color}`}>{r.rol}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Lista de miembros */}
      <EquipoForm
        equipo={equipo}
        miRol={session.rol}
        miUserId={session.userId}
      />

      {/* Nota al pie */}
      <p className="text-[11px] text-muted-foreground text-center">
        Los empleados invitados reciben un email para crear su cuenta. Una vez confirmado, pueden iniciar sesión directamente.
      </p>
    </div>
  );
}
