import type { Metadata } from 'next';
import { LegalDoc, Ph, TITULAR_NOMBRE } from '../legal-doc';

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Gesto',
  description: 'Términos y condiciones de uso de Gesto, el sistema de gestión comercial para PyMEs argentinas.',
};

export default function TerminosPage() {
  return (
    <LegalDoc title="Términos y Condiciones">
      <p className="legal-lead">
        Estos Términos y Condiciones regulan el uso de <strong>Gesto</strong>, una plataforma de gestión comercial
        para comercios y PyMEs. Al crear una cuenta o usar el servicio, aceptás estos términos. Si no estás de
        acuerdo, no uses Gesto.
      </p>

      <div className="legal-toc">
        <p className="legal-toc-title">Contenido</p>
        <ol>
          <li><a href="#responsable">Quién presta el servicio</a></li>
          <li><a href="#servicio">Qué es Gesto</a></li>
          <li><a href="#cuenta">Tu cuenta</a></li>
          <li><a href="#suscripcion">Suscripción, precios y pagos</a></li>
          <li><a href="#prueba">Prueba gratuita</a></li>
          <li><a href="#uso">Uso aceptable</a></li>
          <li><a href="#datos">Tus datos y los de tus clientes</a></li>
          <li><a href="#propiedad">Propiedad intelectual</a></li>
          <li><a href="#disponibilidad">Disponibilidad del servicio</a></li>
          <li><a href="#responsabilidad">Limitación de responsabilidad</a></li>
          <li><a href="#baja">Cancelación y baja</a></li>
          <li><a href="#cambios">Cambios en estos términos</a></li>
          <li><a href="#ley">Ley aplicable y jurisdicción</a></li>
          <li><a href="#contacto">Contacto</a></li>
        </ol>
      </div>

      <h2 id="responsable">1. Quién presta el servicio</h2>
      <p>
        Gesto es un servicio de <strong>Faro Sistemas</strong>, nombre comercial de <strong>{TITULAR_NOMBRE}</strong>{' '}
        (persona física), CUIT <Ph>[CUIT]</Ph>, con domicilio en <Ph>[DOMICILIO]</Ph>, Argentina (en adelante,
        «Gesto», «nosotros»). Para cualquier consulta podés escribir a <Ph>[EMAIL DE CONTACTO]</Ph>.
      </p>

      <h2 id="servicio">2. Qué es Gesto</h2>
      <p>
        Gesto es un software como servicio (SaaS) que te permite gestionar tu negocio: punto de venta, control de
        stock, clientes, cuenta corriente, presupuestos, pedidos y reportes, según el plan que contrates. El
        servicio se presta «tal cual está» y puede evolucionar con el tiempo (nuevas funciones, mejoras o cambios).
      </p>

      <h2 id="cuenta">3. Tu cuenta</h2>
      <ul>
        <li>Para usar Gesto tenés que crear una cuenta con un email válido y una contraseña.</li>
        <li>Sos responsable de mantener la confidencialidad de tu contraseña y de toda la actividad de tu cuenta.</li>
        <li>Tenés que ser mayor de edad y tener capacidad legal para contratar.</li>
        <li>La información que cargues debe ser veraz y mantenerse actualizada.</li>
        <li>Podés invitar a miembros de tu equipo; sos responsable del uso que hagan de la cuenta de tu negocio.</li>
      </ul>

      <h2 id="suscripcion">4. Suscripción, precios y pagos</h2>
      <ul>
        <li>Gesto se contrata como una <strong>suscripción mensual</strong> que se renueva automáticamente.</li>
        <li>
          Los precios se publican <strong>en dólares estadounidenses (USD)</strong> y se cobran{' '}
          <strong>en pesos argentinos</strong> al valor del dólar MEP del día del cobro. El monto en pesos puede
          variar mes a mes según esa cotización.
        </li>
        <li>Los pagos se procesan mediante MercadoPago o por transferencia bancaria, según se indique en la app.</li>
        <li>La suscripción no tiene permanencia mínima: podés cancelarla cuando quieras (ver punto 11).</li>
        <li>
          La emisión de comprobantes fiscales y los impuestos aplicables se rigen por la normativa vigente. El
          comprobante de pago dentro de la app no reemplaza a una factura fiscal cuando ésta corresponda.
        </li>
        <li>Si un pago no se acredita, podemos suspender o limitar el acceso hasta regularizar la situación.</li>
      </ul>

      <h2 id="prueba">5. Prueba gratuita</h2>
      <p>
        Ofrecemos un período de prueba gratuito (actualmente de 14 días) sin necesidad de tarjeta. Al finalizar la
        prueba, para seguir usando Gesto deberás contratar un plan. Podemos modificar o discontinuar la prueba
        gratuita en el futuro.
      </p>

      <h2 id="uso">6. Uso aceptable</h2>
      <p>Al usar Gesto, te comprometés a no:</p>
      <ul>
        <li>Usar el servicio para actividades ilegales o para cargar contenido que no te pertenezca.</li>
        <li>Intentar vulnerar la seguridad, acceder a datos de otros comercios o interferir con el servicio.</li>
        <li>Revender o sublicenciar Gesto sin autorización.</li>
        <li>Usar el servicio de una forma que pueda dañarlo o afectar a otros usuarios.</li>
      </ul>
      <p>Podemos suspender cuentas que incumplan estas reglas.</p>

      <h2 id="datos">7. Tus datos y los de tus clientes</h2>
      <p>
        Toda la información que cargás en Gesto (productos, ventas, clientes, cuentas corrientes, etc.) es{' '}
        <strong>tuya</strong>. Nosotros la alojamos y procesamos para prestarte el servicio.
      </p>
      <p>
        Cuando cargás datos de tus clientes o de terceros, <strong>vos sos el responsable</strong> de esa
        información: de tener una base legítima para tratarla y de cumplir con la normativa de protección de datos
        que te corresponda. Gesto actúa como encargado del tratamiento por cuenta tuya. El detalle de cómo tratamos
        los datos está en la{' '}
        <a href="/legal/privacidad">Política de Privacidad</a>.
      </p>

      <h2 id="propiedad">8. Propiedad intelectual</h2>
      <p>
        El software, la marca «Gesto», el diseño y el código son de su titular y están protegidos. Estos términos
        no te transfieren ningún derecho sobre ellos más allá del uso del servicio mientras tu suscripción esté
        activa.
      </p>

      <h2 id="disponibilidad">9. Disponibilidad del servicio</h2>
      <p>
        Hacemos lo posible por mantener Gesto disponible y funcionando, pero no garantizamos que el servicio esté
        libre de interrupciones, errores o tareas de mantenimiento. Podemos realizar cambios, pausas programadas o
        actualizaciones cuando sea necesario.
      </p>

      <h2 id="responsabilidad">10. Limitación de responsabilidad</h2>
      <p>
        Gesto es una herramienta de apoyo a la gestión de tu negocio. En la máxima medida permitida por la ley, no
        seremos responsables por lucro cesante, pérdida de datos derivada de un mal uso, ni por daños indirectos
        ocasionados por el uso o la imposibilidad de usar el servicio. Te recomendamos llevar tus propios respaldos
        de la información crítica. Nada de lo aquí dispuesto limita los derechos que la ley te reconoce como
        consumidor.
      </p>

      <h2 id="baja">11. Cancelación y baja</h2>
      <ul>
        <li>Podés cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta.</li>
        <li>La cancelación detiene las renovaciones futuras; el período ya pagado sigue activo hasta su vencimiento.</li>
        <li>El procedimiento para dar de baja la cuenta y eliminar tus datos está en <a href="/legal/baja-de-datos">Baja y borrado de datos</a>.</li>
        <li>Podemos dar de baja o suspender una cuenta ante incumplimientos graves de estos términos.</li>
      </ul>

      <h2 id="cambios">12. Cambios en estos términos</h2>
      <p>
        Podemos actualizar estos términos. Cuando los cambios sean relevantes, te avisaremos por la app o por email.
        El uso continuado del servicio después de la actualización implica la aceptación de los nuevos términos.
      </p>

      <h2 id="ley">13. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Ante cualquier controversia, serán
        competentes los tribunales ordinarios de <Ph>[JURISDICCIÓN]</Ph>, sin perjuicio de los derechos que la
        normativa de defensa del consumidor te reconozca.
      </p>

      <h2 id="contacto">14. Contacto</h2>
      <p>
        Por dudas sobre estos términos, escribinos a <Ph>[EMAIL DE CONTACTO]</Ph>.
      </p>
    </LegalDoc>
  );
}
