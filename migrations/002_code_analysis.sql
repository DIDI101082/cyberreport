-- ============================================================
-- CyberReport — Migración 002: Code Security Analyzer
-- ============================================================

-- Tabla de sesiones de análisis de código
CREATE TABLE IF NOT EXISTS code_analysis_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES auth.users(id),

  -- Metadata del análisis
  language          TEXT NOT NULL DEFAULT 'Multi',
  files_analyzed    INTEGER NOT NULL DEFAULT 0,
  lines_analyzed    INTEGER NOT NULL DEFAULT 0,
  duration_ms       INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  frameworks_checked TEXT[] NOT NULL DEFAULT '{}',

  -- Resultados
  issues            JSONB NOT NULL DEFAULT '[]',
  health_score      JSONB NOT NULL DEFAULT '{}',
  summary           TEXT,
  positive_findings TEXT[] DEFAULT '{}'
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_code_analysis_tenant     ON code_analysis_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_code_analysis_project    ON code_analysis_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_code_analysis_created_at ON code_analysis_sessions(created_at DESC);

-- RLS (Row Level Security) — aislamiento multi-tenant
ALTER TABLE code_analysis_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_code_analysis"
  ON code_analysis_sessions
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Vista auxiliar: health scores por proyecto
CREATE OR REPLACE VIEW project_code_health AS
SELECT
  s.project_id,
  s.total_sessions,
  latest.last_analyzed_at,
  (latest.health_score->>'overall')::numeric AS last_overall_score,
  latest.health_score->>'grade'              AS last_grade,
  jsonb_array_length(latest.issues)          AS last_issue_count
FROM (
  SELECT project_id, COUNT(*) AS total_sessions
  FROM code_analysis_sessions
  WHERE project_id IS NOT NULL
  GROUP BY project_id
) s
JOIN LATERAL (
  SELECT created_at AS last_analyzed_at, health_score, issues
  FROM code_analysis_sessions
  WHERE project_id = s.project_id
  ORDER BY created_at DESC
  LIMIT 1
) latest ON TRUE;

-- Función para obtener la última sesión de análisis de un proyecto
CREATE OR REPLACE FUNCTION get_latest_code_analysis(p_project_id UUID)
RETURNS code_analysis_sessions AS $$
  SELECT * FROM code_analysis_sessions
  WHERE project_id = p_project_id
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
