#!/bin/bash

# Documentation Cleanup Execution Script - 2025-11-15
# This script performs the actual file operations for cleanup

set -e

DOCS_DIR="/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs"
ARCHIVE_DIR="$DOCS_DIR/archive/2025-historical"

echo "========================================="
echo "Documentation Cleanup - 2025-11-15"
echo "========================================="
echo ""

# Create consolidated archive structure
echo "Step 1: Creating consolidated archive structure..."
mkdir -p "$ARCHIVE_DIR/reports"
mkdir -p "$ARCHIVE_DIR/implementation"
mkdir -p "$ARCHIVE_DIR/database"
mkdir -p "$ARCHIVE_DIR/research"
mkdir -p "$ARCHIVE_DIR/testing"
mkdir -p "$ARCHIVE_DIR/proposals"
mkdir -p "$ARCHIVE_DIR/logs"
mkdir -p "$ARCHIVE_DIR/old-archives"

# Archive old reports
echo "Step 2: Archiving old reports..."
[ -f "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-15.md" ] && mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-15.md" "$ARCHIVE_DIR/reports/"
[ -f "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-12.md" ] && mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-12.md" "$ARCHIVE_DIR/reports/"
[ -f "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-11.md" ] && mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_2025-11-11.md" "$ARCHIVE_DIR/reports/"
[ -f "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_REPORT_2025-10-29.md" ] && mv "$DOCS_DIR/reports/DOCUMENTATION_AUDIT_REPORT_2025-10-29.md" "$ARCHIVE_DIR/reports/"
[ -f "$DOCS_DIR/reports/CODE_QUALITY_REPORT.md" ] && mv "$DOCS_DIR/reports/CODE_QUALITY_REPORT.md" "$ARCHIVE_DIR/reports/"
[ -f "$DOCS_DIR/reports/phase2-completion-report.md" ] && mv "$DOCS_DIR/reports/phase2-completion-report.md" "$ARCHIVE_DIR/reports/"

# Move Nov 7 reports (except current-progress which is still relevant)
for file in "$DOCS_DIR/reports/2025-11-07_"*.md; do
  if [ -f "$file" ] && [[ "$file" != *"current-progress"* ]]; then
    mv "$file" "$ARCHIVE_DIR/reports/"
  fi
done

# Archive database migration docs
echo "Step 3: Archiving database documentation..."
[ -d "$DOCS_DIR/database" ] && mv "$DOCS_DIR/database" "$ARCHIVE_DIR/"

# Archive old implementation docs
echo "Step 4: Archiving old implementation docs..."
[ -f "$DOCS_DIR/implementation/mvp-implementation-plan.md" ] && mv "$DOCS_DIR/implementation/mvp-implementation-plan.md" "$ARCHIVE_DIR/implementation/"
[ -f "$DOCS_DIR/implementation/mcp-test-request.md" ] && mv "$DOCS_DIR/implementation/mcp-test-request.md" "$ARCHIVE_DIR/implementation/"
[ -f "$DOCS_DIR/implementation/openai-function-calling-guide.md" ] && mv "$DOCS_DIR/implementation/openai-function-calling-guide.md" "$ARCHIVE_DIR/implementation/"

# Archive outdated test reports
echo "Step 5: Archiving outdated test reports..."
[ -f "$DOCS_DIR/testing/test-implementation-final-report.md" ] && mv "$DOCS_DIR/testing/test-implementation-final-report.md" "$ARCHIVE_DIR/testing/"
[ -f "$DOCS_DIR/testing/COMPONENT_TEST_IMPLEMENTATION_REPORT.md" ] && mv "$DOCS_DIR/testing/COMPONENT_TEST_IMPLEMENTATION_REPORT.md" "$ARCHIVE_DIR/testing/"
[ -f "$DOCS_DIR/testing/TEST_INFRASTRUCTURE_SUMMARY.md" ] && mv "$DOCS_DIR/testing/TEST_INFRASTRUCTURE_SUMMARY.md" "$ARCHIVE_DIR/testing/"
[ -f "$DOCS_DIR/testing/TEST_EXECUTION_GUIDE.md" ] && mv "$DOCS_DIR/testing/TEST_EXECUTION_GUIDE.md" "$ARCHIVE_DIR/testing/"
[ -f "$DOCS_DIR/testing/TROUBLESHOOTING.md" ] && mv "$DOCS_DIR/testing/TROUBLESHOOTING.md" "$ARCHIVE_DIR/testing/"
[ -f "$DOCS_DIR/testing/NEXT_STEPS.md" ] && mv "$DOCS_DIR/testing/NEXT_STEPS.md" "$ARCHIVE_DIR/testing/"

# Archive proposals
echo "Step 6: Archiving proposals..."
[ -d "$DOCS_DIR/proposals" ] && mv "$DOCS_DIR/proposals" "$ARCHIVE_DIR/"

# Archive logs
echo "Step 7: Archiving logs..."
[ -d "$DOCS_DIR/logs" ] && mv "$DOCS_DIR/logs" "$ARCHIVE_DIR/"

# Archive old research (keep only active ones)
echo "Step 8: Archiving completed research..."
[ -f "$DOCS_DIR/research/ai-mentor-matching-research.md" ] && mv "$DOCS_DIR/research/ai-mentor-matching-research.md" "$ARCHIVE_DIR/research/"
[ -f "$DOCS_DIR/research/MIDI-LLM-MUED-Integration-Report.md" ] && mv "$DOCS_DIR/research/MIDI-LLM-MUED-Integration-Report.md" "$ARCHIVE_DIR/research/"
[ -f "$DOCS_DIR/research/gemini-music-generation-research.md" ] && mv "$DOCS_DIR/research/gemini-music-generation-research.md" "$ARCHIVE_DIR/research/"
[ -f "$DOCS_DIR/research/midi-analysis-367947X.md" ] && mv "$DOCS_DIR/research/midi-analysis-367947X.md" "$ARCHIVE_DIR/research/"
[ -f "$DOCS_DIR/research/midi-llm-debug-output.md" ] && mv "$DOCS_DIR/research/midi-llm-debug-output.md" "$ARCHIVE_DIR/research/"
[ -f "$DOCS_DIR/research/midi-llm-issue2-response.md" ] && mv "$DOCS_DIR/research/midi-llm-issue2-response.md" "$ARCHIVE_DIR/research/"
[ -d "$DOCS_DIR/research/claude-test-materials" ] && mv "$DOCS_DIR/research/claude-test-materials" "$ARCHIVE_DIR/research/"

# Delete superseded documents
echo "Step 9: Removing superseded documents..."
[ -f "$DOCS_DIR/architecture/mcp-feasibility-analysis.md" ] && rm "$DOCS_DIR/architecture/mcp-feasibility-analysis.md"
[ -f "$DOCS_DIR/guides/with-auth-migration-guide.md" ] && rm "$DOCS_DIR/guides/with-auth-migration-guide.md"
[ -f "$DOCS_DIR/guides/ci-cd-github-secrets-required.md" ] && rm "$DOCS_DIR/guides/ci-cd-github-secrets-required.md"
[ -f "$DOCS_DIR/deployment/github-actions-env-setup.md" ] && rm "$DOCS_DIR/deployment/github-actions-env-setup.md"
[ -f "$DOCS_DIR/deployment/sentry-setup.md" ] && rm "$DOCS_DIR/deployment/sentry-setup.md"
[ -d "$DOCS_DIR/product" ] && rm -rf "$DOCS_DIR/product"

# Move old planning docs
echo "Step 10: Archiving planning documents..."
[ -f "$DOCS_DIR/DOCUMENTATION_REORGANIZATION_PLAN_2025-11-15.md" ] && mv "$DOCS_DIR/DOCUMENTATION_REORGANIZATION_PLAN_2025-11-15.md" "$ARCHIVE_DIR/"
[ -f "$DOCS_DIR/DIRECTORY_STRUCTURE_AFTER_REORG.md" ] && mv "$DOCS_DIR/DIRECTORY_STRUCTURE_AFTER_REORG.md" "$ARCHIVE_DIR/"

# Rename directories
echo "Step 11: Reorganizing directories..."
[ -d "$DOCS_DIR/prompt" ] && mv "$DOCS_DIR/prompt" "$DOCS_DIR/prompts"

# Move all old archive folders into consolidated archive
echo "Step 12: Consolidating old archives..."
for dir in "$DOCS_DIR/archive/2025-"*; do
  if [ -d "$dir" ] && [ "$dir" != "$ARCHIVE_DIR" ]; then
    basename=$(basename "$dir")
    mv "$dir" "$ARCHIVE_DIR/old-archives/$basename"
  fi
done

# Clean up reports directory if empty
echo "Step 13: Cleaning up empty directories..."
[ -d "$DOCS_DIR/reports" ] && [ -z "$(ls -A "$DOCS_DIR/reports")" ] && rmdir "$DOCS_DIR/reports"

echo ""
echo "========================================="
echo "Cleanup Completed Successfully!"
echo "========================================="
echo ""
echo "Files archived: $(find "$ARCHIVE_DIR" -type f -name "*.md" | wc -l)"
echo "Current docs: $(find "$DOCS_DIR" -maxdepth 3 -name "*.md" -not -path "*/archive/*" | wc -l)"
echo ""
echo "Next steps:"
echo "1. Review the new structure"
echo "2. Update docs/README.md"
echo "3. Commit changes"