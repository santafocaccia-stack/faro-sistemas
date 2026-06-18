import { listarHistorial } from '@/server/actions/pedidos-atmosfericos';
import { HistorialClient } from '@/components/atmosfericos/historial-client';

export const dynamic = 'force-dynamic';

export default async function HistorialPage() {
  const dias = await listarHistorial();
  return <HistorialClient dias={dias} />;
}
