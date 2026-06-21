'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Search, Command, ShoppingCart, ArrowRight, UsersRound, Settings, LogOut, Bell,
  CalendarDays, Lock, Store, TrendingUp, Check,
} from 'lucide-react';
import { navParaRol } from '@/lib/nav';
import { planTiene } from '@/lib/planes';
import { RUBROS, SOBRE_ACENTO, fmtARS, hexToRgba, type RubroDemo } from './landing-data';
import { LandingPos } from './landing-pos';
import { ScanShowcase } from './landing-scan';
import { AntesDespues, Features, Pricing, Faq, LandingFooter } from './landing-sections';
import './landing.css';

const MARQUEE = ['Vendé', 'Cobrá', 'Cuenta corriente al día', 'Mirá tus números', 'Cargá el stock', 'Pasá presupuestos'];

export function LandingClient({ dolarMep }: { dolarMep: number }) {
  const [rubro, setRubro] = useState<RubroDemo>(RUBROS[0]!);
  const [auto, setAuto] = useState(true);
  const [hovering, setHovering] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-rotación del switcher: muestra cada rubro solo, hasta que el usuario
  // elige uno (click) o mientras pasa el mouse por encima del selector.
  useEffect(() => {
    if (!auto || hovering) return;
    const id = setInterval(() => {
      setRubro((cur) => {
        const i = RUBROS.findIndex((r) => r.id === cur.id);
        return RUBROS[(i + 1) % RUBROS.length]!;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [auto, hovering]);

  function elegir(r: RubroDemo) {
    setAuto(false);
    setRubro(r);
  }

  // Scroll suave para los anclas del nav mientras la landing está montada.
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  // Reveal on scroll
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('gl-in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    root.querySelectorAll('.gl-reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const accentStyle = {
    ['--gl-accent']: rubro.acento,
    ['--gl-soft']: hexToRgba(rubro.acento, 0.14),
    ['--gl-ink']: SOBRE_ACENTO,
  } as CSSProperties;

  return (
    <div className="gl-root" ref={rootRef} style={accentStyle}>
      <div className="gl-grain" aria-hidden />
      <div className="gl-glow gl-glow-1" aria-hidden />
      <div className="gl-glow gl-glow-2" aria-hidden />

      {/* HEADER */}
      <header className="gl-header">
        <div className="gl-wrap gl-nav">
          <div className="gl-brand">
            <span className="gl-logo">G</span>Gesto
          </div>
          <nav className="gl-navlinks">
            <a href="#rubros">Cómo funciona</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#precios">Precios</a>
          </nav>
          <div className="gl-navcta">
            <a className="gl-btn gl-btn-ghost" href="/login">Ingresar</a>
            <a className="gl-btn gl-btn-fill" href="/signup">Empezá gratis</a>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="gl-hero">
          <div className="gl-wrap">
            <span className="gl-eyebrow">
              <Store style={{ height: 14, width: 14 }} strokeWidth={2.2} />
              El sistema para tu negocio
            </span>
            <h1 className="gl-h1">
              Tu negocio al alcance de <span className="gl-mark">tu mano</span>
            </h1>
            <p className="gl-sub">
              Cobrá, controlá la cuenta corriente y mirá cuánto vendiste. Todo en un solo lugar, y desde el
              celular — estés donde estés.
            </p>
            <div className="gl-herocta">
              <a className="gl-btn gl-btn-fill" style={{ height: 50, padding: '0 26px', fontSize: 16 }} href="/signup">
                Empezá gratis <ArrowRight style={{ height: 18, width: 18 }} strokeWidth={2.4} />
              </a>
              <a className="gl-btn gl-btn-line" style={{ height: 50, padding: '0 26px', fontSize: 16 }} href="#precios">
                Ver planes
              </a>
            </div>
            <div className="gl-stamps">
              <span className="gl-stamp gl-rot1">14 días gratis</span>
              <span className="gl-stamp gl-cream gl-rot2">Sin tarjeta</span>
              <span className="gl-stamp gl-rot3">Cancelás cuando quieras</span>
            </div>
          </div>

          {/* Franja marquee */}
          <div className="gl-marquee" aria-hidden>
            <div className="gl-mqtrack">
              {[0, 1].map((copy) => (
                <span key={copy} style={{ display: 'inline-flex' }}>
                  {MARQUEE.map((w) => (
                    <span key={w}>
                      {w}
                      <i className="gl-mqdot" />
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* POR DENTRO — switcher + ventana de app */}
        <section className="gl-blk gl-wrap gl-reveal" id="rubros">
          <div className="gl-shead">
            <span className="gl-eyebrow">Una app, tu rubro</span>
            <h2>Mirá cómo se ve por dentro</h2>
            <p>Elegí lo que tenés y la app se acomoda a tu negocio. Esto es lo que ves al entrar.</p>
          </div>

          <div
            className="gl-rubros"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {RUBROS.map((r) => {
              const on = r.id === rubro.id;
              const RIcon = r.chipIcon;
              return (
                <button
                  key={r.id}
                  className={`gl-rubro${on ? ' gl-on' : ''}`}
                  style={{ ['--r']: r.acento } as CSSProperties}
                  onClick={() => elegir(r)}
                  aria-pressed={on}
                >
                  <span className="gl-rubro-ic">
                    <RIcon strokeWidth={2} />
                  </span>
                  <span className="gl-rubro-tx">
                    <span className="gl-rubro-name">{r.chip}</span>
                    <span className="gl-rubro-tag">{r.chipTag}</span>
                  </span>
                  <span className="gl-rubro-check">
                    <Check strokeWidth={3} />
                  </span>
                  {on && auto && !hovering && <span key={r.id} className="gl-rubro-prog" />}
                </button>
              );
            })}
          </div>

          <AppWindow rubro={rubro} />
        </section>

        {/* Desde el celular — mockup de escaneo */}
        <ScanShowcase />

        {/* POS interactivo (comparte rubro) */}
        <LandingPos rubro={rubro} />

        {/* Beneficios */}
        <div id="beneficios">
          <Features />
        </div>

        {/* Antes / Después */}
        <AntesDespues />

        {/* Precios */}
        <Pricing dolarMep={dolarMep} />

        {/* Preguntas frecuentes */}
        <Faq />

        {/* CTA final */}
        <section className="gl-blk gl-wrap gl-reveal">
          <div className="gl-finale">
            <h2>Probá Gesto gratis 14 días</h2>
            <p>Creá tu cuenta, elegí tu rubro y empezá a cobrar. Sin tarjeta y sin vueltas.</p>
            <a className="gl-btn gl-btn-fill" style={{ height: 52, padding: '0 30px', fontSize: 17 }} href="/signup">
              Empezá gratis <ArrowRight style={{ height: 19, width: 19 }} strokeWidth={2.4} />
            </a>
          </div>
        </section>
      </main>

      <LandingFooter />

      {/* CTA fijo en mobile */}
      <div className="gl-stickycta">
        <a className="gl-btn gl-btn-fill" href="/signup">
          Empezá gratis · 14 días sin tarjeta
        </a>
      </div>
    </div>
  );
}

/* ── Ventana de la app (sidebar real por plan + dashboard del rubro) ──────── */
function AppWindow({ rubro }: { rubro: RubroDemo }) {
  const nav = navParaRol(rubro.id, 'owner').primary;
  const tienePOS = planTiene(rubro.id, 'pos');

  // Animación de barras: arrancan en 0 y suben al cambiar de rubro.
  const [barsReady, setBarsReady] = useState(false);
  useEffect(() => {
    setBarsReady(false);
    const t = setTimeout(() => setBarsReady(true), 40);
    return () => clearTimeout(t);
  }, [rubro.id]);

  const maxChart = Math.max(...rubro.chart);
  const dias = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <>
      <p className="gl-hint" style={{ textAlign: 'center', maxWidth: '52ch', margin: '22px auto 0' }}>
        {rubro.heroSub}
      </p>
      <div className="gl-stage">
        <div className="gl-window">
          <div className="gl-chrome">
            <div className="gl-lights">
              <i />
              <i />
              <i />
            </div>
            <div className="gl-url">
              <Lock style={{ height: 12, width: 12, opacity: 0.6 }} />
              app.gesto.com.ar/dashboard
            </div>
            <div className="gl-live">
              <span className="gl-dot" />
              en vivo
            </div>
          </div>

          <div className="gl-app">
            {/* SIDEBAR */}
            <aside className="gl-side">
              <div className="gl-sidehead">
                <span className="gl-logo">G</span>
                <div className="gl-meta">
                  <div className="gl-tn">{rubro.tenant}</div>
                  <div className="gl-pl">{rubro.planLabel}</div>
                </div>
              </div>
              <div className="gl-search">
                <Search style={{ height: 14, width: 14 }} strokeWidth={2} />
                Buscar...
                <span className="gl-kbd">
                  <Command style={{ height: 10, width: 10, verticalAlign: '-1px' }} />K
                </span>
              </div>
              {tienePOS && (
                <div className="gl-vender">
                  <ShoppingCart style={{ height: 17, width: 17 }} strokeWidth={2.2} />
                  Vender
                  <ArrowRight className="gl-ar" style={{ height: 14, width: 14 }} strokeWidth={2} />
                </div>
              )}
              <div className="gl-navlist gl-flex" style={tienePOS ? undefined : { paddingTop: 8 }}>
                {nav.map((item, i) => {
                  const Icon = item.icon;
                  const on = i === 0;
                  return (
                    <div key={item.href} className={`gl-navitem${on ? ' gl-on' : ''}`}>
                      <Icon strokeWidth={on ? 2 : 1.8} />
                      {item.label}
                    </div>
                  );
                })}
              </div>
              <div className="gl-navsec">Sistema</div>
              <div className="gl-navlist">
                <div className="gl-navitem">
                  <UsersRound strokeWidth={1.8} />
                  Equipo
                </div>
                <div className="gl-navitem">
                  <Settings strokeWidth={1.8} />
                  Configuración
                </div>
              </div>
              <div className="gl-sidefoot">
                <div className="gl-avatar">{rubro.tenant.charAt(0)}</div>
                <div className="gl-uinfo">
                  <div className="gl-un">{rubro.user}</div>
                  <div className="gl-ue">@gesto.app</div>
                </div>
                <LogOut style={{ height: 15, width: 15, color: 'var(--gl-dim)', marginLeft: 'auto' }} strokeWidth={1.9} />
              </div>
            </aside>

            {/* MAIN */}
            <div className="gl-main">
              <div className="gl-topbar">
                <div>
                  <div className="gl-tt">{rubro.title}</div>
                  <div className="gl-td">Sábado 21 de junio · actualizado recién</div>
                </div>
                <div className="gl-actions">
                  <span className="gl-pillbtn">
                    <CalendarDays style={{ height: 14, width: 14 }} strokeWidth={2} />
                    Hoy
                  </span>
                  <div className="gl-iconbtn">
                    <Bell strokeWidth={1.9} />
                  </div>
                </div>
              </div>
              <div className="gl-screen">
                <div className="gl-kpis">
                  {rubro.kpis.map((k) => (
                    <div key={k.l} className={`gl-kpi${k.hl ? ' gl-hl' : ''}`}>
                      <div className="gl-kl">{k.l}</div>
                      <div className="gl-kv">
                        <CountUp value={k.v} money={k.money} trigger={rubro.id} />
                      </div>
                      <div className={`gl-kt${k.down ? ' gl-down' : ''}`}>
                        {!k.down && <TrendingUp style={{ height: 12, width: 12 }} strokeWidth={2.2} />}
                        {k.t}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="gl-panels">
                  <div className="gl-panel">
                    <div className="gl-ph">
                      <h4>Ventas de la semana</h4>
                      <span className="gl-more">últimos 7 días</span>
                    </div>
                    <div className="gl-chart">
                      {rubro.chart.map((v, i) => (
                        <div key={i} className={`gl-bar${i === rubro.peak ? ' gl-peak' : ''}`}>
                          <div
                            className="gl-stick"
                            style={{ height: barsReady ? `${Math.round((v / maxChart) * 100)}%` : '0%' }}
                          />
                          <div className="gl-bl">{dias[i]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="gl-panel">
                    <div className="gl-ph">
                      <h4>{rubro.listTitle}</h4>
                      <span className="gl-more">ver todo</span>
                    </div>
                    <div className="gl-rows">
                      {rubro.rows.map((x, i) => {
                        const Icon = x.icon;
                        return (
                          <div key={i} className="gl-row">
                            <div className="gl-ri">
                              <Icon strokeWidth={2} />
                            </div>
                            <div className="gl-rmeta">
                              <div className="gl-ra">{x.a}</div>
                              <div className="gl-rb">{x.b}</div>
                            </div>
                            <span className={`gl-tag gl-${x.tag[0]}`}>{x.tag[1]}</span>
                            <span className="gl-rv">{x.v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* Count-up animado para los KPIs. Re-corre al cambiar de rubro. */
function CountUp({ value, money, trigger }: { value: number; money: boolean; trigger: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 750;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(value * eased);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, trigger]);
  return <>{money ? fmtARS(display) : Math.round(display)}</>;
}
