-- 0010 · Ubicación exacta (link de Google Maps) en pedidos atmosféricos.
-- Cuando la dirección de texto no geocodifica bien, el operario pega el link
-- de Maps de la ubicación y la navegación usa coordenadas exactas.
-- Idempotente.

ALTER TABLE "pedidos_atmosfericos"
  ADD COLUMN IF NOT EXISTS "maps_link" text;
