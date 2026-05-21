import { Suspense } from 'react';
import { obtenerKpisDashboard, obtenerProgresoOnboarding } from '@/server/actions/dashboard';
import { requireSession } from '@/server/auth/session';
import { OnboardingWizard } from '@/components/onboarding-wizard';
import { DashboardClient } from './dashboard-client';

/* ─────────────────────────────────────────────────────────────
   Helpers (corren en servidor, hora de Argentina)
───────────────────────────────────────────────────────────── */
function getSaludo(horaAR: number): string {
  if (horaAR >= 6 && horaAR < 13) return 'Buenos días';
  if (horaAR >= 13 && horaAR < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function getMensajeMotivacional(cantHoy: number, totalHoy: number): string {
  if (cantHoy === 0) return '';
  if (cantHoy === 1) return '¡Arrancó el día con la primera venta!';
  if (cantHoy < 5)  return `${cantHoy} ventas en el día, buen ritmo.`;
  if (cantHoy < 10) return `${cantHoy} ventas hoy — vas muy bien.`;
  return `${cantHoy} ventas hoy — ¡día redondo!`;
}

function getNombre(email: string): string {
  // "tomas@gmail.com" → "tomas"
  return email.split('@')[0] ?? 'ahí';
}

/* ─────────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────────── */
// Componente interno con los datos — se suspende mientras carga
async function DashboardContent() {
  const [session, kpis, progreso] = await Promise.all([
    requireSession(),
    obtenerKpisDashboard(),
    obtenerProgresoOnboarding(),
  ]);

  // Hora local Argentina (UTC-3, sin ajuste DST necesario para saludo)
  const ahoraAR = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }),
  );
  const horaAR   = ahoraAR.getHours();
  const saludo   = getSaludo(horaAR);
  const nombre   = getNombre(session.email ?? 'usuario');

  // Fecha larga en español
  const fechaLabel = ahoraAR.toLocaleDateString('es-AR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  });

  // Valores derivados
  const totalHoy      = kpis.ventasHoy.minorista.total + kpis.ventasHoy.mayorista.total;
  const cantHoy       = kpis.ventasHoy.minorista.cantidad + kpis.ventasHoy.mayorista.cantidad;
  const mensajeMotivacional = getMensajeMotivacional(cantHoy, totalHoy);

  return (
    <div>
      {/* Wizard de onboarding — sólo si faltan pasos */}
      {!progreso.completado && (
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 max-w-3xl mx-auto">
          <OnboardingWizard progreso={progreso} />
        </div>
      )}

      <DashboardClient
        saludo={saludo}
        nombre={nombre}
        fechaLabel={fechaLabel}
        totalHoy={totalHoy}
        cantHoy={cantHoy}
        mensajeMotivacional={mensajeMotivacional}
        totalSemana={kpis.ventasSemana.total}
        cantSemana={kpis.ventasSemana.cantidad}
        cobrosTotal={kpis.pendienteCC.total}
        cobrosCant={kpis.pendienteCC.cantidad}
        stockBajo={kpis.stockBajo}
        totalMinorista={kpis.ventasHoy.minorista.total}
        totalMayorista={kpis.ventasHoy.mayorista.total}
        ultimasVentas={kpis.ultimasVentas}
      />
    </div>
  );
}

// Skeleton mientras los KPIs cargan
function DashboardSkeleton() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
