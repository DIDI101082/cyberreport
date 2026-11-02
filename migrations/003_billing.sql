-- ============================================================
-- CyberReport — Migración 003: Planes y Billing
-- ============================================================

-- Enum de planes
CREATE TYPE plan_tier AS ENUM ('starter', 'professional', 'agency');
CREATE TYPE subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'paused');

-- Tabla de planes (catálogo)
CREATE TABLE IF NOT EXISTS plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier        plan_tier NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  price_usd   NUMERIC(10,2) NOT NULL,
  -- Límites
  max_projects      INTEGER,        -- NULL = ilimitado
  max_users         INTEGER,        -- NULL = ilimitado
  max_clients       INTEGER,        -- NULL = ilimitado
  -- Features booleanas
  client_portal     BOOLEAN NOT NULL DEFAULT false,
  white_label       BOOLEAN NOT NULL DEFAULT false,
  tool_import       BOOLEAN NOT NULL DEFAULT false,  -- Nessus, ZAP, Burp, etc.
  api_access        BOOLEAN NOT NULL DEFAULT false,
  multi_workspace   BOOLEAN NOT NULL DEFAULT false,
  priority_support  BOOLEAN NOT NULL DEFAULT false,
  -- Frameworks disponibles (array de strings)
  frameworks        TEXT[] NOT NULL DEFAULT '{OWASP}',
  -- Metadata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de los tres tiers
INSERT INTO plans (tier, name, price_usd, max_projects, max_users, max_clients,
  client_portal, white_label, tool_import, api_access, multi_workspace, priority_support, frameworks)
VALUES
  ('starter',      'Starter',      49,  3,    2,    NULL, false, false, false, false, false, false,
   ARRAY['OWASP']),
  ('professional', 'Professional', 149, NULL, 5,    NULL, true,  false, true,  false, false, false,
   ARRAY['OWASP','ISO27001','PCI-DSS','NIST','CIS']),
  ('agency',       'Agency',       399, NULL, NULL, NULL, true,  true,  true,  true,  true,  true,
   ARRAY['OWASP','ISO27001','PCI-DSS','NIST','CIS'])
ON CONFLICT (tier) DO NOTHING;

-- Tabla de suscripciones por tenant
CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES plans(id),
  status            subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at     TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  canceled_at       TIMESTAMPTZ,
  -- Referencia al procesador de pagos externo (Stripe, MercadoPago, etc.)
  external_id       TEXT,          -- stripe subscription id / mp preapproval id
  payment_method    TEXT,          -- 'stripe' | 'mercadopago' | 'manual'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_tenant
  ON subscriptions(tenant_id)
  WHERE status NOT IN ('canceled');

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_sees_own_subscription"
  ON subscriptions FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Tabla de historial de facturación
CREATE TABLE IF NOT EXISTS billing_invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount_usd    NUMERIC(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  period_start  TIMESTAMPTZ,
  period_end    TIMESTAMPTZ,
  external_id   TEXT,   -- stripe invoice id
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_sees_own_invoices"
  ON billing_invoices FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- Vista útil: tenant con su plan activo
CREATE OR REPLACE VIEW tenant_active_plan AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  p.tier,
  p.name AS plan_name,
  p.price_usd,
  p.max_projects,
  p.max_users,
  p.client_portal,
  p.white_label,
  p.tool_import,
  p.api_access,
  p.multi_workspace,
  p.frameworks,
  s.status AS subscription_status,
  s.trial_ends_at,
  s.current_period_end,
  CASE
    WHEN s.status = 'trialing' AND s.trial_ends_at > NOW() THEN true
    WHEN s.status = 'active' THEN true
    ELSE false
  END AS is_active
FROM tenants t
LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status NOT IN ('canceled')
LEFT JOIN plans p ON p.id = s.plan_id;

-- Función: verificar si un tenant puede crear más proyectos
CREATE OR REPLACE FUNCTION can_create_project(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max    INTEGER;
  v_current INTEGER;
  v_active  BOOLEAN;
BEGIN
  SELECT tap.max_projects, tap.is_active
  INTO v_max, v_active
  FROM tenant_active_plan tap
  WHERE tap.tenant_id = p_tenant_id;

  IF NOT v_active THEN RETURN false; END IF;
  IF v_max IS NULL THEN RETURN true; END IF;  -- ilimitado

  SELECT COUNT(*) INTO v_current
  FROM projects
  WHERE tenant_id = p_tenant_id AND status != 'archived';

  RETURN v_current < v_max;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
