import type { Metadata } from 'next';
import { LegalDoc, CONTACTO_EMAIL } from '../legal-doc';

export const metadata: Metadata = {
  title: 'Política de Privacidad — Gesto',
  description: 'Cómo Gesto recolecta, usa y protege tus datos personales y los de tu negocio.',
};

export default function PrivacidadPage() {
  return (
    <LegalDoc title="Política de Privacidad">
      <p className="legal-lead">
        En Gesto cuidamos tu información y la de tu negocio. Esta política explica qué datos recolectamos, para qué
        los usamos, con quién los compartimos y qué derechos tenés. Se rige por la Ley argentina de Protección de
        Datos Personales N.º 25.326.
      </p>

      <div className="legal-toc">
        <p className="legal-toc-title">Contenido</p>
        <ol>
          <li><a href="#responsable">Responsable</a></li>
          <li><a href="#datos">Qué datos recolectamos</a></li>
          <li><a href="#finalidad">Para qué los usamos</a></li>
          <li><a href="#base">Base legal y consentimiento</a></li>
          <li><a href="#terceros">Con quién los compartimos</a></li>
          <li><a href="#internacional">Transferencia internacional</a></li>
          <li><a href="#plazo">Cuánto tiempo los conservamos</a></li>
          <li><a href="#seguridad">Seguridad</a></li>
          <li><a href="#derechos">Tus derechos</a></li>
          <li><a href="#clientes">Datos de tus clientes</a></li>
          <li><a href="#menores">Menores de edad</a></li>
          <li><a href="#cambios">Cambios</a></li>
          <li><a href="#contacto">Contacto</a></li>
        </ol>
      </div>

      <h2 id="responsable">1. Responsable</h2>
      <p>
        El responsable del tratamiento de los datos es <strong>Faro Sistemas</strong>, con sede en Argentina.
        Contacto para temas de privacidad: <a href={`mailto:${CONTACTO_EMAIL}`}>{CONTACTO_EMAIL}</a>.
      </p>

      <h2 id="datos">2. Qué datos recolectamos</h2>
      <h3>Datos de tu cuenta</h3>
      <ul>
        <li>Email y contraseña (la contraseña se guarda cifrada, no en texto plano).</li>
        <li>Nombre del negocio, rubro, plan contratado y miembros de tu equipo.</li>
      </ul>
      <h3>Datos de pago</h3>
      <ul>
        <li>
          Los pagos se procesan a través de MercadoPago. <strong>No almacenamos los datos de tu tarjeta.</strong>{' '}
          Guardamos el estado de tus pagos y suscripción para administrar tu cuenta.
        </li>
      </ul>
      <h3>Datos que cargás de tu negocio</h3>
      <ul>
        <li>Productos, stock, ventas, presupuestos, pedidos y cuentas corrientes.</li>
        <li>Datos de tus clientes y proveedores que vos decidas cargar (por ejemplo, nombre, teléfono, saldo).</li>
      </ul>
      <h3>Datos técnicos</h3>
      <ul>
        <li>Información del dispositivo y registros de uso necesarios para que el servicio funcione.</li>
        <li>Datos de diagnóstico de errores para detectar y corregir fallas (ver punto 5).</li>
      </ul>

      <h2 id="finalidad">3. Para qué los usamos</h2>
      <ul>
        <li>Prestarte el servicio y mantener tu cuenta operativa.</li>
        <li>Procesar los pagos y administrar tu suscripción.</li>
        <li>Enviarte comunicaciones relacionadas con el servicio (avisos de cuenta, pagos, soporte).</li>
        <li>Mejorar, asegurar y mantener la plataforma.</li>
        <li>Cumplir con obligaciones legales y fiscales.</li>
      </ul>

      <h2 id="base">4. Base legal y consentimiento</h2>
      <p>
        Tratamos tus datos para ejecutar el contrato de servicio (tu suscripción), para cumplir obligaciones legales
        y sobre la base del consentimiento que prestás al crear tu cuenta y aceptar esta política. Podés retirar tu
        consentimiento dando de baja la cuenta (ver <a href="/legal/baja-de-datos">Baja y borrado de datos</a>).
      </p>

      <h2 id="terceros">5. Con quién los compartimos</h2>
      <p>
        No vendemos tus datos. Los compartimos únicamente con proveedores que nos ayudan a prestar el servicio, que
        actúan como encargados y solo pueden usarlos para esa finalidad:
      </p>
      <ul>
        <li><strong>Supabase</strong> — base de datos y autenticación (alojamiento de la información).</li>
        <li><strong>Vercel</strong> — alojamiento y entrega de la aplicación.</li>
        <li><strong>MercadoPago</strong> — procesamiento de pagos.</li>
        <li><strong>Resend</strong> — envío de emails transaccionales (avisos, confirmaciones).</li>
        <li><strong>Sentry</strong> — diagnóstico de errores para mantener la app estable.</li>
      </ul>
      <p>También podremos compartir información cuando una autoridad competente lo requiera conforme a la ley.</p>

      <h2 id="internacional">6. Transferencia internacional</h2>
      <p>
        Algunos de estos proveedores pueden alojar o procesar datos en servidores ubicados fuera de Argentina. En
        esos casos, procuramos que existan resguardos adecuados conforme a la Ley 25.326 y sus normas
        complementarias. Al aceptar esta política, prestás tu consentimiento para esas transferencias en la medida
        necesaria para prestarte el servicio.
      </p>

      <h2 id="plazo">7. Cuánto tiempo los conservamos</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario para cumplir con
        obligaciones legales, contables y fiscales. Luego de la baja, los eliminamos o anonimizamos en un plazo
        razonable, salvo aquello que debamos conservar por ley.
      </p>

      <h2 id="seguridad">8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas para proteger tu información: contraseñas cifradas, conexiones
        seguras, aislamiento de los datos de cada comercio y controles de acceso. Ningún sistema es 100% infalible,
        pero trabajamos para reducir los riesgos. Te recomendamos usar una contraseña fuerte y no compartirla.
      </p>

      <h2 id="derechos">9. Tus derechos</h2>
      <p>
        Como titular de los datos, tenés derecho a acceder, rectificar, actualizar y suprimir tu información, y a
        oponerte a determinados tratamientos. Para ejercerlos, escribinos a <a href={`mailto:${CONTACTO_EMAIL}`}>{CONTACTO_EMAIL}</a>.
      </p>
      <p>
        La <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>, órgano de control de la Ley 25.326,
        tiene la atribución de atender denuncias y reclamos por incumplimientos a la normativa de protección de
        datos personales.
      </p>

      <h2 id="clientes">10. Datos de tus clientes</h2>
      <p>
        Cuando cargás en Gesto datos de tus clientes o proveedores, <strong>vos sos el responsable</strong> de esa
        información y nosotros actuamos como encargados, tratándola por cuenta tuya y solo para prestarte el
        servicio. Sos vos quien debe contar con una base legítima para tratar esos datos e informar a tus clientes
        lo que corresponda.
      </p>

      <h2 id="menores">11. Menores de edad</h2>
      <p>Gesto está dirigido a personas mayores de edad con capacidad para contratar. No está destinado a menores.</p>

      <h2 id="cambios">12. Cambios</h2>
      <p>
        Podemos actualizar esta política. Cuando los cambios sean relevantes, te avisaremos por la app o por email.
        La fecha de «última actualización» figura al inicio del documento.
      </p>

      <h2 id="contacto">13. Contacto</h2>
      <p>
        Por consultas sobre tus datos o esta política, escribinos a <a href={`mailto:${CONTACTO_EMAIL}`}>{CONTACTO_EMAIL}</a>.
      </p>
    </LegalDoc>
  );
}
