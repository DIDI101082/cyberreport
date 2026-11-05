-- Migration: SaaS Management — tenants, roles, user management
-- ============================================================
-- Run this in Supabase SQL Editor → New query → Run

-- 1. Create tenants table (if not exists)
CREATE TABLE IF NOT EXISTS tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  plan        TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'agency')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 2. Add role column to profiles (super_admin, admin, member, viewer)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('super_admin', 'admin', 'member', 'viewer'));

-- 3. Add full_name and avatar_url if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 4. RLS: tenants — super_admin sees all, others see own
CREATE POLICY "super_admin can read all tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "members can read own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "super_admin can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

-- 5. RLS: profiles — super_admin sees all, admin sees own tenant, member sees own
CREATE POLICY "super_admin can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role = 'super_admin'
    )
  );

CREATE POLICY "admin can read own tenant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles p2 WHERE p2.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p3
      WHERE p3.id = auth.uid()
        AND p3.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "admin can update profiles in own tenant"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles p2 WHERE p2.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p3
      WHERE p3.id = auth.uid()
        AND p3.role IN ('super_admin', 'admin')
    )
  );

-- 6. Set first user as super_admin (optional — run manually if needed)
-- UPDATE profiles SET role = 'super_admin' WHERE id = '<your-user-id>';
