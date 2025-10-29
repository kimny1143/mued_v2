#!/bin/bash

# Test Coverage Report Script
# Runs all tests and generates comprehensive coverage report

echo "========================================="
echo "MUED V2 - Phase 1&2 Test Coverage Report"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results directory
RESULTS_DIR="test-results"
mkdir -p $RESULTS_DIR

# Function to run tests and capture results
run_test_suite() {
  local suite_name=$1
  local command=$2

  echo -e "${BLUE}Running $suite_name...${NC}"

  if eval "$command" > "$RESULTS_DIR/$suite_name.log" 2>&1; then
    echo -e "${GREEN}✓ $suite_name passed${NC}"
    return 0
  else
    echo -e "${RED}✗ $suite_name failed${NC}"
    echo "  Check $RESULTS_DIR/$suite_name.log for details"
    return 1
  fi
}

# Track overall status
TESTS_PASSED=0
TESTS_FAILED=0

echo "1. Running Unit Tests"
echo "---------------------"

# Run unit tests with coverage
if run_test_suite "unit-tests" "npm run test:unit -- --coverage"; then
  ((TESTS_PASSED++))
else
  ((TESTS_FAILED++))
fi

echo ""
echo "2. Running Integration Tests"
echo "----------------------------"

# Run integration tests
if run_test_suite "integration-tests" "npm run test:integration"; then
  ((TESTS_PASSED++))
else
  ((TESTS_FAILED++))
fi

echo ""
echo "3. Running Component Tests"
echo "--------------------------"

# Run component tests
if run_test_suite "component-tests" "npm run test:components"; then
  ((TESTS_PASSED++))
else
  ((TESTS_FAILED++))
fi

echo ""
echo "4. Generating Coverage Report"
echo "-----------------------------"

# Generate comprehensive coverage report
echo -e "${BLUE}Generating coverage report...${NC}"
npm run test:coverage > "$RESULTS_DIR/coverage-summary.log" 2>&1

# Extract coverage summary
if [ -f "coverage/coverage-summary.json" ]; then
  echo -e "${GREEN}✓ Coverage report generated${NC}"

  # Parse and display coverage summary
  echo ""
  echo "Coverage Summary:"
  echo "-----------------"

  # Use node to parse JSON and display results
  node -e "
    const fs = require('fs');
    const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
    const total = coverage.total;

    console.log('Lines:      ' + total.lines.pct + '%');
    console.log('Statements: ' + total.statements.pct + '%');
    console.log('Functions:  ' + total.functions.pct + '%');
    console.log('Branches:   ' + total.branches.pct + '%');

    // Check if meets thresholds
    const meetsThreshold =
      total.lines.pct >= 70 &&
      total.statements.pct >= 70 &&
      total.functions.pct >= 70 &&
      total.branches.pct >= 70;

    if (meetsThreshold) {
      console.log('\\n✓ Coverage meets minimum thresholds (70%)');
    } else {
      console.log('\\n✗ Coverage below minimum thresholds (70%)');
      process.exit(1);
    }
  "

  if [ $? -eq 0 ]; then
    ((TESTS_PASSED++))
  else
    ((TESTS_FAILED++))
  fi
else
  echo -e "${RED}✗ Failed to generate coverage report${NC}"
  ((TESTS_FAILED++))
fi

echo ""
echo "5. Phase 1&2 Specific Coverage"
echo "-------------------------------"

# Check coverage for specific Phase 1&2 files
echo "Checking coverage for critical files:"

CRITICAL_FILES=(
  "lib/content/content-validator.ts"
  "lib/plugins/note/note-content-adapter.ts"
  "lib/plugins/plugin-registry.ts"
  "app/api/content/route.ts"
  "app/api/materials/share-to-library/route.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "coverage/lcov.info" ]; then
    # Extract coverage for specific file
    coverage=$(grep -A 3 "SF:.*$file" coverage/lcov.info 2>/dev/null | grep "^LF:" | cut -d: -f2)
    covered=$(grep -A 3 "SF:.*$file" coverage/lcov.info 2>/dev/null | grep "^LH:" | cut -d: -f2)

    if [ -n "$coverage" ] && [ -n "$covered" ] && [ "$coverage" -gt 0 ]; then
      percentage=$((covered * 100 / coverage))
      if [ $percentage -ge 80 ]; then
        echo -e "  ${GREEN}✓ $file: ${percentage}%${NC}"
      else
        echo -e "  ${YELLOW}⚠ $file: ${percentage}%${NC}"
      fi
    else
      echo -e "  ${YELLOW}? $file: No coverage data${NC}"
    fi
  fi
done

echo ""
echo "6. E2E Tests (Optional)"
echo "-----------------------"
echo "To run E2E tests, use: npm run test:e2e"
echo "Note: E2E tests require a running development server"

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All test suites passed!${NC}"
  echo ""
  echo "Coverage report available at:"
  echo "  - HTML: coverage/index.html"
  echo "  - JSON: coverage/coverage-summary.json"
  echo "  - LCOV: coverage/lcov.info"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed. Please review the logs.${NC}"
  exit 1
fi