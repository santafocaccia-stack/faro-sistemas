import {
  Check, X, NotebookPen, Sparkles, ShoppingCart, BookOpen, Package, BarChart3, FileText, Users,
} from 'lucide-react';
import { PLANES_ARRAY } from '@/lib/planes';
import { fmtARS } from './landing-data';

/* ── Antes / Después ─────────────────────────────────────────────────────── */
export function AntesDespues() {
  const sin = [
    'El cuaderno, la calculadora y a sumar a mano',
    'El fiado anotado en papelitos que se pierden',
    'No sabés cuánto te queda hasta fin de mes',
    'Te enterás que falta stock cuando ya no hay',
  ];
  const con = [
    'Cobrás y la venta queda anotada sola',
    'El fiado de cada cliente, siempre claro',
    'Sabés cuánto vendiste y cuánto te queda, en el momento',
    'El stock se descuenta solo en cada venta',
  ];
  return (
    <section className="gl-blk gl-wrap gl-reveal">
      <div className="gl-shead">
        <span className="gl-eyebrow">Antes y después</span>
        <h2>¿Cuánto vendiste hoy?</h2>
        <p>La misma pregunta, dos respuestas. Con Gesto la sabés sin pensar.</p>
      </div>
      <div className="gl-adgrid">
        <div className="gl-ad gl-bad">
          <span className="gl-adtag">
            <NotebookPen style={{ height: 17, width: 17 }} /> Sin Gesto
          </span>
          <ul>
            {sin.map((t) => (
              <li key={t}>
                <X strokeWidth={2.4} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="gl-ad gl-good">
          <span className="gl-adtag">
            <Sparkles style={{ height: 17, width: 17 }} /> Con Gesto
          </span>
          <div className="gl-admoney">
            <span className="gl-m">{fmtARS(142300)}</span>
            <span className="gl-s">37 ventas hoy</span>
          </div>
          <ul>
            {con.map((t) => (
              <li key={t}>
                <Check strokeWidth={2.4} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── Features (bento) — ventajas, no funciones técnicas ──────────────────── */
const FEATS = [
  { Icon: ShoppingCart, h: 'Cobrá sin hacer esperar', p: 'Escaneás el producto y listo. La cola se mueve y nadie se va sin comprar.', span: true },
  { Icon: BookOpen, h: 'Que no se te escape el fiado', p: 'La cuenta de cada cliente, siempre clara. Quién te debe y cuánto, sin papelitos.' },
  { Icon: Package, h: 'Sabé qué te queda', p: 'El stock se descuenta solo en cada venta. Te avisa antes de que te quedes sin nada.' },
  { Icon: BarChart3, h: 'Mirá cómo va tu negocio', p: 'Cuánto vendiste y cuánto ganaste, hoy o este mes. Sin esperar a nadie.' },
  { Icon: FileText, h: 'Presupuestos en un toque', p: 'Lo armás, lo mandás por WhatsApp y queda guardado. Con tu nombre.' },
  { Icon: Users, h: 'Tu empleado atiende, vos mirás', p: 'Cada uno con su acceso: el que atiende usa la caja, vos ves los números.' },
];

export function Features() {
  return (
    <section className="gl-blk gl-wrap gl-reveal">
      <div className="gl-shead">
        <span className="gl-eyebrow">Todo en una</span>
        <h2>Lo que tu negocio necesita, junto</h2>
        <p>Sin planillas sueltas ni cinco apps distintas. Una sola, y desde el celular.</p>
      </div>
      <div className="gl-bento">
        {FEATS.map(({ Icon, h, p, span }) => (
          <div key={h} className={`gl-feat${span ? ' gl-span2' : ''}`}>
            <div className="gl-fi">
              <Icon strokeWidth={2} />
            </div>
            <h3>{h}</h3>
            <p>{p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Planes (precio en USD, cobrado en pesos al MEP) ─────────────────────── */
export function Pricing({ dolarMep }: { dolarMep: number }) {
  return (
    <section id="precios" className="gl-blk gl-wrap gl-reveal">
      <div className="gl-shead">
        <span className="gl-eyebrow">Precios</span>
        <h2>Un plan para lo tuyo</h2>
        <p>Precios en dólares para que no se los coma la inflación. Pagás en pesos, al dólar MEP del día.</p>
      </div>
      <div className="gl-pricegrid">
        {PLANES_ARRAY.map((plan) => {
          const ars = Math.round(plan.precioUsd * dolarMep);
          return (
            <div
              key={plan.id}
              className="gl-plan"
              style={plan.proximamente ? undefined : { borderColor: `color-mix(in oklch, ${plan.color} 33%, transparent)` }}
            >
              <div className="gl-plantop">
                <h3>
                  <span className="gl-pdot" style={{ background: plan.color }} />
                  {plan.nombre.replace('Gesto ', '')}
                </h3>
                {plan.proximamente && <span className="gl-soon">Pronto</span>}
              </div>
              <div className="gl-pd">{plan.descripcion}</div>
              <div className="gl-pprice">
                <span className="gl-u">USD {plan.precioUsd}</span>
                <span className="gl-per">/mes</span>
              </div>
              <div className="gl-pars">≈ {fmtARS(ars)} por mes</div>
              <ul>
                {plan.features.map((f) => (
                  <li key={f}>
                    <Check strokeWidth={2.4} style={{ color: plan.color }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/signup"
                className="gl-pbtn"
                style={
                  plan.proximamente
                    ? { background: 'var(--gl-raised)', color: 'var(--muted-foreground)', border: '1px solid var(--border)' }
                    : { background: plan.color, color: 'var(--gl-ink)' }
                }
              >
                {plan.proximamente ? 'Avisame cuando salga' : 'Probar 14 días gratis'}
              </a>
            </div>
          );
        })}
      </div>
      <p className="gl-pricenote">Dólar MEP de referencia: {fmtARS(dolarMep)} · Cancelás cuando quieras, sin permanencia.</p>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
export function LandingFooter() {
  return (
    <footer className="gl-footer">
      <div className="gl-wrap gl-footin">
        <div className="gl-fb">
          <span className="gl-logo" style={{ height: 30, width: 30, fontSize: 16 }}>
            G
          </span>
          Gesto · El sistema para tu negocio
        </div>
        <div className="gl-footlinks">
          <a className="gl-link" href="/login">Ingresar</a>
          <a className="gl-link" href="/signup">Crear cuenta</a>
          <a className="gl-link" href="#precios">Precios</a>
        </div>
      </div>
    </footer>
  );
}
