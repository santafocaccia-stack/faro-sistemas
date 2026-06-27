import { Wallet } from 'lucide-react';
import { requireAdmin } from '@/server/auth/session';
import {
  obtenerBalanceMensual,
  listarGastos,
  obtenerAnalisisMes,
  obtenerConfigBalanceAuto,
} from '@/server/actions/gastos';
import { categoriasGasto } from '@/lib/gastos';
import { PageHeader } from '@/components/ui/page-header';
import { GastosClient } from './gastos-client';

export const dynamic = 'force-dynamic';

export default async function GastosPage() {
  const session = await requireAdmin();
  const [balance, gastos, analisis, configAuto] = await Promise.all([
    obtenerBalanceMensual(),
    listarGastos(monthOf()),
    obtenerAnalisisMes(),
    obtenerConfigBalanceAuto(),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-5xl mx-auto space-y-6 animate-fade-up">
      <PageHeader
        icon={Wallet}
        title="Gastos y balance"
        subtitle="Cargá tus gastos y mirá la ganancia real del mes, con análisis automático"
      />
      <GastosClient
        mesInicial={balance.mes}
        balanceInicial={balance}
        analisisInicial={analisis}
        configAuto={configAuto}
        gastosIniciales={gastos.map((g) => ({
          id: g.id,
          fecha: g.fecha.toISOString(),
          categoria: g.categoria,
          monto: g.monto,
          descripcion: g.descripcion,
          metodoPago: g.metodoPago,
        }))}
        categorias={[...categoriasGasto(session.plan)]}
      />
    </div>
  );
}

/** Mes actual ART (igual criterio que el server action). */
function monthOf(): string {
  const ar = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  return `${ar.getFullYear()}-${String(ar.getMonth() + 1).padStart(2, '0')}`;
}
