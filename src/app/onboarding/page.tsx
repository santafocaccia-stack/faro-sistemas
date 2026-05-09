'use client';

import { useState } from 'react';
import { crearTenant } from '@/server/actions/tenants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export default function OnboardingPage() {
  const [nombre, setNombre] = useState('');
  const [mayorista, setMayorista] = useState(true);
  const [minorista, setMinorista] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await crearTenant({
      nombreNegocio: nombre,
      habilitaMayorista: mayorista,
      habilitaMinorista: minorista,
    });
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">

      {/* Gradiente radial premium */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.68 0.19 38 / 0.18), transparent 60%),
            radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.55 0.13 250 / 0.10), transparent 60%)
          `,
        }}
      />

      {/* Grid sutil */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(to right, oklch(1 0 0) 1px, transparent 1px),
            linear-gradient(to bottom, oklch(1 0 0) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative w-full max-w-md animate-fade-up">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_8px_24px_oklch(0.68_0.19_38_/_0.4)]">
              <span className="text-primary-foreground font-bold text-base leading-none tracking-tight">F</span>
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-base tracking-tight">Faro</p>
              <p className="text-[11px] text-muted-foreground -mt-0.5">Sistemas</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl p-7 shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),0_24px_64px_oklch(0_0_0_/_0.4)]">

          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight">Configurá tu negocio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Solo lo esencial para arrancar — podés cambiar todo después.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="space-y-1.5">
              <label htmlFor="nombre" className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                Nombre del negocio
              </label>
              <Input
                id="nombre"
                placeholder="Ej: Carnicería El Gaucho"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="h-10 bg-background/40 border-border/60 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                ¿Qué tipo de ventas hacés?
              </label>

              <CanalToggle
                title="Minorista"
                description="Venta por mostrador al consumidor final"
                checked={minorista}
                onChange={setMinorista}
              />
              <CanalToggle
                title="Mayorista"
                description="Venta a otros negocios o revendedores"
                checked={mayorista}
                onChange={setMayorista}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium glow-primary"
              disabled={loading || (!mayorista && !minorista)}
            >
              {loading ? 'Creando tu negocio...' : 'Empezar'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          Vas a poder agregar productos, clientes y empezar a vender en menos de 5 minutos.
        </p>
      </div>
    </div>
  );
}

function CanalToggle({
  title, description, checked, onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
        checked ? 'bg-primary/5 border-primary/20' : 'bg-background/40 border-border/40 hover:border-border'
      }`}
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
