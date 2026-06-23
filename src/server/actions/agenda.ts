'use server';

import { eq, and, gte, lte, isNull, asc } from 'drizzle-orm';
import { db } from '@/server/db';
import {
  turnos,
  vencimientos,
  vencimientosOcurrencias,
  clientes,
  type EstadoTurno,
  type TipoVencimiento,
  type Periodicidad,
} from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { requireSession } from '@/server/auth/session';
import { sumarMeses } from '@/lib/fechas';
import { revalidatePath } from 'next/cache';

// ─── Turnos ──────────────────────────────────────────────────────────────────

export async function listarTurnos(desdeISO: string, hastaISO: string) {
  const session = await requireSession();
  const rows = await db
    .select({
      id: turnos.id,
      titulo: turnos.titulo,
      descripcion: turnos.descripcion,
      direccion: turnos.direccion,
      localidad: turnos.localidad,
      inicio: turnos.inicio,
      duracionMin: turnos.duracionMin,
      estado: turnos.estado,
      montoEstimado: turnos.montoEstimado,
      clienteId: turnos.clienteId,
      clienteNombre: clientes.razonSocial,
    })
    .from(turnos)
    .leftJoin(clientes, eq(turnos.clienteId, clientes.id))
    .where(
      and(
        byTenant(session.tenantId, turnos),
        isNull(turnos.deletedAt),
        gte(turnos.inicio, new Date(desdeISO)),
        lte(turnos.inicio, new Date(hastaISO)),
      ),
    )
    .orderBy(asc(turnos.inicio));
  return rows;
}

type TurnoInput = {
  titulo: string;
  clienteId?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  inicio: string; // ISO
  duracionMin?: number;
  montoEstimado?: string | null;
};

export async function crearTurno(input: TurnoInput) {
  const session = await requireSession();
  if (!input.titulo?.trim()) return { ok: false as const, error: 'El título es obligatorio' };
  if (!input.inicio) return { ok: false as const, error: 'La fecha/hora es obligatoria' };

  const [row] = await db
    .insert(turnos)
    .values({
      tenantId: session.tenantId,
      titulo: input.titulo.trim(),
      clienteId: input.clienteId || null,
      descripcion: input.descripcion || null,
      direccion: input.direccion || null,
      localidad: input.localidad || null,
      inicio: new Date(input.inicio),
      duracionMin: input.duracionMin ?? 60,
      montoEstimado: input.montoEstimado || null,
    })
    .returning({ id: turnos.id });

  revalidatePath('/dashboard/agenda');
  return { ok: true as const, id: row!.id };
}

export async function actualizarTurno(id: string, input: Partial<TurnoInput>) {
  const session = await requireSession();
  await db
    .update(turnos)
    .set({
      ...(input.titulo !== undefined ? { titulo: input.titulo.trim() } : {}),
      ...(input.clienteId !== undefined ? { clienteId: input.clienteId || null } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion || null } : {}),
      ...(input.direccion !== undefined ? { direccion: input.direccion || null } : {}),
      ...(input.localidad !== undefined ? { localidad: input.localidad || null } : {}),
      ...(input.inicio !== undefined ? { inicio: new Date(input.inicio) } : {}),
      ...(input.duracionMin !== undefined ? { duracionMin: input.duracionMin } : {}),
      ...(input.montoEstimado !== undefined ? { montoEstimado: input.montoEstimado || null } : {}),
    })
    .where(and(byTenant(session.tenantId, turnos), eq(turnos.id, id)));
  revalidatePath('/dashboard/agenda');
  return { ok: true as const };
}

export async function cambiarEstadoTurno(id: string, estado: EstadoTurno) {
  const session = await requireSession();
  await db
    .update(turnos)
    .set({ estado })
    .where(and(byTenant(session.tenantId, turnos), eq(turnos.id, id)));
  revalidatePath('/dashboard/agenda');
  return { ok: true as const };
}

export async function eliminarTurno(id: string) {
  const session = await requireSession();
  await db
    .update(turnos)
    .set({ deletedAt: new Date() })
    .where(and(byTenant(session.tenantId, turnos), eq(turnos.id, id)));
  revalidatePath('/dashboard/agenda');
  return { ok: true as const };
}

// ─── Vencimientos ────────────────────────────────────────────────────────────

function avanzarFecha(fecha: Date, periodicidad: Periodicidad): Date {
  switch (periodicidad) {
    case 'mensual': return sumarMeses(fecha, 1);
    case 'bimestral': return sumarMeses(fecha, 2);
    case 'trimestral': return sumarMeses(fecha, 3);
    case 'semestral': return sumarMeses(fecha, 6);
    case 'anual': {
      const d = new Date(fecha);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    }
    case 'unico': return new Date(fecha);
  }
}

export async function listarVencimientos() {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(vencimientos)
    .where(and(byTenant(session.tenantId, vencimientos), isNull(vencimientos.deletedAt)))
    .orderBy(asc(vencimientos.proximoVencimiento));

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return rows.map((v) => {
    const prox = new Date(v.proximoVencimiento + 'T00:00:00');
    const diffDias = Math.floor((prox.getTime() - hoy.getTime()) / 86400000);
    const estado =
      diffDias < 0 ? 'vencido' : diffDias <= v.diasAvisoAnticipado ? 'por_vencer' : 'al_dia';
    return { ...v, diasRestantes: diffDias, alerta: estado as 'vencido' | 'por_vencer' | 'al_dia' };
  });
}

type VencimientoInput = {
  titulo: string;
  tipo: TipoVencimiento;
  proximoVencimiento: string; // yyyy-mm-dd
  periodicidad: Periodicidad;
  diasAvisoAnticipado?: number;
  montoEstimado?: string | null;
  notas?: string | null;
};

export async function crearVencimiento(input: VencimientoInput) {
  const session = await requireSession();
  if (!input.titulo?.trim()) return { ok: false as const, error: 'El título es obligatorio' };
  if (!input.proximoVencimiento) return { ok: false as const, error: 'La fecha es obligatoria' };

  await db.insert(vencimientos).values({
    tenantId: session.tenantId,
    titulo: input.titulo.trim(),
    tipo: input.tipo,
    proximoVencimiento: input.proximoVencimiento,
    periodicidad: input.periodicidad,
    diasAvisoAnticipado: input.diasAvisoAnticipado ?? 7,
    montoEstimado: input.montoEstimado || null,
    notas: input.notas || null,
  });
  revalidatePath('/dashboard/agenda');
  return { ok: true as const };
}

export async function actualizarVencimiento(id: string, input: Partial<VencimientoInput>) {
  const session = await requireSession();
  await db
    .update(vencimientos)
    .set({
      ...(input.titulo !== undefined ? { titulo: input.titulo.trim() } : {}),
      ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
      ...(input.proximoVencimiento !== undefined ? { proximoVencimiento: input.proximoVencimiento } : {}),
      ...(input.periodicidad !== undefined ? { periodicidad: input.periodicidad } : {}),
      ...(input.diasAvisoAnticipado !== undefined ? { diasAvisoAnticipado: input.diasAvisoAnticipado } : {}),
      ...(input.montoEstimado !== undefined ? { montoEstimado: input.montoEstimado || null } : {}),
      ...(input.notas !== undefined ? { notas: input.notas || null } : {}),
    })
    .where(and(byTenant(session.tenantId, vencimientos), eq(vencimientos.id, id)));
  revalidatePath('/dashboard/agenda');
  return { ok: true as const };
}

/** Marca el vencimiento actual como pagado, registra la ocurrencia y avanza al próximo. */
export async function marcarVencimientoPagado(id: string, montoPagado?: string) {
  const session = await requireSession();
  await db.transaction(async (tx) => {
    const [v] = await tx
      .select()
      .from(vencimientos)
      .where(and(byTenant(session.tenantId, vencimientos), eq(vencimientos.id, id)))
      .limit(1)
      .for('update');
    if (!v) throw new Error('Vencimiento no encontrado');

    await tx.insert(vencimientosOcurrencias).values({
      tenantId: session.tenantId,
      vencimientoId: v.id,
      vence: v.proximoVencimiento,
      estado: 'pagado',
      pagadoAt: new Date(),
      montoPagado: montoPagado || v.montoEstimado || null,
    });

    if (v.periodicidad === 'unico') {
      await tx.update(vencimientos).set({ activo: false }).where(eq(vencimientos.id, v.id));
    } else {
      const prox = avanzarFecha(new Date(v.proximoVencimiento + 'T00:00:00'), v.periodicidad);
      await tx
        .update(vencimientos)
        .set({ proximoVencimiento: prox.toISOString().slice(0, 10) })
        .where(eq(vencimientos.id, v.id));
    }
  });
  revalidatePath('/dashboard/agenda');
  return { ok: true as const };
}

export async function eliminarVencimiento(id: string) {
  const session = await requireSession();
  await db
    .update(vencimientos)
    .set({ deletedAt: new Date() })
    .where(and(byTenant(session.tenantId, vencimientos), eq(vencimientos.id, id)));
  revalidatePath('/dashboard/agenda');
  return { ok: true as const };
}
