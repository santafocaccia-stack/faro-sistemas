# Gesto — Ideas innovadoras (diferenciación de alto valor)

Investigación de campo (2026) + propuesta. El objetivo: algo que rompa el
esquema y diferencie a Gesto de la competencia (Mercado Pago, Tienda Nube,
Contabilium, Líder Gestión, Gestión Comercio), pensado para la realidad de
una PyME argentina.

## Contexto / dolores reales detectados
- **Inflación:** el dolor #1. Cuesta actualizar precios a tiempo → se vende
  perdiendo margen sin darse cuenta.
- **Faltantes invisibles:** te quedás sin un producto y te enterás cuando el
  cliente lo pide. Reposición reactiva, no planificada.
- **Fiado sin registro:** la cuenta corriente informal (cuaderno) — quién debe,
  cuánto y desde cuándo.
- **Todo pasa por WhatsApp:** clientes, proveedores y cobros. El comerciante ya
  vive ahí; la app que se integre a WhatsApp gana.
- La competencia compite por **features y precio** (facturación AFIP, stock,
  caja). Casi nadie compite por **inteligencia** (que el sistema *piense por vos*).

---

## Idea 1 — Reposición inteligente ("nunca te quedes sin stock") ⭐ RECOMENDADA
**Qué es:** Gesto calcula la *velocidad de venta* de cada producto (unidades/día
sobre el historial) y predice **cuándo te vas a quedar sin stock**. Te avisa
"te quedás sin Coca 500 en ~3 días" y, en el día de pedido del proveedor,
**arma el pedido solo** con las cantidades sugeridas para llegar al próximo
reabastecimiento. Un toque y lo mandás por WhatsApp.

**Por qué aporta valor:** ataca el "faltante invisible" — el faltante es plata
que no entra. Convierte a Gesto de "anotador" a "asistente que te avisa y
decide por vos". Es el tipo de cosa que hace que no quieras cambiarte nunca.

**Esfuerzo:** Medio. No necesita IA pesada: velocidad = unidades vendidas /
días con venta; días-a-cero = stock actual / velocidad; sugerido = cubrir
hasta el próximo día de pedido + un colchón. Gesto **ya tiene** proveedores,
pedidos, días de pedido y el historial de ventas → es sumar una capa de cálculo.

**MVP concreto:**
1. Acción `proyeccionStock()`: por producto activo, velocidad (últimos 30 días),
   días-a-cero, y cantidad sugerida de pedido.
2. En Inicio (planes con stock) un panel "Se están por agotar" (rojo si
   días-a-cero < día de pedido).
3. En la pantalla de Pedidos, botón "Armar pedido sugerido" que precarga
   cantidades. (Reusa el pedido a proveedor que ya existe.)

---

## Idea 2 — Precios vivos (anti-inflación) ⭐⭐ EL DIFERENCIADOR ARGENTINO
**Qué es:** Gesto vigila el **margen** de cada producto. Cuando cargás un costo
nuevo (o pasa el tiempo), te dice "estos 12 productos perdieron margen,
actualizá precios" y te sugiere el nuevo PVP para mantener tu % objetivo.
Actualización **masiva por categoría** ("subí 8% todo Bebidas") en un toque.

**Por qué aporta valor:** la inflación es EL dolor argentino y **nadie lo
resuelve bien**. "Que el sistema te avise que estás vendiendo perdiendo plata"
es una propuesta de valor única, muy vendible en frío.

**Esfuerzo:** Medio. Requiere registrar costo + margen objetivo por producto
(o por categoría) y un cálculo de PVP sugerido. Falta un poco de modelo de
datos (margen objetivo) pero es acotado.

**MVP concreto:**
1. Campo "margen objetivo %" (por producto, default por categoría).
2. Acción que lista productos con margen real < objetivo y sugiere PVP.
3. Actualización masiva por categoría con un %.
4. Alerta en Inicio: "N productos con margen bajo".

---

## Idea 3 — Gesto en WhatsApp (el moat de largo plazo) 🔭 VISIÓN
**Qué es:** un número de WhatsApp por comercio donde (a) al dueño le llega el
**resumen del día y las alertas** (ya tenemos el reporte por mail; llevarlo a
WhatsApp), (b) se le mandan al cliente **recordatorios de fiado** ("Hola, tenés
$X de saldo"), y a futuro (c) el cliente puede **pedir/encargar** por WhatsApp
y cae en el sistema.

**Por qué aporta valor:** en Argentina todo es WhatsApp. Es el canal natural y
el mayor moat: una vez que tu negocio y tus clientes operan por el WhatsApp de
Gesto, no te vas más.

**Esfuerzo:** Alto. Requiere WhatsApp Business API (proveedor tipo 360dialog /
Twilio / Meta) con costo y verificación de número. Es una apuesta grande →
**documentar y planificar**, no improvisar.

**MVP (cuando se decida):** outbound primero (resumen diario + recordatorio de
fiado al cliente), que es lo más simple y ya aporta. El inbound (pedidos) después.

---

## Decisión de producto a resolver: "Catálogo propio"
La idea original era: *usar los productos con código de barras cargados por los
comercios como base de datos para tener un catálogo completo*. Hay dos caminos:

- **Por comercio (v1 segura):** autocompletar/reusar productos que *ese mismo*
  comercio ya cargó. Aporta poco (ya tiene sus productos) — bajo valor.
- **Global compartido (alto valor + moat):** un catálogo maestro
  `código de barras → nombre, categoría, marca` construido con el aporte
  colectivo (anónimo) de todos los comercios. Un kiosco nuevo escanea un
  producto y **ya aparece cargado**. Esto sí es diferenciador (efecto red:
  cuantos más comercios, mejor el catálogo para todos).

**Por qué es una decisión y no una tarea:** el catálogo global implica
**compartir datos entre tenants**. Hay que definir la política de privacidad:
compartir SOLO datos maestros del producto (código, nombre, categoría, marca),
**nunca** precios, costos ni ventas (eso es privado de cada comercio). Recomiendo
hacerlo, pero con esa regla explícita y un opt-in. **No se implementa de noche
sin tu OK** por ser cross-tenant.

---

## Recomendación
Atacar en este orden, porque combinan **valor alto + esfuerzo razonable +
mensaje de venta fuerte**, y se apoyan en lo que Gesto ya tiene:

1. **Precios vivos (Idea 2)** — es EL gancho argentino, único en el mercado.
2. **Reposición inteligente (Idea 1)** — alto valor, ya tenemos los datos.
3. **Catálogo global** — decidir privacidad y arrancar (efecto red).
4. **Gesto en WhatsApp (Idea 3)** — la visión/moat, cuando haya presupuesto para la API.

Las 4 juntas posicionan a Gesto como *"el sistema que piensa por vos"* en vez de
"otro sistema de stock más" — eso rompe el esquema.

---

### Fuentes
- [Software facturación almacenes Argentina — Wynges/Líder Gestión](https://wynges.com/software-facturacion-almacenes-argentina/)
- [Software para kioscos — Gestión Comercio](https://gestioncomercio.com.ar/)
- [Mejores software de cobranza Argentina 2026 — Colektia](https://colektia.com/blog/mejores-software-cobranza-argentina)
- [AI in Retail use cases 2025 — Acropolium](https://acropolium.com/blog/ai-in-retail-use-cases-from-personalization-to-smart-inventory-management/)
- [AI demand forecasting 2025 — InData Labs](https://indatalabs.com/blog/ai-demand-forecasting)
- [WhatsApp + AI digital transformation LATAM — Mexico Business](https://mexicobusiness.news/ecommerce/news/whatsapp-ai-power-next-wave-digital-transformation)
- [The $15B WhatsApp Business economy 2025 — Invent](https://www.useinvent.com/blog/the-usd15b-whatsapp-business-economy-how-to-capture-your-share-2025-guide)
