import { listarTurnos, listarVencimientos } from '@/server/actions/agenda';
import { AgendaClient } from './agenda-client';

export const dynamic = 'force-dynamic';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const sp = await searchParams;
  const offset = Number(sp?.semana ?? 0) || 0;

  // Lunes de la semana (con offset de semanas)
  const hoy = new Date();
  const day = hoy.getDay(); // 0=domingo
  const diffLunes = (day === 0 ? -6 : 1 - day) + offset * 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  lunes.setHours(0, 0, 0, 0);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  domingo.setHours(23, 59, 59, 999);

  const [turnos, vencimientos] = await Promise.all([
    listarTurnos(lunes.toISOString(), domingo.toISOString()),
    listarVencimientos(),
  ]);

  return (
    <AgendaClient
      turnos={turnos.map((t) => ({ ...t, inicio: t.inicio.toISOString() }))}
      vencimientos={vencimientos}
      lunesISO={lunes.toISOString()}
      offset={offset}
    />
  );
}
