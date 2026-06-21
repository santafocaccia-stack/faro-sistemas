import Image from 'next/image';
import { ScanLine, Receipt, BarChart3, ArrowRight } from 'lucide-react';
import comerciante from '../../../public/landing/comerciante-escaneando.png';
import capturaGesto from '../../../public/landing/captura-gesto.jpeg';

/* Sección "Desde el celular": foto real de una comerciante escaneando un
   producto + captura real de la app Gesto en un marco de celular flotando
   encima. Refuerza el gancho "tu negocio al alcance de tu mano". */
export function ScanShowcase() {
  const puntos = [
    { Icon: ScanLine, h: 'Escaneás con la cámara', p: 'El celular lee el código de barras del producto.' },
    { Icon: Receipt, h: 'Cobrás y entregás el comprobante', p: 'En efectivo, débito o sumándolo a la cuenta corriente.' },
    { Icon: BarChart3, h: 'Mirás tus números donde estés', p: 'Cuánto vendiste hoy, sin volver al mostrador.' },
  ];
  return (
    <section className="gl-blk gl-wrap gl-reveal">
      <div className="gl-scangrid">
        <div className="gl-scancopy">
          <span className="gl-eyebrow">Desde el celular</span>
          <h2 className="gl-scanh2">Tu local entero, en el bolsillo</h2>
          <p className="gl-scanp">
            No hace falta computadora ni aparatos caros. Con tu celular escaneás, cobrás y ves cómo va el día —
            estés donde estés.
          </p>
          <ul className="gl-scanlist">
            {puntos.map(({ Icon, h, p }) => (
              <li key={h}>
                <span className="gl-scanic">
                  <Icon strokeWidth={2} />
                </span>
                <div>
                  <b>{h}</b>
                  <span>{p}</span>
                </div>
              </li>
            ))}
          </ul>
          <a className="gl-btn gl-btn-fill" style={{ height: 48, padding: '0 24px', fontSize: 15 }} href="/signup">
            Probalo en tu celular <ArrowRight style={{ height: 17, width: 17 }} strokeWidth={2.4} />
          </a>
        </div>

        {/* Foto real + captura real de Gesto en un marco de celular */}
        <div className="gl-scanvisual">
          <div className="gl-phoneglow" aria-hidden />
          <div className="gl-scanphoto">
            <Image
              src={comerciante}
              alt="Una comerciante escanea un producto con la app de Gesto en su celular"
              fill
              className="gl-scanimg"
              sizes="(max-width: 920px) 90vw, 440px"
              placeholder="blur"
            />
            <span className="gl-scanphoto-grad" aria-hidden />
          </div>

          <div className="gl-phone gl-phone-float">
            <Image
              src={capturaGesto}
              alt="Pantalla de Gesto en el celular: punto de venta con lector de códigos"
              className="gl-phone-img"
              sizes="240px"
              placeholder="blur"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
