'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, ShieldCheck, Shield, User as UserIcon, SlidersHorizontal, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  invitarMiembro, cambiarRol, eliminarMiembro, guardarPermisos, type MiembroEquipo,
} from '@/server/actions/equipo';
import type { Rol } from '@/server/db/schema';
import { permisosEfectivos, PERMISO_LABEL, type Permiso } from '@/lib/permisos';

const ROL_CONFIG: Record<Rol, { label: string; icon: React.ElementType; badge: string }> = {
  owner:    { label: 'Dueño',      icon: ShieldCheck, badge: 'bg-primary/10 text-primary border-primary/20' },
  admin:    { label: 'Admin',      icon: Shield,      badge: 'bg-warning/10 text-warning border-warning/20' },
  empleado: { label: 'Empleado',   icon: UserIcon,    badge: 'bg-muted text-muted-foreground border-border' },
};

type Props = {
  equipo: MiembroEquipo[];
  miRol: Rol;
  miUserId: string;
  permisosDisponibles: Permiso[];
};

export function EquipoForm({ equipo, miRol, miUserId, permisosDisponibles }: Props) {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [rolInvite, setRolInvite] = useState<Rol>('empleado');
  const [showInvite, setShowInvite] = useState(false);

  const puedeGestionar = miRol === 'owner' || miRol === 'admin';

  function handleInvitar(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await invitarMiembro({ email, rol: rolInvite });
      if (!result.ok) {
        toast.error(result.error, { duration: 6000 });
        return;
      }
      toast.success(result.mensaje, { duration: 5000 });
      setEmail('');
      setShowInvite(false);
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

  function handleEliminar(userId: string) {
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
              <Button type="submit" disabled={isPending || !email.trim()} className="h-10 glow-primary flex-1 sm:flex-none">
                {isPending ? 'Enviando...' : 'Enviar invitación'}
              </Button>
              <Button type="button" variant="ghost" className="h-10" onClick={() => setShowInvite(false)}>
                Cancelar
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Podés ajustar permisos finos para cada persona después de invitarla.
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
          // A un dueño no se le tocan permisos; tampoco a uno mismo.
          const puedeEditarPermisos = puedeEditar && miembro.rol !== 'owner';

          return (
            <div key={miembro.userId} className="px-4 sm:px-5 py-3.5 hover:bg-foreground/[0.02] transition-colors">
              {/* Fila superior: avatar + info */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-semibold text-primary uppercase">{miembro.email.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium truncate">{miembro.nombreCompleto ?? miembro.email}</p>
                    {esMiCuenta && <span className="text-[10px] text-muted-foreground/60 font-normal shrink-0">(vos)</span>}
                    {miembro.permisos != null && miembro.rol !== 'owner' && (
                      <span className="text-[10px] text-primary/80 font-medium shrink-0 inline-flex items-center gap-0.5">
                        <SlidersHorizontal className="h-2.5 w-2.5" /> Personalizado
                      </span>
                    )}
                  </div>
                  {miembro.nombreCompleto && <p className="text-[11px] text-muted-foreground truncate">{miembro.email}</p>}
                </div>
              </div>

              {/* Fila inferior: rol + eliminar */}
              <div className="flex items-center justify-between gap-2 mt-2.5 pl-12">
                {puedeEditar ? (
                  <Select value={miembro.rol} onValueChange={(v) => handleCambiarRol(miembro.userId, v as Rol)} disabled={isPending}>
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
                    {esMiCuenta && miRol !== 'owner' && <span className="text-muted-foreground/50 ml-0.5">· tu rol</span>}
                  </span>
                )}

                {puedeEditar && (
                  <ConfirmDialog
                    trigger={
                      <button disabled={isPending} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar
                      </button>
                    }
                    title={`¿Quitar a ${miembro.email} del equipo?`}
                    description="El miembro perderá acceso a la plataforma. Podés volver a invitarlo."
                    confirmLabel="Sí, quitar"
                    onConfirm={() => handleEliminar(miembro.userId)}
                  />
                )}
              </div>

              {/* Editor de permisos granulares */}
              {puedeEditarPermisos && (
                <PermisosMiembro
                  key={`${miembro.userId}:${miembro.rol}:${(miembro.permisos ?? []).join(',')}`}
                  userId={miembro.userId}
                  rol={miembro.rol}
                  permisosGuardados={miembro.permisos}
                  disponibles={permisosDisponibles}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Panel colapsable con los permisos finos de un miembro. */
function PermisosMiembro({
  userId, rol, permisosGuardados, disponibles,
}: {
  userId: string;
  rol: Rol;
  permisosGuardados: Permiso[] | null;
  disponibles: Permiso[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const efectivos = permisosEfectivos({ rol, permisos: permisosGuardados });
  const [sel, setSel] = useState<Set<Permiso>>(
    () => new Set(disponibles.filter((p) => efectivos.includes(p))),
  );
  const personalizado = permisosGuardados != null;

  function persistir(next: Set<Permiso>) {
    startTransition(async () => {
      try {
        await guardarPermisos(userId, Array.from(next));
        toast.success('Permisos actualizados');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar permisos');
      }
    });
  }

  function toggle(p: Permiso) {
    const next = new Set(sel);
    if (next.has(p)) next.delete(p); else next.add(p);
    setSel(next);
    persistir(next);
  }

  function volverAlRol() {
    startTransition(async () => {
      try {
        await guardarPermisos(userId, null);
        toast.success('Permisos restablecidos al rol');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al restablecer');
      }
    });
  }

  return (
    <div className="mt-2.5 pl-12">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {abierto ? 'Ocultar permisos' : 'Permisos finos'}
      </button>

      {abierto && (
        <div className="mt-2 rounded-lg border border-border/60 bg-background/40 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {disponibles.map((p) => {
              const activo = sel.has(p);
              const info = PERMISO_LABEL[p];
              return (
                <button
                  key={p}
                  type="button"
                  disabled={isPending}
                  onClick={() => toggle(p)}
                  className={`flex items-start gap-2 text-left rounded-md px-2.5 py-2 border transition-colors ${
                    activo
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-border/50 bg-background/40 hover:border-border'
                  }`}
                >
                  <span className={`mt-0.5 h-4 w-4 shrink-0 rounded flex items-center justify-center border ${
                    activo ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                  }`}>
                    {activo && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium leading-tight">{info.titulo}</span>
                    <span className="block text-[10px] text-muted-foreground leading-tight">{info.detalle}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] text-muted-foreground">
              {personalizado ? 'Permisos personalizados para esta persona.' : `Usando los permisos del rol ${rol}.`}
            </span>
            {personalizado && (
              <button
                type="button"
                disabled={isPending}
                onClick={volverAlRol}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Volver a permisos del rol
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
