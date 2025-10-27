#!/bin/bash
# Documentation Reorganization Script for MUED v2
# Date: 2025-10-27
# Purpose: Reorganize documentation structure for better clarity and maintainability

BASE_DIR="/Users/kimny/Dropbox/_DevProjects/mued/mued_v2"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "MUED v2 Documentation Reorganization"
echo "Timestamp: $TIMESTAMP"
echo "Base Directory: $BASE_DIR"
echo "================================================"
echo ""

# Function to check if file exists before moving
move_file() {
    local source="$1"
    local dest="$2"
    local desc="$3"

    if [ -f "$source" ]; then
        mv "$source" "$dest"
        echo -e "  ${GREEN}✓${NC} $desc"
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC} Not found: $(basename "$source")"
        return 1
    fi
}

# Step 1: Create directories
echo "Step 1: Creating archive and analysis directories..."
mkdir -p "$BASE_DIR/docs/archive/2025-10-19"
mkdir -p "$BASE_DIR/docs/archive/2025-10-27"
mkdir -p "$BASE_DIR/docs/analysis"
echo -e "  ${GREEN}✓${NC} Directories created"
echo ""

# Step 2: Archive old reports from October 2025-10-19
echo "Step 2: Archiving old analysis reports to /archive/2025-10-19/..."
move_file "$BASE_DIR/docs/COMPREHENSIVE_ANALYSIS_REPORT_2025-10-19.md" \
          "$BASE_DIR/docs/archive/2025-10-19/" \
          "COMPREHENSIVE_ANALYSIS_REPORT_2025-10-19.md"

move_file "$BASE_DIR/docs/COMPREHENSIVE_PROJECT_STATUS_REPORT_2025-10-18_VERIFIED.md" \
          "$BASE_DIR/docs/archive/2025-10-19/" \
          "COMPREHENSIVE_PROJECT_STATUS_REPORT_2025-10-18_VERIFIED.md"

move_file "$BASE_DIR/docs/DOCUMENTATION_AUDIT_REPORT_2025-10-19.md" \
          "$BASE_DIR/docs/archive/2025-10-19/" \
          "DOCUMENTATION_AUDIT_REPORT_2025-10-19.md"

move_file "$BASE_DIR/docs/DOCUMENTATION_AUDIT_2025-10-18.md" \
          "$BASE_DIR/docs/archive/2025-10-19/" \
          "DOCUMENTATION_AUDIT_2025-10-18.md"

move_file "$BASE_DIR/docs/CLEANUP_SUMMARY.md" \
          "$BASE_DIR/docs/archive/2025-10-19/" \
          "CLEANUP_SUMMARY.md"
echo ""

# Step 3: Move optimization reports to analysis folder
echo "Step 3: Moving analysis reports to /analysis/..."
move_file "$BASE_DIR/CODEBASE_OPTIMIZATION_ANALYSIS_2025.md" \
          "$BASE_DIR/docs/analysis/" \
          "CODEBASE_OPTIMIZATION_ANALYSIS_2025.md (from root)"

move_file "$BASE_DIR/CODEBASE_OPTIMIZATION_REPORT.md" \
          "$BASE_DIR/docs/analysis/" \
          "CODEBASE_OPTIMIZATION_REPORT.md (from root)"

move_file "$BASE_DIR/docs/IMPLEMENTATION_SUMMARY_2025-10-27.md" \
          "$BASE_DIR/docs/analysis/" \
          "IMPLEMENTATION_SUMMARY_2025-10-27.md"
echo ""

# Step 4: Archive duplicate analysis
echo "Step 4: Archiving duplicate files to /archive/2025-10-27/..."
move_file "$BASE_DIR/docs/COMPREHENSIVE_ANALYSIS_2025-10-27.md" \
          "$BASE_DIR/docs/archive/2025-10-27/" \
          "COMPREHENSIVE_ANALYSIS_2025-10-27.md (duplicate)"
echo ""

# Step 5: Verify important files remain
echo "Step 5: Verifying critical documents remain in place..."
CRITICAL_FILES=(
    "docs/README.md"
    "docs/IMPLEMENTATION_TRACKER.md"
    "docs/COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md"
    "docs/TEST_STRATEGY.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$BASE_DIR/$file" ]; then
        echo -e "  ${GREEN}✓${NC} $(basename "$file")"
    else
        echo -e "  ${RED}✗${NC} Missing: $(basename "$file")"
    fi
done
echo ""

# Step 6: Summary
echo "================================================"
echo "Reorganization Summary"
echo "================================================"
echo ""

# Count files in each location
ARCHIVE_19_COUNT=$(find "$BASE_DIR/docs/archive/2025-10-19" -name "*.md" 2>/dev/null | wc -l)
ARCHIVE_27_COUNT=$(find "$BASE_DIR/docs/archive/2025-10-27" -name "*.md" 2>/dev/null | wc -l)
ANALYSIS_COUNT=$(find "$BASE_DIR/docs/analysis" -name "*.md" 2>/dev/null | wc -l)
ROOT_DOCS_COUNT=$(find "$BASE_DIR/docs" -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)

echo "File Distribution:"
echo "  - Root /docs: $ROOT_DOCS_COUNT documents"
echo "  - /analysis: $ANALYSIS_COUNT documents"
echo "  - /archive/2025-10-19: $ARCHIVE_19_COUNT documents"
echo "  - /archive/2025-10-27: $ARCHIVE_27_COUNT documents"
echo ""

echo "New Structure:"
echo "  docs/"
echo "  ├── README.md (navigation guide)"
echo "  ├── IMPLEMENTATION_TRACKER.md (primary tracking)"
echo "  ├── COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md (latest analysis)"
echo "  ├── analysis/ (technical analyses)"
echo "  ├── architecture/ (system design)"
echo "  ├── business/ (business documents)"
echo "  ├── implementation/ (implementation guides)"
echo "  ├── testing/ (test documentation)"
echo "  └── archive/ (historical documents)"
echo ""

echo "================================================"
echo -e "${GREEN}✓ Reorganization Complete${NC}"
echo "================================================"
echo ""
echo "Next Steps:"
echo "  1. Review changes: git status"
echo "  2. Verify structure: tree docs/ -L 2"
echo "  3. Commit changes: git add . && git commit -m 'docs: reorganize documentation structure'"
echo ""