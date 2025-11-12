#!/usr/bin/env node

/**
 * Run integration tests for the new API endpoints
 */

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

console.log('🧪 Running Integration Tests for RAG Metrics and Content Library APIs\n');

try {
  // Run the specific integration test files
  const command = `npx vitest run tests/integration/api/rag-metrics-api.test.ts tests/integration/api/content-library-api.test.ts --reporter=verbose`;

  console.log(`Executing: ${command}\n`);

  execSync(command, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
    }
  });

  console.log('\n✅ Integration tests completed successfully!');

  // Now run coverage report for integration tests
  console.log('\n📊 Generating coverage report...\n');

  const coverageCommand = `npx vitest run tests/integration --coverage`;

  execSync(coverageCommand, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
    }
  });

} catch (error) {
  console.error('\n❌ Integration tests failed!');
  console.error(error.message);
  process.exit(1);
}