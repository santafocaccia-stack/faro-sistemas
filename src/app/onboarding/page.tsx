'use client';

import { useState, useEffect } from 'react';
import { crearTenant } from '@/server/actions/tenants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PLANES_ARRAY, type PlanId } from '@/lib/planes';
import { Check, Store, ShoppingCart, ChefHat, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Pantalla de loading animada ───────────────────────────────────────────────
const PASOS = [
  'Creando tu negocio...',
  'Configurando el catálogo...',
  'Preparando el punto de venta...',
  '¡Todo listo!',
];

function LoadingScreen() {
  const [paso, setPaso] = useState(0);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    // Avanzar pasos en intervalos
    const intervaloPasos = setInterval(() => {
      setPaso((p) => Math.min(p + 1, PASOS.length - 1));
    }, 900);

    // Barra de progreso continua
    const intervaloProg = setInterval(() => {
      setProgreso((p) => Math.min(p + 1.2, 95)); // llega hasta 95%, el 100% lo hace cuando termina
    }, 60);

    return () => {
      clearInterval(intervaloPasos);
      clearInterval(intervaloProg);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Fondo con gradiente igual al onboarding */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.68 0.19 38 / 0.18), transparent 60%),
            radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.55 0.13 250 / 0.10), transparent 60%)
          `,
        }}
      />

      <div className="relative w-full max-w-sm text-center space-y-8">
        {/* Logo animado */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.55_0.18_28)] flex items-center justify-center shadow-[0_0_0_1px_oklch(1_0_0_/_0.08)_inset,0_8px_24px_oklch(0.68_0.19_38_/_0.4)]">
              <span className="text-primary-foreground font-bold text-2xl leading-none tracking-tight">G</span>
            </div>
            {/* Anillo pulsante */}
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 bg-primary" />
          </div>
        </div>

        {/* Texto del paso actual */}
        <div className="space-y-2">
          <p className="text-lg font-semibold tracking-tight transition-all">
            {PASOS[paso]}
          </p>
          <p className="text-sm text-muted-foreground">
            Esto toma unos segundos…
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-3">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>

          {/* Pasos con checkmarks */}
          <div className="flex justify-between px-1">
            {PASOS.slice(0, 3).map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                  paso > i
                    ? 'border-primary bg-primary'
                    : paso === i
                    ? 'border-primary bg-transparent animate-pulse'
                    : 'border-muted-foreground/30 bg-transparent',
                )}>
                  {paso > i && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Iconos por plan ───────────────────────────────────────────────────────────
const PLAN_ICONS: Record<string, React.ElementType> = {
  servicios: Store,
  market:    ShoppingCart,
  food:      ChefHat,
  balanza:   Scale,
};

// ── Formulario de onboarding ──────────────────────────────────────────────────
export default function OnboardingPage() {
  const [nombre, setNombre] = useState('');
  const [mayorista, setMayorista] = useState(true);
  const [minorista, setMinorista] = useState(true);
  const [plan, setPlan] = useState<PlanId>('market');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await crearTenant({
      nombreNegocio: nombre,
      habilitaMayorista: mayorista,
      habilitaMinorista: minorista,
      plan,
    });

    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? 'Ocurrió un error. Intentá de nuevo.');
      return;
    }

    // Recarga completa para que el middleware lea el nuevo tenant desde la sesión
    window.location.href = '/dashboard';
  }

  if (loading) return <LoadingScreen />;

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
                {PLANES_ARRAY.map((p) => {
                  const Icon = PLAN_ICONS[p.id] ?? Store;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlan(p.id)}
                      className={cn(
                        'text-left p-3.5 rounded-lg border transition-all relative group',
                        plan === p.id
                          ? 'bg-primary/5 border-primary/40 shadow-[0_0_0_1px_oklch(var(--primary)_/_0.2)]'
                          : 'bg-background/40 border-border/40 hover:border-border',
                      )}
                    >
                      {plan === p.id && (
                        <span className="absolute top-2.5 right-2.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                        </span>
                      )}
                      <Icon className={cn(
                        'h-4 w-4 mb-2 transition-colors',
                        plan === p.id ? 'text-primary' : 'text-muted-foreground',
                      )} strokeWidth={1.75} />
                      <p className="text-sm font-medium pr-5">{p.nombre.replace('Gesto ', '')}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{p.descripcion}</p>
                    </button>
                  );
                })}
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

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-medium glow-primary"
              disabled={!nombre.trim() || (!mayorista && !minorista)}
            >
              Empezar prueba gratuita →
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
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
        checked ? 'bg-primary/5 border-primary/20' : 'bg-background/40 border-border/40 hover:border-border',
      )}
    >
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
