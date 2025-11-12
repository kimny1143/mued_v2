#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🧪 Running Integration Tests..."

# Change to repository root (portable across environments)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Run the integration tests
npx vitest run tests/integration/api/rag-metrics-api.test.ts tests/integration/api/content-library-api.test.ts --reporter=verbose 2>&1

echo ""
echo "📊 Test run completed!"