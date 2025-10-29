-- Migration: Add Foreign Key Constraints for Data Integrity (FIXED)
-- Phase 2: Referential integrity enforcement
-- Created: 2025-10-29
-- Fixed: Removed polymorphic content_id constraint

-- Foreign key constraints for ai_dialogue_log
-- ON DELETE CASCADE: When user is deleted, delete their dialogue logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_ai_dialogue_user'
  ) THEN
    ALTER TABLE ai_dialogue_log
    ADD CONSTRAINT fk_ai_dialogue_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Foreign key constraints for provenance
-- NOTE: content_id is polymorphic (can reference materials, ai_dialogue_log, etc.)
-- Therefore, we do NOT add a foreign key constraint for content_id
-- Application-level validation is used instead

-- ON DELETE SET NULL: When user who acquired content is deleted, preserve provenance record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_provenance_acquired_by'
  ) THEN
    ALTER TABLE provenance
    ADD CONSTRAINT fk_provenance_acquired_by
    FOREIGN KEY (acquired_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Verify foreign keys were created successfully
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_name IN (
      'fk_ai_dialogue_user',
      'fk_provenance_acquired_by'
    );

  IF fk_count = 2 THEN
    RAISE NOTICE 'Successfully created all 2 foreign key constraints';
  ELSE
    RAISE WARNING 'Only created % of 2 expected foreign key constraints', fk_count;
  END IF;
END $$;

-- Add comments explaining the polymorphic design
COMMENT ON COLUMN provenance.content_id IS 'Polymorphic reference: can reference materials.id, ai_dialogue_log.id, etc. based on content_type. Validated at application level.';
COMMENT ON COLUMN provenance.content_type IS 'Determines which table content_id references: material->materials, ai_response->ai_dialogue_log, etc.';
