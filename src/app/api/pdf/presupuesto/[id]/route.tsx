import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { obtenerPresupuesto } from '@/server/actions/presupuestos';
import { obtenerTenant } from '@/server/actions/config';
import { PresupuestoPDF } from '@/components/pdf-document';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
}
