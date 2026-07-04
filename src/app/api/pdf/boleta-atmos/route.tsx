import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { and, eq } from 'drizzle-orm';
import { withTenant } from '@/server/db';
import { pedidosAtmosfericos, clientes } from '@/server/db/schema';
import { byTenant } from '@/server/db/tenant-context';
import { obtenerTenant } from '@/server/actions/config';
import { requireSession } from '@/server/auth/session';
import { BoletaAtmosPDF } from '@/components/pdf-boleta-atmos';
import { METODO_LABEL } from '@/lib/constants';

/**
 * Boleta/recibo PDF para atmosféricos. Dos modos:
 *  - ?pedido=<id>  → toma los datos del pedido completado (seguro, desde DB).
 *  - datos sueltos → ?direccion=&monto=&fecha=&litros=&metodo=&cliente=
 *    (boleta manual, ajena a un pedido).
 */
export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const sp = req.nextUrl.searchParams;
    const tenant = await obtenerTenant();

    let direccion = '';
    let clienteNombre: string | null = null;
    let litros: string | null = null;
    let monto = '0';
    let fecha: string = new Date().toISOString().slice(0, 10);
    let metodo: string | null = null;

    const pedidoId = sp.get('pedido');

    if (pedidoId) {
      const [row] = await withTenant(session.tenantId, (db) =>
        db
        .select({
          direccion:       pedidosAtmosfericos.direccion,
          localidad:       pedidosAtmosfericos.localidad,
          litrosExtraidos: pedidosAtmosfericos.litrosExtraidos,
          montoCobrado:    pedidosAtmosfericos.montoCobrado,
          metodoPago:      pedidosAtmosfericos.metodoPago,
          completadoAt:    pedidosAtmosfericos.completadoAt,
          fechaProgramada: pedidosAtmosfericos.fechaProgramada,
          nombreContacto:  pedidosAtmosfericos.nombreContacto,
          clienteNombre:   clientes.razonSocial,
        })
        .from(pedidosAtmosfericos)
        .leftJoin(clientes, eq(pedidosAtmosfericos.clienteId, clientes.id))
        .where(and(byTenant(session.tenantId, pedidosAtmosfericos), eq(pedidosAtmosfericos.id, pedidoId)))
        .limit(1),
      );

      if (!row) {
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }

      direccion = [row.direccion, row.localidad].filter(Boolean).join(', ');
      clienteNombre = row.clienteNombre ?? row.nombreContacto ?? null;
      litros = row.litrosExtraidos;
      monto = row.montoCobrado ?? '0';
      metodo = row.metodoPago;
      fecha = row.completadoAt
        ? new Date(row.completadoAt).toISOString().slice(0, 10)
        : (row.fechaProgramada as unknown as string);
    } else {
      // Boleta manual
      direccion = sp.get('direccion')?.trim() || '';
      clienteNombre = sp.get('cliente')?.trim() || null;
      litros = sp.get('litros')?.trim() || null;
      monto = sp.get('monto')?.trim() || '0';
      metodo = sp.get('metodo')?.trim() || null;
      fecha = sp.get('fecha')?.trim() || fecha;

      if (!direccion || Number(monto) <= 0) {
        return NextResponse.json({ error: 'Faltan datos (dirección y monto)' }, { status: 400 });
      }
    }

    // Número de recibo: AAAAMMDD (referencia simple por día)
    const numero = sp.get('numero')?.trim() || fecha.replace(/-/g, '');
    const metodoLabel = metodo ? (METODO_LABEL[metodo] ?? metodo) : null;

    // renderToBuffer de @react-pdf renderiza sincrónicamente en el server y SÍ
    // propaga errores a este try/catch — la regla apunta a React DOM, no aplica.
    const buffer = await renderToBuffer(
      // eslint-disable-next-line react-hooks/error-boundaries
      <BoletaAtmosPDF
        numero={numero}
        fecha={fecha}
        direccion={direccion}
        clienteNombre={clienteNombre}
        litros={litros}
        monto={monto}
        metodoPago={metodoLabel}
        negocioNombre={tenant?.nombre ?? 'Mi negocio'}
        negocioCuit={tenant?.cuit}
        negocioTelefono={tenant?.telefono}
      />,
    );

    const filename = `recibo-${numero}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[PDF boleta-atmos]', err);
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}
