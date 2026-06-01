'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BookMarked, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { guardarComoPlantilla, usarPlantilla } from '@/server/actions/presupuestos';

/* ── Botón "Guardar como plantilla" — en la página de detalle de presupuesto ── */
export function GuardarPlantillaButton({ presupuestoId }: { presupuestoId: string }) {
  const [isPending, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');

  function handleGuardar() {
    if (!nombre.trim()) { toast.error('Ingresá un nombre para la plantilla'); return; }
    startTransition(async () => {
      const res = await guardarComoPlantilla(presupuestoId, nombre.trim());
      if (res.ok) {
        toast.success(`Plantilla "${nombre}" guardada`);
        setAbierto(false);
        setNombre('');
      } else {
        toast.error(res.error);
      }
    });
  }

  if (abierto) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGuardar(); if (e.key === 'Escape') setAbierto(false); }}
          placeholder="Nombre de la plantilla…"
          className="h-8 text-xs w-48 border-primary/50 focus:border-primary"
          autoFocus
        />
        <Button size="sm" className="h-8 glow-primary" disabled={isPending} onClick={handleGuardar}>
          Guardar
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8 text-xs gap-1.5"
      onClick={() => setAbierto(true)}
    >
      <BookMarked className="h-3.5 w-3.5" />
      Guardar como plantilla
    </Button>
  );
}

/* ── Botón "Usar plantilla" — en la lista de plantillas ── */
export function UsarPlantillaButton({ plantillaId, nombrePlantilla }: { plantillaId: string; nombrePlantilla: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleUsar() {
    startTransition(async () => {
      const res = await usarPlantilla(plantillaId);
      if (res.ok) {
        toast.success('Presupuesto creado desde plantilla');
        router.push(`/dashboard/presupuestos/${res.id}/editar`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
      onClick={handleUsar}
      title={`Crear presupuesto desde "${nombrePlantilla}"`}
    >
      <Copy className="h-3 w-3" />
      Usar
    </Button>
  );
}
