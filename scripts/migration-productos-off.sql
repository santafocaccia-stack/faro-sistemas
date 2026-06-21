-- Tabla de referencia global: productos de Open Food Facts (Argentina)
-- Sin RLS, sin tenant_id. Solo lectura desde la app.
CREATE TABLE IF NOT EXISTS productos_off (
  codigo_barras text PRIMARY KEY,
  nombre_producto text NOT NULL
);

-- Índice para búsqueda por código (ya es PK, pero lo dejamos explícito)
-- No se necesita índice extra dado que es lookup exacto por PK.
