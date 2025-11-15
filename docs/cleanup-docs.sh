#!/bin/bash

# Documentation Cleanup Script - 2025-11-15
# This script consolidates and cleans up the docs directory

set -e

DOCS_DIR="/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs"
ARCHIVE_DIR="$DOCS_DIR/archive/2025-historical"

echo "Starting documentation cleanup..."

# Step 1: Create consolidated archive structure
echo "Creating consolidated archive structure..."
mkdir -p "$ARCHIVE_DIR/reports"
mkdir -p "$ARCHIVE_DIR/implementation"
mkdir -p "$ARCHIVE_DIR/database"
mkdir -p "$ARCHIVE_DIR/research"
mkdir -p "$ARCHIVE_DIR/testing"
mkdir -p "$ARCHIVE_DIR/proposals"
mkdir -p "$ARCHIVE_DIR/logs"

# Step 2: Move old reports to archive
echo "Archiving old reports..."
if [ -d "$DOCS_DIR/reports" ]; then
  # Move reports older than Nov 15
  mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-12.md" "$ARCHIVE_DIR/reports/" 2>/dev/null || true
  mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-11.md" "$ARCHIVE_DIR/reports/" 2>/dev/null || true
  mv "$DOCS_DIR/reports/2025-11-07_"*.md "$ARCHIVE_DIR/reports/" 2>/dev/null || true
  mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_REPORT_2025-10-29.md" "$ARCHIVE_DIR/reports/" 2>/dev/null || true
  mv "$DOCS_DIR/reports/CODE_QUALITY_REPORT.md" "$ARCHIVE_DIR/reports/" 2>/dev/null || true
  mv "$DOCS_DIR/reports/phase2-completion-report.md" "$ARCHIVE_DIR/reports/" 2>/dev/null || true
fi

# Step 3: Move database migration history
echo "Archiving database migration history..."
if [ -d "$DOCS_DIR/database" ]; then
  mv "$DOCS_DIR/database/"*.md "$ARCHIVE_DIR/database/" 2>/dev/null || true
fi

# Step 4: Move old implementation docs
echo "Archiving old implementation docs..."
mv "$DOCS_DIR/implementation/mvp-implementation-plan.md" "$ARCHIVE_DIR/implementation/" 2>/dev/null || true
mv "$DOCS_DIR/implementation/mcp-test-request.md" "$ARCHIVE_DIR/implementation/" 2>/dev/null || true
mv "$DOCS_DIR/implementation/openai-function-calling-guide.md" "$ARCHIVE_DIR/implementation/" 2>/dev/null || true

# Step 5: Move outdated test reports
echo "Archiving outdated test reports..."
mv "$DOCS_DIR/testing/test-implementation-final-report.md" "$ARCHIVE_DIR/testing/" 2>/dev/null || true
mv "$DOCS_DIR/testing/COMPONENT_TEST_IMPLEMENTATION_REPORT.md" "$ARCHIVE_DIR/testing/" 2>/dev/null || true
mv "$DOCS_DIR/testing/TEST_INFRASTRUCTURE_SUMMARY.md" "$ARCHIVE_DIR/testing/" 2>/dev/null || true
mv "$DOCS_DIR/testing/TEST_EXECUTION_GUIDE.md" "$ARCHIVE_DIR/testing/" 2>/dev/null || true
mv "$DOCS_DIR/testing/TROUBLESHOOTING.md" "$ARCHIVE_DIR/testing/" 2>/dev/null || true
mv "$DOCS_DIR/testing/NEXT_STEPS.md" "$ARCHIVE_DIR/testing/" 2>/dev/null || true

# Step 6: Move proposals to archive
echo "Archiving proposals..."
if [ -d "$DOCS_DIR/proposals" ]; then
  mv "$DOCS_DIR/proposals/"*.md "$ARCHIVE_DIR/proposals/" 2>/dev/null || true
fi

# Step 7: Move logs to archive
echo "Archiving logs..."
if [ -d "$DOCS_DIR/logs" ]; then
  mv "$DOCS_DIR/logs" "$ARCHIVE_DIR/" 2>/dev/null || true
fi

# Step 8: Delete superseded documents
echo "Removing superseded documents..."
rm -f "$DOCS_DIR/architecture/mcp-feasibility-analysis.md" 2>/dev/null || true
rm -f "$DOCS_DIR/guides/with-auth-migration-guide.md" 2>/dev/null || true
rm -f "$DOCS_DIR/guides/ci-cd-github-secrets-required.md" 2>/dev/null || true
rm -f "$DOCS_DIR/deployment/github-actions-env-setup.md" 2>/dev/null || true
rm -f "$DOCS_DIR/deployment/sentry-setup.md" 2>/dev/null || true
rm -f "$DOCS_DIR/product/MIDI-LLM-User-Experience-Design.md" 2>/dev/null || true

# Step 9: Remove empty directories
echo "Cleaning up empty directories..."
find "$DOCS_DIR" -type d -empty -delete 2>/dev/null || true

# Step 10: Rename prompts directory
echo "Reorganizing prompts directory..."
if [ -d "$DOCS_DIR/prompt" ]; then
  mv "$DOCS_DIR/prompt" "$DOCS_DIR/prompts" 2>/dev/null || true
fi

# Step 11: Move old planning documents
echo "Moving old planning documents..."
mv "$DOCS_DIR/DOCUMENTATION_REORGANIZATION_PLAN_2025-11-15.md" "$ARCHIVE_DIR/" 2>/dev/null || true
mv "$DOCS_DIR/DIRECTORY_STRUCTURE_AFTER_REORG.md" "$ARCHIVE_DIR/" 2>/dev/null || true
mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-15.md" "$ARCHIVE_DIR/reports/" 2>/dev/null || true

echo "Documentation cleanup completed!"
echo ""
echo "Summary:"
echo "- Consolidated archives into: archive/2025-historical/"
echo "- Removed superseded documents"
echo "- Reorganized directory structure"
echo "- Cleaned up empty directories"
echo ""
echo "Next step: Update docs/README.md with the new structure"