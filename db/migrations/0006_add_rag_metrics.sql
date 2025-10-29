-- Migration: Add RAG Metrics and Data Provenance
-- Phase 2: RAG観測とデータ管理
-- Generated: 2025-10-29

-- Create base ai_dialogue_log table if not exists
CREATE TABLE IF NOT EXISTS ai_dialogue_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create ENUMs (with existence check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE TYPE content_type AS ENUM (
      'material',
      'creation_log',
      'generated',
      'note_article',
      'ai_response'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'acquisition_method') THEN
    CREATE TYPE acquisition_method AS ENUM (
      'api_fetch',
      'manual_upload',
      'ai_generated',
      'user_created',
      'system_import'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_type') THEN
    CREATE TYPE license_type AS ENUM (
      'cc_by',
      'cc_by_sa',
      'cc_by_nc',
      'cc_by_nc_sa',
      'proprietary',
      'mit',
      'apache_2_0',
      'all_rights_reserved',
      'public_domain'
    );
  END IF;
END $$;

-- Extend existing ai_dialogue_log table
ALTER TABLE ai_dialogue_log
ADD COLUMN IF NOT EXISTS citations JSONB,
ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
ADD COLUMN IF NOT EXISTS token_cost_jpy NUMERIC(8,2),
ADD COLUMN IF NOT EXISTS citation_rate NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER,
ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
ADD COLUMN IF NOT EXISTS total_tokens INTEGER,
ADD COLUMN IF NOT EXISTS relevance_score NUMERIC(3,2),
ADD COLUMN IF NOT EXISTS user_feedback INTEGER CHECK (user_feedback IN (-1, 0, 1)),
ADD COLUMN IF NOT EXISTS context_window_size INTEGER,
ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2);

-- Create indices for ai_dialogue_log
CREATE INDEX IF NOT EXISTS idx_ai_dialogue_user ON ai_dialogue_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_dialogue_session ON ai_dialogue_log(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_dialogue_created_at ON ai_dialogue_log(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_dialogue_citation_rate ON ai_dialogue_log(citation_rate);

-- Create provenance table
CREATE TABLE IF NOT EXISTS provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type content_type NOT NULL,

  -- Source management
  source_uri TEXT,
  license_type license_type,
  acquisition_method acquisition_method,
  rights_holder TEXT,
  permission_flag BOOLEAN DEFAULT false,

  -- Digital signature
  hash_c2pa TEXT,
  hash_sha256 TEXT,

  -- Metadata
  retention_years INTEGER,
  access_policy JSONB,
  external_share_consent BOOLEAN DEFAULT false,

  -- Audit trail
  acquired_by UUID,
  acquired_at TIMESTAMP,
  last_verified_at TIMESTAMP,
  verification_status VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indices for provenance
CREATE INDEX IF NOT EXISTS idx_provenance_content ON provenance(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_provenance_source ON provenance(source_uri);
CREATE INDEX IF NOT EXISTS idx_provenance_license ON provenance(license_type);
CREATE INDEX IF NOT EXISTS idx_provenance_retention ON provenance(retention_years);

-- Create RAG metrics history table
CREATE TABLE IF NOT EXISTS rag_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,

  -- Citation metrics
  citation_rate NUMERIC(5,2),
  citation_count INTEGER,
  unique_sources_count INTEGER,

  -- Latency metrics
  latency_p50_ms INTEGER,
  latency_p95_ms INTEGER,
  latency_p99_ms INTEGER,

  -- Cost metrics
  cost_per_answer NUMERIC(6,2),
  total_cost NUMERIC(10,2),

  -- Volume metrics
  total_queries INTEGER,
  unique_users INTEGER,
  average_tokens_per_query INTEGER,

  -- Quality metrics
  average_relevance_score NUMERIC(3,2),
  positive_votes_rate NUMERIC(5,2),

  -- SLO compliance
  slo_compliance JSONB,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indices for rag_metrics_history
CREATE INDEX IF NOT EXISTS idx_rag_metrics_date ON rag_metrics_history(date);
CREATE INDEX IF NOT EXISTS idx_rag_metrics_compliance ON rag_metrics_history USING GIN (slo_compliance);

-- Create plugin registry table
CREATE TABLE IF NOT EXISTS plugin_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  source VARCHAR(50) NOT NULL UNIQUE,

  -- Capabilities
  capabilities JSONB NOT NULL,

  -- Configuration
  config JSONB,
  api_endpoint TEXT,
  api_key_env_var VARCHAR(100),

  -- Status
  enabled BOOLEAN DEFAULT true,
  version VARCHAR(20) NOT NULL,
  last_health_check TIMESTAMP,
  health_status VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indices for plugin_registry
CREATE INDEX IF NOT EXISTS idx_plugin_name ON plugin_registry(name);
CREATE INDEX IF NOT EXISTS idx_plugin_enabled ON plugin_registry(enabled);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers (only if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_ai_dialogue_log_updated_at'
  ) THEN
    CREATE TRIGGER update_ai_dialogue_log_updated_at
      BEFORE UPDATE ON ai_dialogue_log
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_provenance_updated_at'
  ) THEN
    CREATE TRIGGER update_provenance_updated_at
      BEFORE UPDATE ON provenance
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_plugin_registry_updated_at'
  ) THEN
    CREATE TRIGGER update_plugin_registry_updated_at
      BEFORE UPDATE ON plugin_registry
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert default plugin registrations
INSERT INTO plugin_registry (name, source, capabilities, version, enabled)
VALUES
  ('Note.com Integration', 'note',
   '{"list": true, "search": true, "filter": true, "fetch": true, "transform": false}'::jsonb,
   '1.0.0', true),
  ('Local Materials', 'local',
   '{"list": true, "search": true, "filter": true, "fetch": true, "transform": true}'::jsonb,
   '1.0.0', true)
ON CONFLICT (name) DO NOTHING;