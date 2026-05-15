-- Migración: Sistema de planes Gesto
-- Correr en el SQL Editor de Supabase

-- 1. Crear nuevo enum plan_gesto
CREATE TYPE plan_gesto AS ENUM ('servicios', 'market', 'food', 'balanza');

-- 2. Agregar columna temporal con el nuevo tipo
ALTER TABLE tenants ADD COLUMN plan_new plan_gesto NOT NULL DEFAULT 'market';

-- 3. Migrar datos existentes (todos pasan a 'market' como base)
UPDATE tenants SET plan_new = 'market';

-- 4. Eliminar columna vieja y renombrar
ALTER TABLE tenants DROP COLUMN plan;
ALTER TABLE tenants RENAME COLUMN plan_new TO plan;

-- 5. Agregar columna mp_subscription_id
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT;

-- 6. Setear trialEnd a 14 días desde createdAt para tenants que no lo tengan
UPDATE tenants
SET trial_end = created_at + INTERVAL '14 days'
WHERE trial_end IS NULL AND status = 'trial';
