#!/bin/bash

# Script to install test dependencies for MUED v2 MVP
# Run this script to set up the complete testing infrastructure

echo "🚀 Setting up test dependencies for MUED v2 MVP..."

# Vitest and related packages
echo "📦 Installing Vitest and testing libraries..."
npm install -D vitest @vitest/ui @vitejs/plugin-react @vitest/coverage-v8

# Testing library packages
echo "📦 Installing Testing Library packages..."
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom

# Additional test utilities
echo "📦 Installing test utilities..."
npm install -D jsdom happy-dom vite-tsconfig-paths

# OpenAI SDK (for future implementation)
echo "📦 Installing OpenAI SDK..."
npm install openai

# MSW for API mocking (optional but recommended)
echo "📦 Installing MSW for API mocking..."
npm install -D msw

echo "✅ Test dependencies installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run 'npm run test:unit' to run unit tests"
echo "2. Run 'npm run test:integration' to run integration tests"
echo "3. Run 'npm run test:e2e' to run E2E tests with Playwright"
echo "4. Run 'npm run test:coverage' to generate coverage report"
echo ""
echo "🔧 MCP Integration:"
echo "- Tests can be executed from Claude Desktop using MCP"
echo "- Use 'npm test' to run all test suites"
echo ""
echo "📚 Documentation:"
echo "- See docs/testing/README.md for testing guidelines"
echo "- Test templates are in tests/unit and tests/integration"