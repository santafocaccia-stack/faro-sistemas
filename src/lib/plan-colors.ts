/**
 * ── ACENTO POR PLAN — FUENTE ÚNICA DE VERDAD ────────────────────────────
 *
 * Antes esto vivía duplicado en `planes.ts` (para la landing y /planes) y en
 * `globals.css` (para el dashboard). Las dos listas se desincronizaron:
 * atmosféricos y préstamos habían quedado con los matices cruzados, así que
 * el cliente veía un color en la página de precios y otro al entrar.
 * Ahora sale todo de acá y el CSS no tiene ni un matiz hardcodeado.
 *
 * CRITERIO DE LA PALETA
 * Los neutros de la app son cálidos (negros hue ~55, beige #FAF8F5) y la marca
 * es naranja cálido (~44°). Por eso los acentos de plan viven en el ARCO FRÍO,
 * de 180° a 340°: el frío es el complemento del naranja, y cualquier acento
 * cálido pelea con la marca. Quedan ~160° de pista, repartidos priorizando
 * separación donde el ojo discrimina peor (la franja cyan→azul se lleva los
 * huecos más grandes; violeta→magenta tolera 24°).
 *
 * Matices reservados, NO usar para planes:
 *   ~18° destructivo · ~44° marca · ~78° alerta · ~150° éxito
 *
 * PLANES NUEVOS: no inventes un matiz suelto, metelo en una familia.
 *   180–215 flujo constante · 250–290 agenda y domicilio · 310–340 mostrador
 * El color ubica el rubro en una familia; el ícono y el vocabulario lo
 * identifican. Así se puede escalar sin quedarse sin colores.
 *
 * CONTRASTE: los 12 valores se verificaron AA (≥4.5:1) contra los cuatro
 * fondos reales de la app. Claro va a L 0.52 (4.95–6.04:1 sobre #FFFFFF y
 * #FAF8F5) y oscuro a L 0.72 (6.45–7.90:1 sobre #1E1A15 y #16130F).
 * La L es pareja a propósito: es lo que hace que se lean como familia.
 * Si tocás un matiz, revalidá — no estimes.
 *
 * OJO con el croma: food y atmosféricos llegan a 0.09 contra 0.165 de los
 * violetas. No es un error, es el gamut sRGB: a L 0.52 el turquesa no da más.
 * Se ven algo más apagados y está bien.
 */

type Acento = {
  /** Matiz OKLCH. El identificador real de la familia. */
  hue: number;
  /** App en tema claro: texto, íconos, bordes de acento. AA sobre #FFFFFF. */
  light: string;
  /** App en tema oscuro. AA sobre #1E1A15. */
  dark: string;
  /** Tinta legible ENCIMA del acento oscuro usado como relleno sólido. */
  inkDark: string;
};

const acento = (hue: number, cLight: number, cDark: number): Acento => ({
  hue,
  light: `oklch(0.52 ${cLight} ${hue})`,
  dark: `oklch(0.72 ${cDark} ${hue})`,
  inkDark: `oklch(0.16 0.02 ${hue})`,
});

export const PLAN_ACCENT = {
  food:         acento(182, 0.09,  0.125),
  atmosfericos: acento(212, 0.09,  0.125),
  servicios:    acento(252, 0.155, 0.15),
  prestamista:  acento(288, 0.165, 0.155),
  market:       acento(312, 0.165, 0.165),
  balanza:      acento(336, 0.165, 0.165),
} as const;

export type PlanConAcento = keyof typeof PLAN_ACCENT;

/**
 * Color para superficies de marketing (landing, /planes) donde el acento se
 * usa como relleno sólido con tinta oscura encima (`--gl-ink: #1a0f06`).
 * Ahí hace falta un valor CLARO: el `light` de L 0.52 dejaría los botones
 * ilegibles. Es el mismo valor que el acento oscuro, con otro nombre porque
 * cumple otro rol.
 */
export const planVivid = (plan: PlanConAcento): string => PLAN_ACCENT[plan].dark;

/**
 * Variables que el wrapper inyecta inline. El CSS las consume con UNA sola
 * regla genérica (`[data-plan]` + `.dark [data-plan]`), sin un bloque por
 * plan: por eso no puede volver a desincronizarse.
 */
export function planAccentVars(plan: PlanConAcento): React.CSSProperties {
  const a = PLAN_ACCENT[plan];
  return {
    '--plan-accent-light': a.light,
    '--plan-accent-dark': a.dark,
    '--plan-ink-dark': a.inkDark,
  } as React.CSSProperties;
}
