'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ShoppingCart, Receipt, ScanLine, Plus, RotateCcw, Check } from 'lucide-react';
import { fmtARS, hexToRgba, SOBRE_ACENTO, type RubroDemo, type DemoItem } from './landing-data';

/* Sección "Probalo vos mismo": demo interactivo del POS que IMPRIME un ticket
   de papel al cobrar, adaptado al rubro activo. */
export function LandingPos({ rubro }: { rubro: RubroDemo }) {
  const [cart, setCart] = useState<DemoItem[]>([]);
  const [recibo, setRecibo] = useState<{ n: string; hora: string } | null>(null);

  // Al cambiar de rubro, reseteamos el ticket.
  useEffect(() => {
    setCart([]);
    setRecibo(null);
  }, [rubro.id]);

  const cobrado = recibo !== null;
  const total = cart.reduce((a, c) => a + c.precio, 0);

  function agregar(item: DemoItem) {
    if (cobrado) {
      setCart([item]);
      setRecibo(null);
    } else {
      setCart((c) => [...c, item]);
    }
  }

  function cobrar() {
    if (!cart.length) return;
    const d = new Date();
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    setRecibo({ n: String(Math.floor(1000 + Math.random() * 8999)), hora });
  }

  function nueva() {
    setCart([]);
    setRecibo(null);
  }

  // Agrupamos por nombre para mostrar "×N".
  const agrupado = useMemo(() => {
    const map = new Map<string, { precio: number; cant: number }>();
    for (const c of cart) {
      const prev = map.get(c.nombre);
      if (prev) prev.cant += 1;
      else map.set(c.nombre, { precio: c.precio, cant: 1 });
    }
    return [...map.entries()];
  }, [cart]);

  const accentStyle = {
    ['--gl-accent']: rubro.acento,
    ['--gl-soft']: hexToRgba(rubro.acento, 0.14),
    ['--gl-ink']: SOBRE_ACENTO,
  } as CSSProperties;

  return (
    <section className="gl-blk gl-wrap gl-reveal" style={accentStyle}>
      <div className="gl-shead">
        <span className="gl-eyebrow">Probalo vos mismo</span>
        <h2>Mirá lo rápido que es</h2>
        <p>
          Tocá los productos, cobrá y mirá cómo sale el ticket. En tu local lo hacés con el escáner: pasás el producto
          y <em>{rubro.accionWord}</em>.
        </p>
      </div>

      <div className="gl-posgrid">
        {/* Productos */}
        <div className="gl-poscard">
          <div className="gl-poshead">
            <ShoppingCart />
            <span>{rubro.caja}</span>
            <span className="gl-scan">
              <ScanLine style={{ height: 13, width: 13 }} /> Lector listo
            </span>
          </div>
          <div className="gl-prodgrid">
            {rubro.items.map((it) => (
              <button key={it.nombre} className="gl-prod" onClick={() => agregar(it)}>
                <span className="gl-padd">
                  <Plus strokeWidth={2.6} />
                </span>
                <div className="gl-pn">{it.nombre}</div>
                <div className="gl-pp">{fmtARS(it.precio)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Ticket */}
        <div className="gl-poscard gl-ticket">
          <div className="gl-tickethead">
            <Receipt /> {cobrado ? 'Comprobante' : 'Ticket'}
          </div>
          <div className="gl-ticketbody">
            {cobrado && recibo ? (
              <div className="gl-receipt-wrap">
                <div className="gl-receipt">
                  <div className="gl-receipt-brand">GESTO</div>
                  <div className="gl-receipt-sub">{rubro.tenant}</div>
                  <div className="gl-receipt-meta">
                    Comp. #{recibo.n} · {recibo.hora} hs
                  </div>
                  <div className="gl-receipt-sep" />
                  {agrupado.map(([nombre, o]) => (
                    <div key={nombre} className="gl-receipt-line">
                      <span className="gl-receipt-qty">{o.cant}×</span>
                      <span className="gl-receipt-name">{nombre}</span>
                      <span className="gl-receipt-amt">{fmtARS(o.precio * o.cant)}</span>
                    </div>
                  ))}
                  <div className="gl-receipt-sep" />
                  <div className="gl-receipt-total">
                    <span>TOTAL</span>
                    <span>{fmtARS(total)}</span>
                  </div>
                  <div className="gl-receipt-pay">Pago en efectivo · ¡Gracias!</div>
                  <div className="gl-receipt-barcode" />
                  <div className="gl-receipt-foot">gesto.com.ar</div>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="gl-empty">
                <Receipt strokeWidth={1.6} />
                Tocá un producto para sumarlo al ticket
              </div>
            ) : (
              agrupado.map(([nombre, o]) => (
                <div key={nombre} className="gl-citem">
                  <span className="gl-cn">
                    {nombre} {o.cant > 1 && <span className="gl-cq">×{o.cant}</span>}
                  </span>
                  <span className="gl-cp">{fmtARS(o.precio * o.cant)}</span>
                </div>
              ))
            )}
          </div>
          <div className="gl-ticketfoot">
            <div className="gl-tickettotal">
              <span className="gl-tl">Total</span>
              <span className="gl-tv">{fmtARS(total)}</span>
            </div>
            {cobrado ? (
              <button className="gl-cobrar gl-cobrar-alt" onClick={nueva}>
                <RotateCcw style={{ height: 17, width: 17 }} strokeWidth={2.4} /> Nueva venta
              </button>
            ) : (
              <button className="gl-cobrar" disabled={cart.length === 0} onClick={cobrar}>
                {rubro.accion}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="gl-incl">
        {rubro.incluye.map((f) => (
          <span key={f}>
            <Check strokeWidth={2.4} /> {f}
          </span>
        ))}
      </div>
    </section>
  );
}
