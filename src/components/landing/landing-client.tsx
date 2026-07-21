'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Search, Command, ShoppingCart, ArrowRight, UsersRound, Settings, LogOut, Bell,
  CalendarDays, Lock, Store, TrendingUp, Check,
} from 'lucide-react';
import { navParaRol } from '@/lib/nav';
import { planTiene, type PlanId } from '@/lib/planes';
import { RUBROS, SOBRE_ACENTO, fmtARS, hexToRgba, type RubroDemo } from './landing-data';
import { LandingPos } from './landing-pos';
import { ScanShowcase } from './landing-scan';
import { AntesDespues, Features, Pricing, Faq, LandingFooter } from './landing-sections';
import { AuthWizard } from './auth-wizard';
import { GestoLogo, GestoIsotipo } from '@/components/brand/gesto-logo';
import './landing.css';

const MARQUEE = ['Vendé', 'Cobrá', 'Cuenta corriente al día', 'Mirá tus números', 'Cargá el stock', 'Pasá presupuestos'];

export function LandingClient({ dolarMep }: { dolarMep: number }) {
  const [rubro, setRubro] = useState<RubroDemo>(RUBROS[0]!);
  const [auto, setAuto] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Auto-rotación del switcher: muestra cada rubro solo, hasta que el usuario
  // elige uno (click) o mientras pasa el mouse por encima del selector.
  useEffect(() => {
    if (!auto || hovering || !inView) return;
    const id = setInterval(() => {
      setRubro((cur) => {
        const i = RUBROS.findIndex((r) => r.id === cur.id);
        return RUBROS[(i + 1) % RUBROS.length]!;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [auto, hovering, inView]);

  // El switcher solo auto-rota mientras está visible en pantalla: si el
  // usuario bajó al demo del POS, no cambia el rubro ni le resetea el carrito.
  useEffect(() => {
    const el = switcherRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e!.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardVersion, setWizardVersion] = useState<PlanId | null>(null);
  function abrirRegistro(version: PlanId | null = null) {
    setWizardVersion(version);
    setWizardOpen(true);
  }
  const WHATSAPP_URL =
    'https://wa.me/5491166644837?text=' + encodeURIComponent('Hola, quiero saber más sobre Gesto');

  const accentStyle = {
    ['--gl-accent']: rubro.acento,
    ['--gl-soft']: hexToRgba(rubro.acento, 0.14),
    ['--gl-ink']: SOBRE_ACENTO,
  } as CSSProperties;

  return (
    <div className="gl-root" ref={rootRef}>
      <div className="gl-grain" aria-hidden />
      <div className="gl-glow gl-glow-1" aria-hidden />
      <div className="gl-glow gl-glow-2" aria-hidden />

      {/* HEADER */}
      <header className="gl-header">
        <div className="gl-wrap gl-nav">
          <div className="gl-brand">
            <GestoLogo markColor="var(--gl-brand)" style={{ height: 30, width: 'auto' }} />
          </div>
          <nav className="gl-navlinks">
            <a href="#rubros">Versiones</a>
            <a href="#beneficios">Beneficios</a>
            <a href="#precios">Precios</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Ayuda</a>
          </nav>
          <div className="gl-navcta">
            <a className="gl-btn gl-btn-ghost" href="/login">Ingresar</a>
            <button type="button" className="gl-btn gl-btn-fill" onClick={() => abrirRegistro()}>Empezá gratis</button>
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
              Vendé, cobrá y llevá la <span className="gl-mark2">cuenta corriente</span> de tu negocio.
              <br className="gl-sub-br" /> Todo en un solo lugar, y desde el celular.
            </p>
            <div className="gl-herocta">
              <button type="button" className="gl-btn gl-btn-fill" style={{ height: 52, padding: '0 28px', fontSize: 16 }} onClick={() => abrirRegistro()}>
                Empezá gratis <ArrowRight style={{ height: 18, width: 18 }} strokeWidth={2.4} />
              </button>
              <a className="gl-btn gl-btn-line" style={{ height: 52, padding: '0 28px', fontSize: 16 }} href="#precios">
                Ver planes
              </a>
            </div>
            <div className="gl-guarantee">
              <span><Check strokeWidth={2.6} /> 14 días gratis</span>
              <span><Check strokeWidth={2.6} /> Sin tarjeta</span>
              <span><Check strokeWidth={2.6} /> Cancelás cuando quieras</span>
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

        {/* POR DENTRO — switcher + ventana de app (acento por rubro, scopeado) */}
        <section className="gl-blk gl-wrap gl-reveal" id="rubros" style={accentStyle}>
          <div className="gl-shead">
            <span className="gl-eyebrow">Una versión para cada negocio</span>
            <h2>Mirá cómo se ve por dentro</h2>
            <p>Elegí tu negocio y mirá tu versión de Gesto por dentro. Esto es lo que ves al entrar.</p>
          </div>

          <div
            className="gl-rubros"
            ref={switcherRef}
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

        {/* POS interactivo (comparte rubro, acento scopeado) */}
        <LandingPos rubro={rubro} />

        {/* Desde el celular — foto real + mockup de escaneo (naranja de marca) */}
        <ScanShowcase />

        {/* Beneficios */}
        <div id="beneficios">
          <Features />
        </div>

        {/* Antes / Después */}
        <AntesDespues />

        {/* Precios */}
        <Pricing dolarMep={dolarMep} onElegir={abrirRegistro} />

        {/* Preguntas frecuentes */}
        <Faq />

        {/* CTA final */}
        <section className="gl-blk gl-wrap gl-reveal">
          <div className="gl-finale">
            <h2>Probá Gesto gratis 14 días</h2>
            <p>Creá tu cuenta, elegí tu versión y empezá a cobrar. Sin tarjeta y sin vueltas.</p>
            <button type="button" className="gl-btn gl-btn-fill" style={{ height: 52, padding: '0 30px', fontSize: 17 }} onClick={() => abrirRegistro()}>
              Empezá gratis <ArrowRight style={{ height: 19, width: 19 }} strokeWidth={2.4} />
            </button>
          </div>
        </section>
      </main>

      <LandingFooter />

      {/* CTA fijo en mobile */}
      <div className="gl-stickycta">
        <button type="button" className="gl-btn gl-btn-fill" onClick={() => abrirRegistro()}>
          Empezá gratis · 14 días sin tarjeta
        </button>
      </div>

      {/* WhatsApp flotante */}
      <a
        className="gl-wa"
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden>
          <path d="M17.47 14.38c-.3-.15-1.74-.86-2-.95-.27-.1-.46-.15-.65.15-.2.3-.75.95-.92 1.14-.17.2-.34.22-.63.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.34.45-.5.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.65-1.58-.9-2.16-.24-.57-.48-.49-.65-.5l-.56-.01c-.2 0-.5.07-.77.37-.26.3-1 .98-1 2.4 0 1.4 1.03 2.76 1.17 2.96.15.2 2.03 3.1 4.92 4.35.69.3 1.22.47 1.64.6.69.22 1.31.19 1.8.12.55-.08 1.74-.71 1.98-1.4.25-.69.25-1.28.17-1.4-.07-.13-.26-.2-.56-.35z M12 2a10 10 0 0 0-8.6 15.07L2 22l5.05-1.32A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3 .78.8-2.92-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
        </svg>
      </a>

      <AuthWizard open={wizardOpen} onClose={() => setWizardOpen(false)} versionInicial={wizardVersion} />
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
      <p className="gl-rubrolede">{rubro.heroSub}</p>
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
                <GestoIsotipo color="var(--gl-brand)" style={{ height: 30, width: 30 }} />
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
