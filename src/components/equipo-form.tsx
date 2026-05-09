'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, ShieldCheck, Shield, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invitarMiembro, cambiarRol, eliminarMiembro, type MiembroEquipo } from '@/server/actions/equipo';
import type { Rol } from '@/server/db/schema';

const ROL_CONFIG: Record<Rol, { label: string; icon: React.ElementType; badge: string }> = {
  owner:    { label: 'Dueño',      icon: ShieldCheck, badge: 'bg-primary/10 text-primary border-primary/20' },
  admin:    { label: 'Admin',      icon: Shield,      badge: 'bg-warning/10 text-warning border-warning/20' },
  empleado: { label: 'Empleado',   icon: UserIcon,    badge: 'bg-muted text-muted-foreground border-border' },
};

type Props = {
  equipo: MiembroEquipo[];
  miRol: Rol;
  miUserId: string;
};

export function EquipoForm({ equipo, miRol, miUserId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [rolInvite, setRolInvite] = useState<Rol>('empleado');
  const [showInvite, setShowInvite] = useState(false);

  const puedeGestionar = miRol === 'owner' || miRol === 'admin';

  function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await invitarMiembro({ email, rol: rolInvite });
        toast.success(`Invitación enviada a ${email}`);
        setEmail('');
        setShowInvite(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al invitar');
      }
    });
  }

  function handleCambiarRol(userId: string, nuevoRol: Rol) {
    startTransition(async () => {
      try {
        await cambiarRol(userId, nuevoRol);
        toast.success('Rol actualizado');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al cambiar rol');
      }
    });
  }

  function handleEliminar(userId: string, email: string) {
    if (!confirm(`¿Eliminar a ${email} del equipo?`)) return;
    startTransition(async () => {
      try {
        await eliminarMiembro(userId);
        toast.success('Miembro eliminado');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar');
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Miembros del equipo</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{equipo.length} {equipo.length === 1 ? 'persona' : 'personas'} con acceso</p>
        </div>
        {puedeGestionar && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInvite((v) => !v)}
            className="h-8 text-xs gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invitar
          </Button>
        )}
      </div>

      {/* Formulario de invitación */}
      {showInvite && (
        <form onSubmit={handleInvitar} className="px-5 py-4 border-b border-border/60 bg-muted/30 space-y-3">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-[0.06em]">Nueva invitación</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-8 text-sm bg-background/60 border-border/60 flex-1"
            />
            <Select value={rolInvite} onValueChange={(v) => setRolInvite(v as Rol)}>
              <SelectTrigger className="h-8 text-sm bg-background/60 border-border/60 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="empleado">Empleado</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {miRol === 'owner' && <SelectItem value="owner">Dueño</SelectItem>}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={isPending} className="h-8 glow-primary">
              Enviar
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => setShowInvite(false)}>
              Cancelar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            El usuario recibirá un email para confirmar su cuenta y acceder al sistema.
          </p>
        </form>
      )}

      {/* Lista de miembros */}
      <div className="divide-y divide-border/40">
        {equipo.map((miembro) => {
          const config = ROL_CONFIG[miembro.rol];
          const Icon = config.icon;
          const esMiCuenta = miembro.userId === miUserId;
          const puedeEditar = puedeGestionar && !esMiCuenta;

          return (
            <div key={miembro.userId} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
              {/* Avatar */}
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-semibold text-primary uppercase">
                  {miembro.email.charAt(0)}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium truncate">
                    {miembro.nombreCompleto ?? miembro.email}
                  </p>
                  {esMiCuenta && (
                    <span className="text-[10px] text-muted-foreground/60 font-normal">(vos)</span>
                  )}
                </div>
                {miembro.nombreCompleto && (
                  <p className="text-[11px] text-muted-foreground truncate">{miembro.email}</p>
                )}
              </div>

              {/* Rol */}
              {puedeEditar ? (
                <Select
                  value={miembro.rol}
                  onValueChange={(v) => handleCambiarRol(miembro.userId, v as Rol)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-7 text-xs bg-transparent border-border/40 w-28 gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    {miRol === 'owner' && <SelectItem value="owner">Dueño</SelectItem>}
                  </SelectContent>
                </Select>
              ) : (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${config.badge}`}>
                  <Icon className="h-3 w-3" strokeWidth={1.75} />
                  {config.label}
                </span>
              )}

              {/* Eliminar */}
              {puedeEditar && (
                <button
                  onClick={() => handleEliminar(miembro.userId, miembro.email)}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Eliminar del equipo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
