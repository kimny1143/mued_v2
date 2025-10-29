-- Migration: Add Foreign Key Constraints for Data Integrity
-- Phase 2: Referential integrity enforcement
-- Created: 2025-10-29

-- Foreign key constraints for ai_dialogue_log
-- ON DELETE CASCADE: When user is deleted, delete their dialogue logs
ALTER TABLE ai_dialogue_log
ADD CONSTRAINT IF NOT EXISTS fk_ai_dialogue_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Foreign key constraints for provenance
-- ON DELETE RESTRICT: Prevent deletion of content that has provenance tracking
ALTER TABLE provenance
ADD CONSTRAINT IF NOT EXISTS fk_provenance_content
FOREIGN KEY (content_id) REFERENCES materials(id) ON DELETE RESTRICT;

-- ON DELETE SET NULL: When user who acquired content is deleted, preserve provenance record
ALTER TABLE provenance
ADD CONSTRAINT IF NOT EXISTS fk_provenance_acquired_by
FOREIGN KEY (acquired_by) REFERENCES users(id) ON DELETE SET NULL;

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
      'fk_provenance_content',
      'fk_provenance_acquired_by'
    );

  IF fk_count = 3 THEN
    RAISE NOTICE 'Successfully created all 3 foreign key constraints';
  ELSE
    RAISE WARNING 'Only created % of 3 expected foreign key constraints', fk_count;
  END IF;
END $$;
