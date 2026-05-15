-- Migración: Mercado Pago del negocio (OAuth para cobros propios)
-- Correr en el SQL Editor de Supabase

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS mp_negocio_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS mp_negocio_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS mp_negocio_token_expiry  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mp_negocio_user_id       TEXT;
