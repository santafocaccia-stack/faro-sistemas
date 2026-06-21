import type { Metadata } from 'next';
import { LegalDoc } from '../legal-doc';

export const metadata: Metadata = {
  title: 'Política de Cookies — Gesto',
  description: 'Qué cookies y tecnologías de almacenamiento usa Gesto y cómo gestionarlas.',
};

export default function CookiesPage() {
  return (
    <LegalDoc title="Política de Cookies">
      <p className="legal-lead">
        Gesto usa cookies y tecnologías de almacenamiento similares para que la aplicación funcione y para
        recordar tus preferencias. Acá te contamos cuáles y para qué.
      </p>

      <h2 id="que-son">1. Qué son las cookies</h2>
      <p>
        Son pequeños archivos que se guardan en tu dispositivo cuando usás un sitio o aplicación. Sirven, por
        ejemplo, para mantener tu sesión iniciada o recordar configuraciones.
      </p>

      <h2 id="cuales">2. Qué usamos en Gesto</h2>
      <ul>
        <li>
          <strong>Sesión y autenticación.</strong> Imprescindibles para mantenerte logueado de forma segura
          mientras usás la app. Sin ellas no podrías iniciar sesión.
        </li>
        <li>
          <strong>Preferencias.</strong> Para recordar configuraciones tuyas (por ejemplo, opciones del punto de
          venta) y mejorar tu experiencia.
        </li>
        <li>
          <strong>Diagnóstico de errores.</strong> Información mínima para detectar fallas y mantener la app
          estable.
        </li>
      </ul>
      <p>
        <strong>No usamos cookies de publicidad ni de seguimiento de terceros con fines comerciales.</strong>
      </p>

      <h2 id="gestion">3. Cómo gestionarlas</h2>
      <p>
        Podés borrar o bloquear las cookies desde la configuración de tu navegador. Tené en cuenta que, si
        bloqueás las cookies de sesión, no vas a poder iniciar sesión ni usar Gesto con normalidad.
      </p>

      <h2 id="cambios">4. Cambios</h2>
      <p>
        Si cambiamos la forma en que usamos cookies, actualizaremos esta página. Para más detalle sobre el manejo
        de tu información, mirá la <a href="/legal/privacidad">Política de Privacidad</a>.
      </p>
    </LegalDoc>
  );
}
