-- =============================================================================
-- CyberReport - Schema Base (001_schema.sql)
-- Ejecutar en Supabase SQL Editor ANTES que 002 y 003
-- =============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE finding_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE finding_status   AS ENUM ('open', 'in_progress', 'resolved', 'accepted', 'false_positive');
CREATE TYPE report_status    AS ENUM ('draft', 'in_review', 'approved', 'delivered');
CREATE TYPE report_type      AS ENUM ('technical', 'executive', 'combined');
CREATE TYPE project_status   AS ENUM ('planning', 'active', 'completed', 'archived');
CREATE TYPE framework_type   AS ENUM ('OWASP', 'ISO27001', 'PCI_DSS', 'NIST_CSF', 'CIS_CONTROLS', 'CWE', 'GDPR', 'HIPAA');

-- =============================================================================
-- TENANTS (organizaciones clientes de la plataforma SaaS)
-- =============================================================================

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  domain        TEXT,
  logo_url      TEXT,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PROFILES (usuarios vinculados a auth.users de Supabase)
-- =============================================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('owner', 'admin', 'analyst', 'viewer')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_profiles_email  ON profiles(email);

-- =============================================================================
-- ORGANIZATIONS (clientes del pentester — empresas que contratan el servicio)
-- =============================================================================

CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  industry      TEXT,
  website       TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url      TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_tenant ON organizations(tenant_id);

-- =============================================================================
-- PROJECTS (proyectos de pentest)
-- =============================================================================

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  scope           TEXT,
  methodology     TEXT,
  status          project_status NOT NULL DEFAULT 'planning',
  start_date      DATE,
  end_date        DATE,
  lead_analyst_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_tenant       ON projects(tenant_id);
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_status       ON projects(status);

-- =============================================================================
-- FINDINGS (vulnerabilidades / hallazgos)
-- =============================================================================

CREATE TABLE findings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  severity        finding_severity NOT NULL DEFAULT 'medium',
  status          finding_status   NOT NULL DEFAULT 'open',
  cvss_score      NUMERIC(4,1),
  cvss_vector     TEXT,
  cve_ids         TEXT[],
  affected_assets TEXT[],
  proof_of_concept TEXT,
  impact          TEXT,
  recommendation  TEXT,
  external_refs   TEXT[],
  evidence        JSONB NOT NULL DEFAULT '[]',   -- array de {type, url, description}
  tool_source     TEXT,                           -- nessus, burp, zap, qualys, nmap, manual
  raw_tool_data   JSONB,
  ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_tenant    ON findings(tenant_id);
CREATE INDEX idx_findings_project   ON findings(project_id);
CREATE INDEX idx_findings_severity  ON findings(severity);
CREATE INDEX idx_findings_status    ON findings(status);

-- =============================================================================
-- FRAMEWORK CONTROLS (controles de compliance)
-- =============================================================================

CREATE TABLE framework_controls (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  framework     framework_type NOT NULL,
  control_id    TEXT NOT NULL,          -- ej: "A.12.6.1", "PCI 6.3.2"
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(framework, control_id)
);

CREATE INDEX idx_framework_controls_framework ON framework_controls(framework);

-- =============================================================================
-- FINDING CONTROLS (relación N:M entre findings y controles)
-- =============================================================================

CREATE TABLE finding_controls (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  finding_id           UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  framework_control_id UUID NOT NULL REFERENCES framework_controls(id) ON DELETE CASCADE,
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(finding_id, framework_control_id)
);

CREATE INDEX idx_finding_controls_finding ON finding_controls(finding_id);
CREATE INDEX idx_finding_controls_tenant  ON finding_controls(tenant_id);

-- =============================================================================
-- REPORTS
-- =============================================================================

CREATE TABLE reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  report_type     report_type   NOT NULL DEFAULT 'combined',
  status          report_status NOT NULL DEFAULT 'draft',
  executive_summary TEXT,
  technical_summary TEXT,
  content         JSONB NOT NULL DEFAULT '{}',  -- contenido generado por IA
  findings_ids    UUID[],                        -- snapshot de findings incluidos
  ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
  generated_at    TIMESTAMPTZ,
  approved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  file_url        TEXT,                          -- PDF/PPTX exportado en Storage
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_tenant  ON reports(tenant_id);
CREATE INDEX idx_reports_project ON reports(project_id);
CREATE INDEX idx_reports_status  ON reports(status);

-- =============================================================================
-- FINDING COMMENTS (historial de comentarios / retesting)
-- =============================================================================

CREATE TABLE finding_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  finding_id  UUID NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = visible al cliente
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_finding_comments_finding ON finding_comments(finding_id);
CREATE INDEX idx_finding_comments_tenant  ON finding_comments(tenant_id);

-- =============================================================================
-- TOOL IMPORTS (historial de importaciones de herramientas)
-- =============================================================================

CREATE TABLE tool_imports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tool_name     TEXT NOT NULL,   -- nessus, burp_suite, zap, qualys, nmap
  file_name     TEXT,
  raw_data      JSONB,
  findings_count INTEGER NOT NULL DEFAULT 0,
  imported_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_imports_tenant  ON tool_imports(tenant_id);
CREATE INDEX idx_tool_imports_project ON tool_imports(project_id);

-- =============================================================================
-- TRIGGER: updated_at automático
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_tenants
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_findings
  BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_reports
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TRIGGER: auto-crear tenant + profile en signup
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  v_slug TEXT;
BEGIN
  -- Generar slug único a partir del email
  v_slug := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'))
            || '-' || SUBSTR(NEW.id::TEXT, 1, 8);

  -- Crear tenant
  INSERT INTO tenants (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company', SPLIT_PART(NEW.email, '@', 1)),
    v_slug
  )
  RETURNING id INTO v_tenant_id;

  -- Crear profile
  INSERT INTO profiles (id, tenant_id, email, full_name, role)
  VALUES (
    NEW.id,
    v_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Helper: obtener tenant_id del usuario actual
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---- tenants ----
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (id = get_tenant_id());

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (id = get_tenant_id());

-- ---- profiles ----
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ---- organizations ----
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_all" ON organizations
  FOR ALL USING (tenant_id = get_tenant_id());

-- ---- projects ----
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_all" ON projects
  FOR ALL USING (tenant_id = get_tenant_id());

-- ---- findings ----
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "findings_all" ON findings
  FOR ALL USING (tenant_id = get_tenant_id());

-- ---- framework_controls (lectura pública — datos maestros) ----
ALTER TABLE framework_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "framework_controls_select" ON framework_controls
  FOR SELECT USING (TRUE);

-- ---- finding_controls ----
ALTER TABLE finding_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finding_controls_all" ON finding_controls
  FOR ALL USING (tenant_id = get_tenant_id());

-- ---- reports ----
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_all" ON reports
  FOR ALL USING (tenant_id = get_tenant_id());

-- ---- finding_comments ----
ALTER TABLE finding_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finding_comments_all" ON finding_comments
  FOR ALL USING (tenant_id = get_tenant_id());

-- ---- tool_imports ----
ALTER TABLE tool_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_imports_all" ON tool_imports
  FOR ALL USING (tenant_id = get_tenant_id());

-- =============================================================================
-- VISTAS ÚTILES
-- =============================================================================

-- Estadísticas por proyecto
CREATE OR REPLACE VIEW project_stats AS
SELECT
  p.id AS project_id,
  p.tenant_id,
  p.name AS project_name,
  p.status,
  COUNT(f.id)                                                          AS total_findings,
  COUNT(f.id) FILTER (WHERE f.severity = 'critical')                  AS critical_count,
  COUNT(f.id) FILTER (WHERE f.severity = 'high')                      AS high_count,
  COUNT(f.id) FILTER (WHERE f.severity = 'medium')                    AS medium_count,
  COUNT(f.id) FILTER (WHERE f.severity = 'low')                       AS low_count,
  COUNT(f.id) FILTER (WHERE f.severity = 'info')                      AS info_count,
  COUNT(f.id) FILTER (WHERE f.status = 'open')                        AS open_count,
  COUNT(f.id) FILTER (WHERE f.status = 'resolved')                    AS resolved_count,
  CASE
    WHEN COUNT(f.id) = 0 THEN 100
    ELSE ROUND(
      (COUNT(f.id) FILTER (WHERE f.status = 'resolved')::NUMERIC / COUNT(f.id)) * 100
    )
  END AS resolution_rate,
  MAX(f.updated_at) AS last_activity
FROM projects p
LEFT JOIN findings f ON f.project_id = p.id
GROUP BY p.id, p.tenant_id, p.name, p.status;

-- Resumen del tenant
CREATE OR REPLACE VIEW tenant_summary AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  COUNT(DISTINCT p.id)  AS total_projects,
  COUNT(DISTINCT o.id)  AS total_organizations,
  COUNT(DISTINCT f.id)  AS total_findings,
  COUNT(DISTINCT f.id) FILTER (WHERE f.severity = 'critical' AND f.status = 'open') AS open_critical,
  COUNT(DISTINCT f.id) FILTER (WHERE f.severity = 'high'     AND f.status = 'open') AS open_high,
  COUNT(DISTINCT r.id)  AS total_reports,
  COUNT(DISTINCT pr.id) FILTER (WHERE pr.role IN ('owner','admin','analyst'))        AS total_users
FROM tenants t
LEFT JOIN projects      p  ON p.tenant_id = t.id
LEFT JOIN organizations o  ON o.tenant_id = t.id
LEFT JOIN findings      f  ON f.tenant_id = t.id
LEFT JOIN reports       r  ON r.tenant_id = t.id
LEFT JOIN profiles      pr ON pr.tenant_id = t.id
GROUP BY t.id, t.name;

-- =============================================================================
-- DATOS SEMILLA: controles de frameworks más usados
-- =============================================================================

INSERT INTO framework_controls (framework, control_id, title, description, category) VALUES
-- OWASP Top 10 2021
('OWASP', 'A01:2021', 'Broken Access Control',           'Restricciones sobre lo que los usuarios pueden hacer no se aplican correctamente', 'Access Control'),
('OWASP', 'A02:2021', 'Cryptographic Failures',          'Fallas relacionadas con criptografía que conducen a exposición de datos sensibles', 'Cryptography'),
('OWASP', 'A03:2021', 'Injection',                       'Datos no confiables enviados a un intérprete como parte de un comando o consulta', 'Injection'),
('OWASP', 'A04:2021', 'Insecure Design',                 'Riesgos relacionados con fallas de diseño y arquitectura', 'Design'),
('OWASP', 'A05:2021', 'Security Misconfiguration',       'Configuraciones de seguridad incorrectas o predeterminadas', 'Configuration'),
('OWASP', 'A06:2021', 'Vulnerable and Outdated Components', 'Componentes con vulnerabilidades conocidas', 'Dependencies'),
('OWASP', 'A07:2021', 'Identification and Authentication Failures', 'Fallas en autenticación e identificación', 'Authentication'),
('OWASP', 'A08:2021', 'Software and Data Integrity Failures', 'Código e infraestructura que no protegen contra violaciones de integridad', 'Integrity'),
('OWASP', 'A09:2021', 'Security Logging and Monitoring Failures', 'Fallas en logging y monitoreo de seguridad', 'Logging'),
('OWASP', 'A10:2021', 'Server-Side Request Forgery',     'SSRF cuando una app web obtiene un recurso remoto sin validar la URL', 'Injection'),
-- ISO 27001:2022
('ISO27001', 'A.5.1',  'Policies for information security',        'Políticas de seguridad de la información', 'Organizational'),
('ISO27001', 'A.5.15', 'Access control',                           'Control de acceso a información y activos', 'Access Control'),
('ISO27001', 'A.5.23', 'Information security for use of cloud services', 'Seguridad para servicios en la nube', 'Cloud'),
('ISO27001', 'A.8.7',  'Protection against malware',               'Protección contra malware', 'Endpoint'),
('ISO27001', 'A.8.8',  'Management of technical vulnerabilities',  'Gestión de vulnerabilidades técnicas', 'Vulnerability Management'),
('ISO27001', 'A.8.20', 'Networks security',                        'Seguridad de redes', 'Network'),
('ISO27001', 'A.8.24', 'Use of cryptography',                      'Uso de criptografía', 'Cryptography'),
('ISO27001', 'A.8.25', 'Secure development life cycle',            'Ciclo de vida de desarrollo seguro', 'Development'),
-- PCI DSS v4.0
('PCI_DSS', '1.3', 'Network access controls',                      'Controles de acceso a la red', 'Network'),
('PCI_DSS', '2.2', 'System components configured securely',        'Componentes configurados de forma segura', 'Configuration'),
('PCI_DSS', '3.5', 'PAN secured with strong cryptography',         'PAN protegido con criptografía fuerte', 'Cryptography'),
('PCI_DSS', '6.2', 'Bespoke and custom software security',         'Seguridad de software a medida', 'Development'),
('PCI_DSS', '6.3', 'Security vulnerabilities identified and addressed', 'Vulnerabilidades identificadas y gestionadas', 'Vulnerability Management'),
('PCI_DSS', '8.2', 'User identification and authentication',       'Identificación y autenticación de usuarios', 'Authentication'),
('PCI_DSS', '10.2', 'Audit logs',                                  'Registros de auditoría', 'Logging'),
-- NIST CSF 2.0
('NIST_CSF', 'GV.OC', 'Organizational Context',         'Comprensión del contexto organizacional', 'Govern'),
('NIST_CSF', 'ID.AM', 'Asset Management',               'Gestión de activos', 'Identify'),
('NIST_CSF', 'ID.RA', 'Risk Assessment',                'Evaluación de riesgos', 'Identify'),
('NIST_CSF', 'PR.AC', 'Identity Management and Access', 'Gestión de identidad y acceso', 'Protect'),
('NIST_CSF', 'PR.DS', 'Data Security',                  'Seguridad de datos', 'Protect'),
('NIST_CSF', 'DE.CM', 'Continuous Monitoring',          'Monitoreo continuo', 'Detect'),
('NIST_CSF', 'RS.RP', 'Incident Management',            'Gestión de incidentes', 'Respond'),
('NIST_CSF', 'RC.RP', 'Incident Recovery Plan',         'Plan de recuperación', 'Recover')
ON CONFLICT (framework, control_id) DO NOTHING;

-- =============================================================================
-- FIN DEL SCHEMA BASE
-- Orden de ejecución:
--   1. Este archivo (001_schema.sql)
--   2. migrations/002_code_analysis.sql
--   3. migrations/003_billing.sql
-- =============================================================================
