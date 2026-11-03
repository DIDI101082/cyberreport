-- Migration: finding_retests table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS finding_retests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id   uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  result       TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'partial')),
  notes        TEXT,
  retested_by  TEXT,
  retested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup per finding
CREATE INDEX IF NOT EXISTS idx_finding_retests_finding_id ON finding_retests(finding_id);

-- RLS: any authenticated user can manage retests
ALTER TABLE finding_retests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage retests"
  ON finding_retests
  FOR ALL
  USING (auth.uid() IS NOT NULL);
