#!/bin/bash
# Manual cleanup script - moves files individually

DOCS="/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs"
ARCH="$DOCS/archive/2025-historical"

echo "Starting manual cleanup..."

# Create directories
mkdir -p "$ARCH/reports"
mkdir -p "$ARCH/implementation"
mkdir -p "$ARCH/database"
mkdir -p "$ARCH/research"
mkdir -p "$ARCH/testing"
mkdir -p "$ARCH/proposals"
mkdir -p "$ARCH/logs"
mkdir -p "$ARCH/old-archives"

# Move specific report files
echo "Moving reports..."
[ -f "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-15.md" ] && cp "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-15.md" "$ARCH/reports/" && rm "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-15.md" && echo "  ✓ Moved DOCUMENTATION_AUDIT_2025-11-15.md"
[ -f "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-12.md" ] && cp "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-12.md" "$ARCH/reports/" && rm "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-12.md" && echo "  ✓ Moved DOCUMENTATION_AUDIT_2025-11-12.md"
[ -f "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-11.md" ] && cp "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-11.md" "$ARCH/reports/" && rm "$DOCS/reports/DOCUMENTATION_AUDIT_2025-11-11.md" && echo "  ✓ Moved DOCUMENTATION_AUDIT_2025-11-11.md"

echo "Cleanup operations prepared. Run individual commands manually if needed."