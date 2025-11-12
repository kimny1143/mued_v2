#!/bin/bash

echo "🧪 Running Integration Tests..."
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2

# Run the integration tests
npx vitest run tests/integration/api/rag-metrics-api.test.ts tests/integration/api/content-library-api.test.ts --reporter=verbose 2>&1

echo ""
echo "📊 Test run completed!"