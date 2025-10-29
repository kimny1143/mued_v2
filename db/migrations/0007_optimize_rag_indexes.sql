-- Migration: Optimize RAG Metrics Indexes
-- Phase 2: Performance optimization for analytics queries
-- Created: 2025-10-29

-- Composite index for user analytics queries
-- Benefits: Optimizes "get user dialogue history" and dashboard analytics
-- Query pattern: SELECT * FROM ai_dialogue_log WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_ai_dialogue_user_created
ON ai_dialogue_log(user_id, created_at DESC);

-- Partial index for expiring content
-- Benefits: Speeds up retention policy enforcement queries
-- Query pattern: SELECT * FROM provenance WHERE retention_years IS NOT NULL AND acquired_at + interval...
CREATE INDEX IF NOT EXISTS idx_provenance_expiring
ON provenance(retention_years, acquired_at)
WHERE retention_years IS NOT NULL;

-- Unique constraint on daily metrics
-- Benefits: Prevents duplicate daily metrics records (data integrity)
-- Query pattern: Ensure only one metrics record per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_metrics_date_unique
ON rag_metrics_history(DATE(date));

-- Partial index for active plugins
-- Benefits: Optimizes plugin discovery queries for active integrations
-- Query pattern: SELECT * FROM plugin_registry WHERE enabled = true AND health_status = 'healthy'
CREATE INDEX IF NOT EXISTS idx_plugin_enabled_healthy
ON plugin_registry(name, last_health_check)
WHERE enabled = true AND health_status = 'healthy';

-- Add database-level comments for documentation
COMMENT ON TABLE ai_dialogue_log IS 'RAG dialogue logs with citation tracking and quality metrics';
COMMENT ON COLUMN ai_dialogue_log.citations IS 'JSONB array of citation objects with source, confidence, and timestamp';
COMMENT ON COLUMN ai_dialogue_log.latency_ms IS 'Response latency in milliseconds for performance monitoring';
COMMENT ON COLUMN ai_dialogue_log.citation_rate IS 'Percentage of response backed by citations (0-100)';

COMMENT ON TABLE provenance IS 'Data provenance tracking for compliance and transparency (GDPR, C2PA ready)';
COMMENT ON COLUMN provenance.hash_c2pa IS 'C2PA digital signature hash for content authenticity verification';
COMMENT ON COLUMN provenance.retention_years IS 'Data retention period in years for GDPR compliance';

COMMENT ON TABLE rag_metrics_history IS 'Daily aggregated RAG metrics for dashboard and SLO monitoring';
COMMENT ON COLUMN rag_metrics_history.slo_compliance IS 'JSONB object tracking SLO targets: citationRateMet, latencyMet, costMet, overallMet';

COMMENT ON TABLE plugin_registry IS 'Extensible content source registry for plugin architecture';
COMMENT ON COLUMN plugin_registry.capabilities IS 'JSONB object defining plugin capabilities: list, search, filter, fetch, transform';
