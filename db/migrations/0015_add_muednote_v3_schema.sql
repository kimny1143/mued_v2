-- =============================================
-- MUEDnote v3 Schema Creation
-- =============================================
-- Purpose: Create dedicated schema and tables for MUEDnote v3 desktop application
-- Author: MUEDnote Team
-- Date: 2024-11-24
-- =============================================

-- Create separate schema for MUEDnote v3
CREATE SCHEMA IF NOT EXISTS muednote_v3;

-- Set search path to include new schema
SET search_path TO muednote_v3, public;

-- =============================================
-- ENUM Types
-- =============================================

-- Processing status for fragments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fragment_status' AND typnamespace = 'muednote_v3'::regnamespace) THEN
    CREATE TYPE muednote_v3.fragment_status AS ENUM (
      'pending',     -- Fragment saved but not processed
      'processing',  -- Currently being processed by AI
      'completed',   -- Successfully processed
      'failed',      -- Processing failed
      'archived'     -- Archived by user
    );
  END IF;
END $$;

-- Fragment importance level
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fragment_importance' AND typnamespace = 'muednote_v3'::regnamespace) THEN
    CREATE TYPE muednote_v3.fragment_importance AS ENUM (
      'low',
      'medium',
      'high',
      'critical'
    );
  END IF;
END $$;

-- =============================================
-- Core Tables
-- =============================================

-- Projects table (for organizing fragments)
CREATE TABLE IF NOT EXISTS muednote_v3.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color for UI
  icon VARCHAR(50), -- Icon identifier
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fragments table (core data structure)
CREATE TABLE IF NOT EXISTS muednote_v3.fragments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES muednote_v3.projects(id) ON DELETE SET NULL,

  -- Content
  content TEXT NOT NULL,
  processed_content TEXT, -- AI-enhanced version

  -- Metadata
  status muednote_v3.fragment_status DEFAULT 'pending',
  importance muednote_v3.fragment_importance DEFAULT 'medium',

  -- AI Analysis Results
  ai_summary TEXT,
  sentiment_score DECIMAL(3,2), -- -1.00 to 1.00
  emotions JSONB, -- { "joy": 0.8, "frustration": 0.2, etc }

  -- Technical Analysis (for music production context)
  technical_terms JSONB, -- Extracted technical terms
  key_concepts JSONB, -- Main concepts identified
  action_items JSONB, -- Extracted action items

  -- Timestamps
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tags table (for categorization)
CREATE TABLE IF NOT EXISTS muednote_v3.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7), -- Hex color
  description TEXT,
  usage_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false, -- System-generated vs user-created
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure unique tag names per user
  UNIQUE(user_id, name)
);

-- Fragment-Tags junction table (many-to-many)
CREATE TABLE IF NOT EXISTS muednote_v3.fragment_tags (
  fragment_id UUID NOT NULL REFERENCES muednote_v3.fragments(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES muednote_v3.tags(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) DEFAULT 1.00, -- AI confidence for auto-tagged items
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (fragment_id, tag_id)
);

-- Fragment processing history (audit trail)
CREATE TABLE IF NOT EXISTS muednote_v3.fragment_processing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fragment_id UUID NOT NULL REFERENCES muednote_v3.fragments(id) ON DELETE CASCADE,
  processing_type VARCHAR(50) NOT NULL, -- 'summary', 'sentiment', 'tags', etc
  model_used VARCHAR(100), -- AI model identifier
  processing_time_ms INTEGER, -- Processing duration
  tokens_used INTEGER, -- Token count for cost tracking
  success BOOLEAN NOT NULL,
  error_message TEXT,
  result JSONB, -- Processing results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fragment relationships (for linking related fragments)
CREATE TABLE IF NOT EXISTS muednote_v3.fragment_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_fragment_id UUID NOT NULL REFERENCES muednote_v3.fragments(id) ON DELETE CASCADE,
  target_fragment_id UUID NOT NULL REFERENCES muednote_v3.fragments(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'references', 'continues', 'contradicts', etc
  confidence DECIMAL(3,2) DEFAULT 1.00,
  is_auto_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Prevent duplicate relationships
  UNIQUE(source_fragment_id, target_fragment_id, relationship_type),
  -- Prevent self-reference
  CHECK (source_fragment_id != target_fragment_id)
);

-- User preferences for MUEDnote
CREATE TABLE IF NOT EXISTS muednote_v3.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,

  -- Processing preferences
  auto_process_fragments BOOLEAN DEFAULT true,
  auto_tag_fragments BOOLEAN DEFAULT true,
  auto_summarize BOOLEAN DEFAULT true,

  -- UI preferences
  theme VARCHAR(20) DEFAULT 'dark',
  default_view VARCHAR(20) DEFAULT 'timeline',
  fragments_per_page INTEGER DEFAULT 20,

  -- Hotkey customization
  hotkeys JSONB DEFAULT '{}',

  -- Notification preferences
  notify_on_processing_complete BOOLEAN DEFAULT true,
  notify_on_error BOOLEAN DEFAULT true,

  -- Data retention
  auto_archive_after_days INTEGER DEFAULT 30,
  auto_delete_after_days INTEGER DEFAULT 365,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Fragments indexes
CREATE INDEX IF NOT EXISTS idx_fragments_user_id ON muednote_v3.fragments(user_id);
CREATE INDEX IF NOT EXISTS idx_fragments_project_id ON muednote_v3.fragments(project_id);
CREATE INDEX IF NOT EXISTS idx_fragments_status ON muednote_v3.fragments(status);
CREATE INDEX IF NOT EXISTS idx_fragments_captured_at ON muednote_v3.fragments(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_fragments_user_captured ON muednote_v3.fragments(user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_fragments_user_status ON muednote_v3.fragments(user_id, status);

-- GIN index for JSONB columns (for efficient JSON queries)
CREATE INDEX IF NOT EXISTS idx_fragments_emotions_gin ON muednote_v3.fragments USING GIN (emotions);
CREATE INDEX IF NOT EXISTS idx_fragments_technical_terms_gin ON muednote_v3.fragments USING GIN (technical_terms);
CREATE INDEX IF NOT EXISTS idx_fragments_key_concepts_gin ON muednote_v3.fragments USING GIN (key_concepts);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_fragments_content_fts ON muednote_v3.fragments USING GIN (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_fragments_processed_content_fts ON muednote_v3.fragments USING GIN (to_tsvector('english', processed_content));

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON muednote_v3.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_active ON muednote_v3.projects(user_id, is_active);

-- Tags indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON muednote_v3.tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON muednote_v3.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON muednote_v3.tags(usage_count DESC);

-- Fragment tags indexes
CREATE INDEX IF NOT EXISTS idx_fragment_tags_fragment_id ON muednote_v3.fragment_tags(fragment_id);
CREATE INDEX IF NOT EXISTS idx_fragment_tags_tag_id ON muednote_v3.fragment_tags(tag_id);

-- Processing history indexes
CREATE INDEX IF NOT EXISTS idx_processing_history_fragment_id ON muednote_v3.fragment_processing_history(fragment_id);
CREATE INDEX IF NOT EXISTS idx_processing_history_created_at ON muednote_v3.fragment_processing_history(created_at DESC);

-- Fragment relationships indexes
CREATE INDEX IF NOT EXISTS idx_fragment_relationships_source ON muednote_v3.fragment_relationships(source_fragment_id);
CREATE INDEX IF NOT EXISTS idx_fragment_relationships_target ON muednote_v3.fragment_relationships(target_fragment_id);

-- =============================================
-- Triggers for Updated Timestamps
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION muednote_v3.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'projects',
      'fragments',
      'tags',
      'user_preferences'
    ])
  LOOP
    EXECUTE format('
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON muednote_v3.%s
        FOR EACH ROW EXECUTE FUNCTION muednote_v3.update_updated_at_column();
    ', table_name, table_name);
  END LOOP;
END $$;

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE muednote_v3.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE muednote_v3.fragments ENABLE ROW LEVEL SECURITY;
ALTER TABLE muednote_v3.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE muednote_v3.fragment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE muednote_v3.fragment_processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE muednote_v3.fragment_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE muednote_v3.user_preferences ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY projects_owner_policy ON muednote_v3.projects
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Fragments policies
CREATE POLICY fragments_owner_policy ON muednote_v3.fragments
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Tags policies
CREATE POLICY tags_owner_policy ON muednote_v3.tags
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- Fragment tags policies (access through fragment ownership)
CREATE POLICY fragment_tags_owner_policy ON muednote_v3.fragment_tags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM muednote_v3.fragments f
      WHERE f.id = fragment_tags.fragment_id
        AND f.user_id = current_setting('app.current_user_id')::UUID
    )
  );

-- Processing history policies (access through fragment ownership)
CREATE POLICY processing_history_owner_policy ON muednote_v3.fragment_processing_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM muednote_v3.fragments f
      WHERE f.id = fragment_processing_history.fragment_id
        AND f.user_id = current_setting('app.current_user_id')::UUID
    )
  );

-- Fragment relationships policies (access through fragment ownership)
CREATE POLICY fragment_relationships_owner_policy ON muednote_v3.fragment_relationships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM muednote_v3.fragments f
      WHERE (f.id = fragment_relationships.source_fragment_id OR f.id = fragment_relationships.target_fragment_id)
        AND f.user_id = current_setting('app.current_user_id')::UUID
    )
  );

-- User preferences policies
CREATE POLICY user_preferences_owner_policy ON muednote_v3.user_preferences
  FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- =============================================
-- Comments for Documentation
-- =============================================

COMMENT ON SCHEMA muednote_v3 IS 'MUEDnote v3 desktop application schema for cognitive offloading';
COMMENT ON TABLE muednote_v3.fragments IS 'Core table storing user fragments (thoughts, ideas, notes) for cognitive offloading';
COMMENT ON TABLE muednote_v3.projects IS 'Projects for organizing fragments';
COMMENT ON TABLE muednote_v3.tags IS 'User and system-generated tags for categorizing fragments';
COMMENT ON TABLE muednote_v3.fragment_tags IS 'Many-to-many relationship between fragments and tags';
COMMENT ON TABLE muednote_v3.fragment_processing_history IS 'Audit trail of AI processing operations on fragments';
COMMENT ON TABLE muednote_v3.fragment_relationships IS 'Relationships between related fragments';
COMMENT ON TABLE muednote_v3.user_preferences IS 'User preferences and settings for MUEDnote v3';

-- Reset search path
RESET search_path;