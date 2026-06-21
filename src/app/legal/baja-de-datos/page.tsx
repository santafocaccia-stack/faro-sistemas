import type { Metadata } from 'next';
import { LegalDoc, Ph } from '../legal-doc';

export const metadata: Metadata = {
  title: 'Baja y borrado de datos — Gesto',
  description: 'Cómo cancelar tu suscripción, dar de baja tu cuenta y pedir la eliminación de tus datos en Gesto.',
};

export default function BajaPage() {
  return (
    <LegalDoc title="Baja y borrado de datos">
      <p className="legal-lead">
        Tu información es tuya y podés irte cuando quieras. Acá te explicamos cómo cancelar la suscripción, dar de
        baja la cuenta y pedir la eliminación de tus datos.
      </p>

      <h2 id="cancelar">1. Cancelar la suscripción</h2>
      <p>
        Podés cancelar la renovación de tu suscripción en cualquier momento desde la configuración de tu cuenta, sin
        permanencia mínima. La cancelación detiene los cobros futuros; el período ya pagado sigue activo hasta su
        vencimiento.
      </p>

      <h2 id="baja-cuenta">2. Dar de baja la cuenta</h2>
      <p>
        Para dar de baja definitivamente tu cuenta y eliminar tus datos, escribinos desde el email asociado a tu
        cuenta a <Ph>[EMAIL DE CONTACTO]</Ph> con el asunto «Baja de cuenta». Podemos pedirte algún dato para
        verificar tu identidad antes de proceder.
      </p>

      <h2 id="que-pasa">3. Qué pasa con tus datos</h2>
      <ul>
        <li>Eliminamos o anonimizamos la información de tu cuenta y de tu negocio en un plazo razonable.</li>
        <li>
          Podemos conservar cierta información cuando una obligación legal, contable o fiscal nos obligue a hacerlo
          (por ejemplo, registros de pagos), y solo por el tiempo que esa obligación lo exija.
        </li>
        <li>Una vez eliminada, la información no se puede recuperar.</li>
      </ul>

      <h2 id="exportar">4. Llevarte tu información</h2>
      <p>
        Antes de dar de baja la cuenta, podés descargar o exportar la información disponible en la app (por ejemplo,
        reportes y comprobantes). Si necesitás ayuda para obtener una copia de tus datos, escribinos.
      </p>

      <h2 id="plazo">5. Plazos</h2>
      <p>
        Procesamos las solicitudes de baja y eliminación en los plazos que establece la normativa de protección de
        datos aplicable. Te confirmaremos por email cuando la baja se haya completado.
      </p>

      <h2 id="contacto">6. Contacto</h2>
      <p>
        Para cualquier consulta sobre la baja o tus datos, escribinos a <Ph>[EMAIL DE CONTACTO]</Ph>. Más detalle
        en la <a href="/legal/privacidad">Política de Privacidad</a>.
      </p>
    </LegalDoc>
  );
}
