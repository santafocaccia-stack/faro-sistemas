'use client';

import { useId } from 'react';

/**
 * Marca Gesto — isotipo y logotipo en curvas (ver Documentos/Gesto-Marca y
 * la memoria de marca). El isotipo es la G; en el logotipo completo esa misma
 * G hace de inicial y al lado va "esto" → se lee "Gesto".
 *
 * Color: el trazo de la G ("mark") es SIEMPRE naranja de marca; la tinta de la
 * palabra hereda `currentColor`, así el logotipo se adapta al tema (texto claro
 * sobre fondo oscuro y viceversa) sin duplicar archivos.
 */

const MARK_D =
  'M58.000 32.000C58.000 37.529 56.179 43.044 52.885 47.486C49.592 51.927 44.844 55.272 39.553 56.879C34.262 58.485 28.457 58.344 23.250 56.483C18.043 54.622 13.463 51.051 10.389 46.455C7.315 41.859 5.763 36.263 6.031 30.740C6.299 25.217 8.385 19.797 11.890 15.520C15.394 11.244 20.299 8.133 25.661 6.785C31.024 5.436 36.816 5.858 41.926 7.969C47.037 10.081 51.438 13.869 54.286 18.609L49.336 18.455C46.561 14.903 42.390 12.517 38.091 11.799C33.791 11.081 29.425 12.002 26.002 14.015C22.578 16.029 20.107 19.077 18.774 22.273C17.441 25.469 17.208 28.778 17.684 31.722C18.159 34.666 19.301 37.260 20.820 39.572C22.340 41.885 24.274 44.014 26.853 45.646C29.431 47.277 32.689 48.360 36.225 48.271C39.760 48.182 43.542 46.862 46.513 44.274C49.483 41.685 51.567 37.826 51.924 33.743ZM57.802 28.800A26 26 0 0 1 57.802 35.200H36.200A3.200 3.200 0 0 1 36.200 28.800Z';

// paths de "esto" (Sora 700, texto en curvas) + transforms del lockup
const E_D =
  'M323.5 -19.5Q253.5 -19.5 200.25 4.5Q147 28.5 111.25 69.125Q75.5 109.75 57.0 160.25Q38.5 210.75 38.5 264V283.5Q38.5 338.5 57.0 389.375Q75.5 440.25 110.875 480.125Q146.25 520 198.375 543.5Q250.5 567 317.5 567Q406 567 466.625 527.625Q527.25 488.25 558.875 424.375Q590.5 360.5 590.5 286V231.75H106V323.25H494.25L441.5 280.5Q441.5 330 427.625 364.75Q413.75 399.5 386.375 418.0Q359 436.5 317.5 436.5Q276.25 436.5 247.0 417.625Q217.75 398.75 202.625 362.375Q187.5 326 187.5 273Q187.5 224.25 201.875 187.75Q216.25 151.25 246.25 131.125Q276.25 111 323.5 111Q367.75 111 396.0 127.75Q424.25 144.5 433.75 170.25H580.75Q569 114.5 534.125 71.5Q499.25 28.5 445.875 4.5Q392.5 -19.5 323.5 -19.5Z';
const S_D =
  'M280.5 -17.5Q164.25 -17.5 98.125 30.875Q32 79.25 27.75 166.25H170.25Q173.75 139.75 201.375 119.375Q229 99 283.5 99Q325.75 99 353.375 113.25Q381 127.5 381 154.75Q381 178.75 359.75 193.5Q338.5 208.25 284.75 213.5L241.75 218Q143.25 228.25 93.75 272.875Q44.25 317.5 44.25 387.75Q44.25 446.25 73.25 485.0Q102.25 523.75 153.5 543.625Q204.75 563.5 270.75 563.5Q376.5 563.5 441.5 517.125Q506.5 470.75 510 382.75H367.5Q364.25 409.5 339.875 428.25Q315.5 447 269.25 447Q232 447 210.125 433.0Q188.25 419 188.25 395.25Q188.25 372 207.25 360.0Q226.25 348 268.75 343L311.75 338.5Q412.75 328 468.875 282.75Q525 237.5 525 162.25Q525 107 495.0 66.625Q465 26.25 410.125 4.375Q355.25 -17.5 280.5 -17.5Z';
const T_D =
  'M321.75 -7.5Q239.25 -7.5 188.25 13.25Q137.25 34 113.375 82.625Q89.5 131.25 89.5 214.25L90.25 696H239.25L238.5 207.5Q238.5 169 259.0 148.5Q279.5 128 318 128H398.5V-7.5ZM6.5 430.5V547.5H398.5V430.5Z';
const O_D =
  'M340.25 -19.5Q268 -19.5 212.0 3.0Q156 25.5 117.25 64.625Q78.5 103.75 58.5 154.25Q38.5 204.75 38.5 261V283.5Q38.5 341.25 59.375 392.625Q80.25 444 119.5 483.125Q158.75 522.25 214.75 544.625Q270.75 567 340.25 567Q410.5 567 466.125 544.625Q521.75 522.25 561.0 483.125Q600.25 444 621.125 392.625Q642 341.25 642 283.5V261Q642 204.75 622.0 154.25Q602 103.75 563.25 64.625Q524.5 25.5 468.5 3.0Q412.5 -19.5 340.25 -19.5ZM340.25 116Q386.75 116 418.0 136.125Q449.25 156.25 465.375 191.875Q481.5 227.5 481.5 272.25Q481.5 318.75 464.875 354.375Q448.25 390 416.625 410.75Q385 431.5 340.25 431.5Q295.75 431.5 264.0 410.75Q232.25 390 215.625 354.375Q199 318.75 199 272.25Q199 227.5 215.125 191.875Q231.25 156.25 262.875 136.125Q294.5 116 340.25 116Z';

const BRAND = 'var(--gesto-brand, #E85D00)';

/** La G sola. Por defecto usa `currentColor` (para monocromo); pasá `color`
 *  para forzar el naranja de marca. */
export function GestoIsotipo({
  color = 'currentColor',
  title = 'Gesto',
  ...props
}: React.SVGProps<SVGSVGElement> & { color?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} {...props}>
      <path d={MARK_D} fill={color} />
    </svg>
  );
}

/** Logotipo completo: la G (naranja de marca) + "esto" (tinta = currentColor). */
export function GestoLogo({
  markColor = BRAND,
  title = 'Gesto',
  ...props
}: React.SVGProps<SVGSVGElement> & { markColor?: string; title?: string }) {
  const cid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 2431 770" role="img" aria-label={title} {...props}>
      <g transform="translate(-39.65 -39.65) scale(13.2750)">
        <path d={MARK_D} fill={markColor} />
      </g>
      <g transform="translate(760.04 730.30) scale(0.72 -0.72)"><path d={E_D} fill="currentColor" /></g>
      <g transform="translate(1202.12 730.30) scale(0.72 -0.72)"><path d={S_D} fill="currentColor" /></g>
      <clipPath id={cid} clipPathUnits="userSpaceOnUse">
        <polygon points="7 597.58 399 696 399 -7 7 -7" />
      </clipPath>
      <g transform="translate(1595.24 730.30) scale(0.72 -0.72)">
        <g clipPath={`url(#${cid})`}><path d={T_D} fill="currentColor" /></g>
      </g>
      <g transform="translate(1900.52 730.30) scale(0.72 -0.72)"><path d={O_D} fill="currentColor" /></g>
    </svg>
  );
}
