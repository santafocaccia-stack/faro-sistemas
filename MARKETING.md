# Gesto — Marketing

## 1. Imágenes de beneficios

### Plan Market — prompt para Gemini / ChatGPT / Midjourney

```
Creame una imagen estilo infografía moderna para redes sociales (formato cuadrado 1080x1080).
Temática: beneficios del sistema de gestión "Gesto" para kioscos, almacenes, carnicerías y dietéticas.

Paleta de colores: fondo oscuro casi negro (#0f0d0b), acentos naranja (#f97316), texto claro (#e8e2d9).
Tipografía limpia, estilo tech/startup. Sin fotos de personas.

Logo "Gesto" arriba a la izquierda (letra G en cuadrado naranja + texto "Gesto"). Badge "Market" arriba a la derecha en naranja.
Tagline principal: "Tu negocio, siempre en orden."
Subtítulo: "Para kioscos, almacenes, carnicerías, dietéticas y más."

Mostrar 8 beneficios en grilla 2 columnas con íconos minimalistas y texto corto:
1. 🧾 "Cobrá en segundos" — Efectivo, transferencia o Mercado Pago
2. 📦 "Stock siempre al día" — Recibís un aviso cuando algo se está por agotar
3. 🏷️ "Vendé por mayor y menor" — Precios distintos para cada tipo de cliente
4. 👥 "Fiado organizado" — Cuenta corriente digital por cada cliente
5. 🚚 "Pedidos a proveedores" — Armá el pedido y envialo directo por WhatsApp
6. 📊 "Reporte semanal" — Te llega por mail cada lunes, sin hacer nada
7. 📷 "Escaneá con la cámara" — Cargá o cobrá productos desde el celular
8. 👤 "Gestioná tu equipo" — Roles distintos para dueño, admin y empleado

En la parte inferior: URL "usegesto.app" en texto tenue.
Estilo visual: minimalista, profesional, oscuro cálido. Sin decoración innecesaria.
```

---

### Plan Servicios — prompt para Gemini / ChatGPT / Midjourney

```
Creame una imagen estilo infografía moderna para redes sociales (formato cuadrado 1080x1080).
Temática: beneficios del sistema "Gesto" para prestadores de servicios: electricistas, plomeros, técnicos, consultores y diseñadores.

Paleta de colores: fondo oscuro casi negro (#0f0d0b), acentos naranja (#f97316), texto claro (#e8e2d9).
Tipografía limpia, estilo tech/startup. Sin fotos de personas.

Logo "Gesto" arriba a la izquierda (letra G en cuadrado naranja + texto "Gesto"). Badge "Servicios" arriba a la derecha en naranja.
Tagline principal: "Presupuestá, cobrá, seguí adelante."
Subtítulo: "Para electricistas, plomeros, técnicos, consultores y diseñadores."

Mostrar 8 beneficios en grilla 2 columnas con íconos minimalistas y texto corto:
1. 📋 "Presupuestos en PDF" — Profesionales, desde el celular en segundos
2. 📲 "Enviá por WhatsApp" — Sin imprimir ni adjuntar ningún archivo
3. 📌 "Plantillas de trabajos" — Guardá uno y reutilizalo en futuros presupuestos
4. 💳 "Cobros con Mercado Pago" — Sin efectivo, sin vuelta, sin complicaciones
5. 👥 "Cuenta corriente" — Quién te debe, cuánto y desde cuándo
6. 📁 "Historial de trabajos" — Buscás al cliente y ves todo lo que le hiciste
7. 📊 "Reporte semanal" — Te llega por mail cada lunes, automático
8. 🤝 "Gestioná tu equipo" — Tu socio o empleado con su propio acceso

En la parte inferior: URL "usegesto.app" en texto tenue.
Estilo visual: minimalista, profesional, oscuro cálido. Sin decoración innecesaria.
```

---

## 2. Estrategia de 15 días de prueba

### Objetivo
Convertir el mayor % posible de trials (15 días) a usuarios pagos activos.
El período de prueba es el momento más crítico del funnel.

---

### Secuencia de emails automáticos (usar Resend)

| Día | Trigger | Asunto | Contenido |
|-----|---------|--------|-----------|
| 0 | Signup | ¡Bienvenido a Gesto! | Onboarding rápido: agregar 3 productos, hacer primera venta. Video de 2 min. |
| 1 | Sin actividad | ¿Empezamos? | Link directo al POS con texto: "Tu primera venta tarda menos de 2 minutos" |
| 3 | Post primera venta | Tu primera venta fue un éxito 🎉 | Celebrar + mostrar feature siguiente: categorías o proveedores |
| 7 | Mitad del trial | ¿Cómo va tu semana? | Resumen de lo que usó + lo que no exploró todavía |
| 12 | 3 días antes de vencer | Tu prueba vence en 3 días | Comparar precio vs beneficio. CTA claro: "Contratar ahora — $X/mes" |
| 14 | 1 día antes | Último día de prueba | Urgencia real. Testimonial corto. Botón grande: "Seguir usando Gesto" |
| 15+3 | Si no convirtió | Extrañamos tu negocio | Oferta especial: primer mes con descuento |

**Nota técnica:** Implementar con Resend + trigger en server actions al crear usuario y al actualizar status del tenant.

---

### Estrategia de contenido (Instagram / TikTok)

**Frecuencia:** 3 posts/semana.

**Formato A — Tutorial rápido (Reels, 30-60 seg)**
- "Cómo cobrar sin efectivo en tu kiosco"
- "Cómo mandar un presupuesto por WhatsApp en 30 segundos"
- "Cómo saber qué vendiste esta semana sin abrir Excel"

**Formato B — Antes/Después**
- "Antes: cuaderno de fiado | Después: Gesto"
- "Antes: presupuesto en Word | Después: PDF profesional al toque"

**Formato C — Social proof**
- Screenshots de métricas reales (con permiso de usuarios)
- "Este kiosco vendió $X esta semana usando Gesto"

---

### Canal WhatsApp (outbound)

Para los primeros 50-100 clientes:

1. **Identificar negocios objetivo** en Mercado Libre (vendedores de almacén, kioscos), Instagram (negocios locales), Google Maps.
2. **Mensaje template:**
   ```
   Hola [nombre]! Vi tu negocio en [canal].
   Estoy lanzando Gesto, un sistema para manejar stock, ventas y presupuestos desde el celular.
   15 días de prueba gratis, sin tarjeta.
   ¿Te mando el link para probarlo?
   ```
3. **Meta:** 5 chats/día → 1-2 trials/día → 0.5 pagos/día.

---

### Precio y posicionamiento

- Mostrar el costo como: **"menos de una pizza por semana"** o **"$X/día"**
- Ancla: competidor más conocido cuesta X veces más
- Garantía: "si en 15 días no ves el beneficio, no te cobramos nada"

---

### Métricas a trackear

| Métrica | Objetivo mes 1 |
|---------|----------------|
| Trials iniciados | 50 |
| Activación (al menos 1 venta) | 60% → 30 |
| Conversión a pago | 30% → 15 |
| Churn mes 1 | < 20% |

---

### Quick wins (hacer esta semana)

- [ ] Agregar email de bienvenida automático con Resend al hacer signup
- [ ] Configurar CRON_SECRET + RESEND_API_KEY en Vercel para activar el reporte semanal
- [ ] Grabar primer Reel de tutorial (pantalla del celular + voice-over)
- [ ] Crear perfil de Instagram @usegesto o @gestook
