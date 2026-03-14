-- ============================================================
-- Módulo de Configuración - Colegio Padre Bruno M.
-- Ejecutar en el SQL Editor de Supabase (Dashboard > SQL Editor)
-- ============================================================

-- 1) Extender school_settings (si ya existe current_academic_year)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_settings') THEN
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS school_name text;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS phone text;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS enrollments_open boolean DEFAULT true;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS matricula_amount_nio numeric DEFAULT 300;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS matricula_amount_usd numeric DEFAULT 8;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS alertas_morosidad boolean DEFAULT true;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS recordatorios_pago boolean DEFAULT true;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS reportes_semanales boolean DEFAULT false;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS discount_siblings_enabled boolean DEFAULT true;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS discount_early_enabled boolean DEFAULT false;
    ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS logo_url text;
  END IF;
END $$;

-- 2) Tabla de precios por grado (mensualidad)
CREATE TABLE IF NOT EXISTS grade_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id uuid NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  amount_nio numeric NOT NULL DEFAULT 0,
  amount_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(grade_id)
);

-- RLS para grade_prices (lectura/escritura para usuarios autenticados)
ALTER TABLE grade_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grade_prices_select" ON grade_prices;
CREATE POLICY "grade_prices_select" ON grade_prices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "grade_prices_all" ON grade_prices;
CREATE POLICY "grade_prices_all" ON grade_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) Tabla de usuarios de la aplicación (roles y estado)
-- id = auth.users.id para vincular con Supabase Auth
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'Cobrador' CHECK (role IN ('Administrador', 'Cobrador')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_users_select" ON app_users;
CREATE POLICY "app_users_select" ON app_users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "app_users_insert" ON app_users;
CREATE POLICY "app_users_insert" ON app_users FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "app_users_update" ON app_users;
CREATE POLICY "app_users_update" ON app_users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "app_users_delete" ON app_users;
CREATE POLICY "app_users_delete" ON app_users FOR DELETE TO authenticated USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_grade_prices_grade_id ON grade_prices(grade_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Insertar precios por defecto para cada grado existente (si no existen)
INSERT INTO grade_prices (grade_id, amount_nio, amount_usd)
  SELECT g.id, 1500, 50 FROM grades g
  ON CONFLICT (grade_id) DO NOTHING;

-- Sincronizar usuarios existentes de Auth a app_users (opcional: ejecutar una vez)
-- INSERT INTO app_users (id, email, full_name, role, is_active)
--   SELECT id, email, raw_user_meta_data->>'full_name', 'Administrador', true
--   FROM auth.users
--   ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(app_users.full_name, EXCLUDED.full_name);
