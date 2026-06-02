'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Check, X, Tags, Layers } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  crearCategoria, actualizarCategoria, eliminarCategoria,
  crearGrupoVariante, actualizarGrupoVariante, eliminarGrupoVariante,
} from '@/server/actions/categorias';
import type { Categoria, GrupoVariante } from '@/server/db/schema';
import { cn } from '@/lib/utils';

type Props = {
  categorias: Categoria[];
  grupos: GrupoVariante[];
};

export function CategoriasManager({ categorias, grupos }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Section
        titulo="Categorías"
        descripcion="Sirven para agrupar productos en el catálogo (ej: Carnes, Lácteos, Bebidas)."
        icono={Tags}
        items={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
        onCrear={async (n) => { await crearCategoria(n); }}
        onEditar={async (id, n) => { await actualizarCategoria(id, n); }}
        onEliminar={async (id) => { await eliminarCategoria(id); }}
        placeholder="Ej: Carnes rojas"
        emptyMsg="Aún no creaste ninguna categoría. Sirven para organizar tu catálogo."
      />

      <Section
        titulo="Grupos de variantes"
        descripcion="Para productos con variantes (ej: Talles, Colores, Sabores)."
        icono={Layers}
        items={grupos.map((g) => ({ id: g.id, nombre: g.nombre }))}
        onCrear={async (n) => { await crearGrupoVariante(n); }}
        onEditar={async (id, n) => { await actualizarGrupoVariante(id, n); }}
        onEliminar={async (id) => { await eliminarGrupoVariante(id); }}
        placeholder="Ej: Talle"
        emptyMsg="Sin grupos creados. Útil si vendés ropa, calzado, etc."
      />
    </div>
  );
}

type Item = { id: string; nombre: string };

function Section({
  titulo, descripcion, icono: Icono, items,
  onCrear, onEditar, onEliminar,
  placeholder, emptyMsg,
}: {
  titulo: string;
  descripcion: string;
  icono: React.ElementType;
  items: Item[];
  onCrear: (nombre: string) => Promise<void>;
  onEditar: (id: string, nombre: string) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
  placeholder: string;
  emptyMsg: string;
}) {
  const [nuevo, setNuevo] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoValor, setEditandoValor] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    const nombre = nuevo.trim();
    if (!nombre) return;
    startTransition(async () => {
      try {
        await onCrear(nombre);
        setNuevo('');
        toast.success(`"${nombre}" creado`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al crear');
      }
    });
  }

  function comenzarEditar(item: Item) {
    setEditandoId(item.id);
    setEditandoValor(item.nombre);
  }

  function cancelarEditar() {
    setEditandoId(null);
    setEditandoValor('');
  }

  function guardarEditar(item: Item) {
    const nombre = editandoValor.trim();
    if (!nombre || nombre === item.nombre) { cancelarEditar(); return; }
    setPendingId(item.id);
    startTransition(async () => {
      try {
        await onEditar(item.id, nombre);
        toast.success('Guardado');
        cancelarEditar();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar');
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleEliminar(item: Item) {
    setPendingId(item.id);
    startTransition(async () => {
      try {
        await onEliminar(item.id);
        toast.success(`"${item.nombre}" eliminado`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar');
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="panel overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border/60 flex items-start gap-3">
        <div className="icon-chip h-8 w-8 shrink-0">
          <Icono className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{titulo}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{descripcion}</p>
        </div>
      </div>

      {/* Form crear */}
      <form onSubmit={handleCrear} className="p-4 flex gap-2 border-b border-border/60 bg-muted/20">
        <input
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder={placeholder}
          maxLength={60}
          className="flex-1 h-9 px-3 rounded-lg border border-border bg-background/40 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={isPending || !nuevo.trim()}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          Agregar
        </button>
      </form>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">{emptyMsg}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {items.map((item) => {
            const editando = editandoId === item.id;
            const pendiendo = pendingId === item.id && isPending;

            return (
              <li
                key={item.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 group transition-opacity',
                  pendiendo && 'opacity-50',
                )}
              >
                {editando ? (
                  <>
                    <input
                      autoFocus
                      type="text"
                      value={editandoValor}
                      onChange={(e) => setEditandoValor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') guardarEditar(item);
                        if (e.key === 'Escape') cancelarEditar();
                      }}
                      className="flex-1 h-8 px-2.5 rounded-md border border-primary/40 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      onClick={() => guardarEditar(item)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-success hover:bg-success/10 transition-colors"
                      title="Guardar"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={cancelarEditar}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                      title="Cancelar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-[13px] truncate">{item.nombre}</span>
                    <button
                      onClick={() => comenzarEditar(item)}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <ConfirmDialog
                      trigger={
                        <button
                          className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      }
                      title={`¿Eliminar "${item.nombre}"?`}
                      description="Los productos que la usen quedarán sin categoría."
                      confirmLabel="Sí, eliminar"
                      onConfirm={() => handleEliminar(item)}
                    />
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer count */}
      {items.length > 0 && (
        <div className="border-t border-border/40 px-4 py-2.5 bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
          </p>
        </div>
      )}
    </div>
  );
}
