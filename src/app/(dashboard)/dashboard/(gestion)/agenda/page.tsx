import { listarTurnos, listarVencimientos } from '@/server/actions/agenda';
import { listarClientes } from '@/server/actions/clientes';
import { hoyArgentina } from '@/lib/fechas';
import { AgendaClient } from './agenda-client';

export const dynamic = 'force-dynamic';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; nuevo?: string; titulo?: string; clienteId?: string }>;
}) {
  const sp = await searchParams;
  const offset = Number(sp?.semana ?? 0) || 0;

  // Lunes de la semana según el calendario ARGENTINO (el server corre en UTC:
  // usar new Date() directo corría toda la semana un día).
  const hoy = hoyArgentina();
  const day = hoy.getDay(); // 0=domingo
  const diffLunes = (day === 0 ? -6 : 1 - day) + offset * 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  // Rango como instantes reales de Buenos Aires (UTC-3)
  const desde = new Date(`${ymd(lunes)}T00:00:00-03:00`).toISOString();
  const hasta = new Date(`${ymd(domingo)}T23:59:59.999-03:00`).toISOString();

  const [turnos, vencimientos, clientes] = await Promise.all([
    listarTurnos(desde, hasta),
    listarVencimientos(),
    listarClientes(),
  ]);

  return (
    <AgendaClient
      turnos={turnos.map((t) => ({ ...t, inicio: t.inicio.toISOString() }))}
      vencimientos={vencimientos}
      clientes={clientes.map((c) => ({
        id: c.id, razonSocial: c.razonSocial,
        direccion: c.direccion ?? null, localidad: c.localidad ?? null,
      }))}
      lunesYmd={ymd(lunes)}
      offset={offset}
      prefill={sp?.nuevo ? { titulo: sp.titulo ?? '', clienteId: sp.clienteId ?? '' } : null}
    />
  );
}
