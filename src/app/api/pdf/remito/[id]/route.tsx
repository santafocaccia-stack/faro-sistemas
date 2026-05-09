import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { obtenerVenta } from '@/server/actions/ventas';
import { obtenerTenant } from '@/server/actions/config';
import { RemitoPDF } from '@/components/pdf-document';

const METODO_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  transferencia:   'Transferencia',
  tarjeta_debito:  'Tarjeta débito',
  tarjeta_credito: 'Tarjeta crédito',
  mercado_pago:    'Mercado Pago',
  cheque:          'Cheque',
  otro:            'Otro',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [data, tenant] = await Promise.all([
    obtenerVenta(id),
    obtenerTenant(),
  ]);

  if (!data) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  const { venta, clienteNombre, lineas, metodoPago } = data;

  const buffer = await renderToBuffer(
    <RemitoPDF
      numero={venta.numero}
      fecha={venta.fecha}
      clienteNombre={clienteNombre ?? 'Sin cliente'}
      lineas={lineas.map((l) => ({
        descripcion:    l.descripcion,
        cantidad:       l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal:       l.subtotal,
      }))}
      subtotal={venta.subtotal}
      descuento={venta.descuento}
      total={venta.total}
      notas={venta.notas}
      negocioNombre={tenant?.nombre ?? 'Mi negocio'}
      negocioCuit={tenant?.cuit}
      metodoPago={metodoPago ? (METODO_LABEL[metodoPago] ?? metodoPago) : null}
    />,
  );

  const filename = `remito-${String(venta.numero).padStart(5, '0')}.pdf`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
