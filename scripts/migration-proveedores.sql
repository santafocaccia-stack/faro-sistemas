-- Migración: Categorías, Grupos de variantes, Proveedores, Pedidos
-- Correr en el SQL Editor de Supabase

-- ──────────────────────────────────────────────
-- 1. Categorías
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  activo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categorias_tenant ON categorias(tenant_id);

-- ──────────────────────────────────────────────
-- 2. Grupos de variantes
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grupos_variantes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_grupos_variantes_tenant ON grupos_variantes(tenant_id);

-- ──────────────────────────────────────────────
-- 3. Actualizar productos: reemplazar categoria (text) por categoria_id (FK)
-- ──────────────────────────────────────────────
ALTER TABLE productos
  DROP COLUMN IF EXISTS categoria,
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grupo_variante_id UUID REFERENCES grupos_variantes(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────
-- 4. Proveedores
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proveedores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nombre              TEXT NOT NULL,
  contacto            TEXT,
  dias_pedido         TEXT[] NOT NULL DEFAULT '{}',
  markup_mayorista    NUMERIC(6,2) NOT NULL DEFAULT 0,
  markup_minorista    NUMERIC(6,2) NOT NULL DEFAULT 0,
  activo              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proveedores_tenant ON proveedores(tenant_id);

-- ──────────────────────────────────────────────
-- 5. Relación producto ↔ proveedor
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS producto_proveedores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  producto_id       UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  proveedor_id      UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  precio_costo      NUMERIC(12,2) NOT NULL DEFAULT 0,
  markup_mayorista  NUMERIC(6,2),   -- NULL = usar el del proveedor
  markup_minorista  NUMERIC(6,2),
  es_principal      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prod_prov_tenant    ON producto_proveedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prod_prov_producto  ON producto_proveedores(producto_id);
CREATE INDEX IF NOT EXISTS idx_prod_prov_proveedor ON producto_proveedores(proveedor_id);

-- ──────────────────────────────────────────────
-- 6. Pedidos a proveedores
-- ──────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS estado_pedido AS ENUM ('borrador', 'enviado', 'recibido');

CREATE TABLE IF NOT EXISTS pedidos_proveedores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  proveedor_id  UUID NOT NULL REFERENCES proveedores(id),
  estado        estado_pedido NOT NULL DEFAULT 'borrador',
  notas         TEXT,
  enviado_at    TIMESTAMPTZ,
  recibido_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_prov_tenant    ON pedidos_proveedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_prov_proveedor ON pedidos_proveedores(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_prov_estado    ON pedidos_proveedores(tenant_id, estado);

-- ──────────────────────────────────────────────
-- 7. Líneas de pedido (acumuladas automáticamente al vender)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos_lineas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pedido_id         UUID NOT NULL REFERENCES pedidos_proveedores(id) ON DELETE CASCADE,
  producto_id       UUID NOT NULL REFERENCES productos(id),
  cantidad_pedida   NUMERIC(12,3) NOT NULL DEFAULT 0,
  cantidad_recibida NUMERIC(12,3),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_lineas_tenant   ON pedidos_lineas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_lineas_pedido   ON pedidos_lineas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_lineas_producto ON pedidos_lineas(producto_id);

-- ──────────────────────────────────────────────
-- 8. RLS: habilitar en las nuevas tablas
-- ──────────────────────────────────────────────
ALTER TABLE categorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_variantes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_lineas     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_anon_categorias"          ON categorias         FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_anon_grupos_variantes"    ON grupos_variantes   FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_anon_proveedores"         ON proveedores        FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_anon_producto_proveedores" ON producto_proveedores FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_anon_pedidos_proveedores" ON pedidos_proveedores FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_anon_pedidos_lineas"      ON pedidos_lineas     FOR ALL TO anon, authenticated USING (false);
