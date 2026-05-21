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

          {/* Email — fila propia, ancho completo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Email del nuevo miembro</label>
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-10 text-sm bg-background/60 border-border/60 w-full"
            />
          </div>

          {/* Rol + acciones */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="space-y-1.5 sm:w-40">
              <label className="text-[11px] font-medium text-muted-foreground">Rol</label>
              <Select value={rolInvite} onValueChange={(v) => setRolInvite(v as Rol)}>
                <SelectTrigger className="h-10 text-sm bg-background/60 border-border/60 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empleado">Empleado</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {miRol === 'owner' && <SelectItem value="owner">Dueño</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 sm:flex-1 sm:items-end">
              <Button
                type="submit"
                disabled={isPending || !email.trim()}
                className="h-10 glow-primary flex-1 sm:flex-none"
              >
                {isPending ? 'Enviando...' : 'Enviar invitación'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10"
                onClick={() => setShowInvite(false)}
              >
                Cancelar
              </Button>
            </div>
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
            <div key={miembro.userId} className="px-4 sm:px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
              {/* Fila superior: avatar + info */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-semibold text-primary uppercase">
                    {miembro.email.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">
                      {miembro.nombreCompleto ?? miembro.email}
                    </p>
                    {esMiCuenta && (
                      <span className="text-[10px] text-muted-foreground/60 font-normal shrink-0">(vos)</span>
                    )}
                  </div>
                  {miembro.nombreCompleto && (
                    <p className="text-[11px] text-muted-foreground truncate">{miembro.email}</p>
                  )}
                </div>
              </div>

              {/* Fila inferior: rol + eliminar */}
              <div className="flex items-center justify-between gap-2 mt-2.5 pl-12">
                {puedeEditar ? (
                  <Select
                    value={miembro.rol}
                    onValueChange={(v) => handleCambiarRol(miembro.userId, v as Rol)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-9 text-[13px] bg-background/60 border-border/60 w-36 gap-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="empleado">Empleado</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {miRol === 'owner' && <SelectItem value="owner">Dueño</SelectItem>}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border ${config.badge}`}>
                    <Icon className="h-3 w-3" strokeWidth={1.75} />
                    {config.label}
                    {esMiCuenta && miRol !== 'owner' && (
                      <span className="text-muted-foreground/50 ml-0.5">· tu rol</span>
                    )}
                  </span>
                )}

                {puedeEditar && (
                  <button
                    onClick={() => handleEliminar(miembro.userId, miembro.email)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
