import { ScanLine, Receipt, BarChart3, Check, Wifi, BatteryFull, ArrowRight } from 'lucide-react';

/* Sección "Desde el celular": mockup de un teléfono con la interfaz de Gesto
   en modo escaneo — refuerza el gancho "tu negocio al alcance de tu mano". */
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

        {/* Mockup de teléfono */}
        <div className="gl-phonewrap">
          <div className="gl-phoneglow" aria-hidden />
          <div className="gl-phone">
            <div className="gl-phone-notch" />
            <div className="gl-phone-screen">
              <div className="gl-ps-top">
                <span>9:41</span>
                <span className="gl-ps-icons">
                  <Wifi style={{ height: 13, width: 13 }} strokeWidth={2.2} />
                  <BatteryFull style={{ height: 14, width: 14 }} strokeWidth={2.2} />
                </span>
              </div>
              <div className="gl-ps-head">
                <span className="gl-ps-glogo">G</span>
                Escaneá un producto
              </div>
              <div className="gl-ps-cam">
                <div className="gl-ps-barcode" />
                <div className="gl-ps-frame">
                  <span className="gl-ps-corner tl" />
                  <span className="gl-ps-corner tr" />
                  <span className="gl-ps-corner bl" />
                  <span className="gl-ps-corner br" />
                  <span className="gl-scanline" />
                </div>
                <div className="gl-ps-hint">Apuntá al código de barras</div>
              </div>
              <div className="gl-ps-detect">
                <span className="gl-ps-dcheck">
                  <Check strokeWidth={3} />
                </span>
                <div className="gl-ps-dtx">
                  <b>Yerba La Tranquera 1kg</b>
                  <span>se sumó al ticket</span>
                </div>
                <span className="gl-ps-dprice">$3.800</span>
              </div>
              <div className="gl-ps-foot">
                <div className="gl-ps-ftx">
                  <span className="gl-ps-flabel">3 productos</span>
                  <span className="gl-ps-ftotal">$5.900</span>
                </div>
                <button className="gl-ps-cobrar">Cobrar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
