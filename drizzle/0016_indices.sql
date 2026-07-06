-- 0016_indices.sql — Auditoría de índices (2026-07). Idempotente.
--
-- Cobertura revisada contra pg_indexes: todas las tablas tenant-scoped ya
-- tienen compuestos (tenant_id, ...) para sus queries frecuentes. Único
-- faltante detectado:
--
-- dashboardPrestamos: SUM de pagos del mes filtra tenant_id + fecha (+ anulado_at).
CREATE INDEX IF NOT EXISTS idx_pagos_prestamo_tenant_fecha
  ON public.pagos_prestamo USING btree (tenant_id, fecha);
