-- GIN Indexes for JSONB columns
-- Created: 2025-10-27
-- Purpose: Add GIN indexes for tag-based and weak-spots queries
-- Note: Non-concurrent version for pre-production deployment

-- 1. Enable fast tag-based material search
CREATE INDEX IF NOT EXISTS idx_materials_tags_gin
ON materials USING gin(tags);

-- 2. Accelerate weak spots analysis
CREATE INDEX IF NOT EXISTS idx_learning_metrics_weak_spots_gin
ON learning_metrics USING gin(weak_spots);
