import {
  Check, X, NotebookPen, Sparkles, ShoppingCart, ScanLine, BookOpen, BarChart3, FileText, Users,
} from 'lucide-react';
import { PLANES_ARRAY } from '@/lib/planes';
import { fmtARS } from './landing-data';

/* ── Antes / Después ─────────────────────────────────────────────────────── */
export function AntesDespues() {
  const sin = [
    'Cuaderno, calculadora y a sumar a mano',
    'El fiado en papelitos que se pierden',
    '"¿Cuánto gané?" — ni idea hasta fin de mes',
    'El stock lo sabés cuando te quedás sin nada',
  ];
  const con = [
    'Cobrás con código de barras o por kilo',
    'El fiado de cada cliente, siempre al día',
    'Cuánto vendiste y ganaste, en tiempo real',
    'Stock que se descuenta solo en cada venta',
  ];
  return (
    <section className="gl-blk gl-wrap gl-reveal">
      <div className="gl-shead">
        <span className="gl-eyebrow">El antes y el después</span>
        <h2>¿Cuánto vendiste hoy?</h2>
        <p>La misma pregunta, dos mundos. Gesto cambia el segundo.</p>
      </div>
      <div className="gl-adgrid">
        <div className="gl-ad gl-bad">
          <span className="gl-adtag">
            <NotebookPen style={{ height: 14, width: 14 }} /> Sin Gesto
          </span>
          <ul>
            {sin.map((t) => (
              <li key={t}>
                <X strokeWidth={2} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="gl-ad gl-good">
          <span className="gl-adtag">
            <Sparkles style={{ height: 14, width: 14 }} /> Con Gesto
          </span>
          <div className="gl-admoney">
            <span className="gl-m">{fmtARS(142300)}</span>
            <span className="gl-s">37 ventas hoy</span>
          </div>
          <ul>
            {con.map((t) => (
              <li key={t}>
                <Check strokeWidth={2} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── Features (bento) ────────────────────────────────────────────────────── */
const FEATS = [
  { Icon: ShoppingCart, h: 'Punto de venta veloz', p: 'Cobrá con lector de códigos o por kilo. Carrito que recalcula precios por canal mayorista o minorista.', span: true },
  { Icon: ScanLine, h: 'Stock que se cuida solo', p: 'Cada venta descuenta el stock al instante. Te avisa antes de que te quedes sin nada.' },
  { Icon: BookOpen, h: 'Fiado ordenado', p: 'La cuenta corriente de cada cliente, siempre al día. Nada de papelitos sueltos.' },
  { Icon: BarChart3, h: 'Reportes en vivo', p: 'Cuánto vendiste y ganaste hoy, esta semana, este mes. Sin esperar al contador.' },
  { Icon: FileText, h: 'Presupuestos en PDF', p: 'Armás el presupuesto y lo mandás por WhatsApp en segundos, con tu marca.' },
  { Icon: Users, h: 'Tu equipo, con permisos', p: 'El empleado opera la caja; vos ves los números. Cada quien con su acceso.' },
];

export function Features() {
  return (
    <section className="gl-blk gl-wrap gl-reveal">
      <div className="gl-shead">
        <span className="gl-eyebrow">Todo en una</span>
        <h2>Las herramientas del negocio, juntas</h2>
        <p>Sin planillas sueltas ni cinco apps distintas. Cada función habla con las demás.</p>
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
        <h2>Un plan para tu rubro</h2>
        <p>Precios en dólares para no licuarse con la inflación. Pagás en pesos al dólar MEP del día.</p>
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
                {plan.proximamente && <span className="gl-soon">Próximamente</span>}
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
          <span className="gl-logo" style={{ height: 28, width: 28, fontSize: 14 }}>
            G
          </span>
          Gesto · Gestión comercial para PyMEs argentinas
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
