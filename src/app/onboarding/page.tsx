'use client';

import { useState } from 'react';
import { crearTenant } from '@/server/actions/tenants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PLANES_ARRAY, type PlanId } from '@/lib/planes';
import { Check } from 'lucide-react';

export default function OnboardingPage() {
  const [nombre, setNombre] = useState('');
  const [mayorista, setMayorista] = useState(true);
  const [minorista, setMinorista] = useState(true);
  const [plan, setPlan] = useState<PlanId>('market');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await crearTenant({
      nombreNegocio: nombre,
      habilitaMayorista: mayorista,
      habilitaMinorista: minorista,
      plan,
    });
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">

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

      <div className="relative w-full max-w-xl animate-fade-up">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-[10px] bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_8px_24px_oklch(0.68_0.19_38_/_0.4)]">
              <span className="text-primary-foreground font-bold text-base leading-none tracking-tight">G</span>
            </div>
            <p className="font-semibold text-base tracking-tight">Gesto</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/80 backdrop-blur-xl p-7 shadow-[0_0_0_1px_oklch(1_0_0_/_0.04),0_24px_64px_oklch(0_0_0_/_0.4)]">

          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight">Configurá tu negocio</h1>
            <p className="text-sm text-muted-foreground mt-1">
              14 días de prueba gratis — sin tarjeta de crédito.
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

            {/* Selección de plan */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                ¿Qué tipo de negocio tenés?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLANES_ARRAY.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    className={`text-left p-3 rounded-lg border transition-colors relative ${
                      plan === p.id
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-background/40 border-border/40 hover:border-border'
                    }`}
                  >
                    {plan === p.id && (
                      <Check className="absolute top-2 right-2 h-3.5 w-3.5 text-primary" />
                    )}
                    <p className="text-sm font-medium pr-4">{p.nombre.replace('Gesto ', '')}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{p.descripcion}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                Canales de venta
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
              {loading ? 'Creando tu negocio...' : 'Empezar prueba gratuita'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60 mt-6">
          Podés cambiar el plan o cancelar en cualquier momento.
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
