'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Receipt, ScanLine, Plus, Check } from 'lucide-react';
import { fmtARS, type RubroDemo, type DemoItem } from './landing-data';

/* Sección "El mostrador": demo interactivo del POS, adaptado al rubro activo. */
export function LandingPos({ rubro }: { rubro: RubroDemo }) {
  const [cart, setCart] = useState<DemoItem[]>([]);
  const [cobrado, setCobrado] = useState(false);

  // Al cambiar de rubro, reseteamos el ticket.
  useEffect(() => {
    setCart([]);
    setCobrado(false);
  }, [rubro.id]);

  const total = cart.reduce((a, c) => a + c.precio, 0);

  function agregar(item: DemoItem) {
    if (cobrado) {
      setCart([item]);
      setCobrado(false);
    } else {
      setCart((c) => [...c, item]);
    }
  }

  // Agrupamos por nombre para mostrar "×N" en el ticket.
  const agrupado = useMemo(() => {
    const map = new Map<string, { precio: number; cant: number }>();
    for (const c of cart) {
      const prev = map.get(c.nombre);
      if (prev) prev.cant += 1;
      else map.set(c.nombre, { precio: c.precio, cant: 1 });
    }
    return [...map.entries()];
  }, [cart]);

  return (
    <section className="gl-blk gl-wrap gl-reveal">
      <div className="gl-shead">
        <span className="gl-eyebrow">Probalo vos mismo</span>
        <h2>Mirá lo rápido que es</h2>
        <p>
          Tocá los productos y armá el ticket. En tu local lo hacés con el escáner: pasás el producto y{' '}
          <em>{rubro.accionWord}</em>.
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
            <Receipt /> Ticket
          </div>
          <div className="gl-ticketbody">
            {cobrado ? (
              <div className="gl-done">
                <div className="gl-ck">
                  <Check strokeWidth={2.6} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>¡Listo! Comprobante generado</div>
                  <div style={{ fontSize: 12, color: 'var(--gl-dim)', marginTop: 3 }}>
                    Así de rápido, sin levantar la vista
                  </div>
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
            <button className="gl-cobrar" disabled={cart.length === 0} onClick={() => cart.length > 0 && setCobrado(true)}>
              {rubro.accion}
            </button>
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
