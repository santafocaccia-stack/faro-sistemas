import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { obtenerPresupuesto } from '@/server/actions/presupuestos';
import { obtenerTenant } from '@/server/actions/config';
import { PresupuestoPDF } from '@/components/pdf-document';
import { requireSession } from '@/server/auth/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth explícita: requireSession() puede lanzar un redirect() que en
  // un route handler no es capturado como respuesta HTTP → lo manejamos acá.
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const [data, tenant] = await Promise.all([
      obtenerPresupuesto(id),
      obtenerTenant(),
    ]);

    if (!data) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
    }

    const { pres, lineas, clienteDisplay } = data;

    const buffer = await renderToBuffer(
      <PresupuestoPDF
        numero={pres.numero}
        fecha={pres.fecha}
        clienteNombre={clienteDisplay}
        lineas={lineas.map((l) => ({
          descripcion:    l.descripcion,
          cantidad:       l.cantidad,
          precioUnitario: l.precioUnitario,
          subtotal:       l.subtotal,
          esServicio:     !l.productoId,
        }))}
        subtotal={pres.subtotal}
        descuento={pres.descuento}
        total={pres.total}
        notas={pres.notas}
        negocioNombre={tenant?.nombre ?? 'Mi negocio'}
        negocioCuit={tenant?.cuit}
        validezDias={pres.validezDias}
        estado={pres.estado}
      />,
    );

    const filename = `presupuesto-${String(pres.numero).padStart(5, '0')}.pdf`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[PDF presupuesto]', err);
    return NextResponse.json({ error: 'Error al generar el PDF' }, { status: 500 });
  }
}
