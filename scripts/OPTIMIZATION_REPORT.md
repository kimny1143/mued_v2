# Codebase Optimization Report: Scripts and MCP Servers

**Generated:** 2025-11-26
**Scope:** `/scripts/` directory including MCP servers
**Total Files Analyzed:** 56 scripts + 6 MCP servers

## Executive Summary

The scripts directory shows evidence of previous consolidation efforts (25 to 8 core scripts as per README.md), but significant redundancy remains. Analysis identified **14 issues** across the following categories:

- **HIGH Priority:** 4 issues (MCP server duplication, reinvented utilities)
- **MEDIUM Priority:** 6 issues (duplicate check scripts, redundant patterns)
- **LOW Priority:** 4 issues (cleanup opportunities, minor improvements)

**Estimated Impact:**
- Lines of code that can be removed: ~800-1000
- Files that can be consolidated or deleted: 12-15
- MCP server code reduction: ~40% through shared utilities

---

## Critical Issues (HIGH Priority)

### Issue 1: Duplicated MCP Server Boilerplate and Utilities

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-unit-test.js` (Lines 1-86)
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-playwright-e2e.js` (Lines 1-103)
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-playwright-screenshot.js` (Lines 1-24)
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-browser-debug.js` (Lines 1-102)

**Problem:** Each MCP server reimplements:
1. Identical `getTimestamp()` function
2. Identical `ensureReportsDir()` function
3. Identical dotenv suppression logic (stderr/stdout manipulation)
4. Similar server initialization boilerplate
5. Similar markdown report generation patterns

**Current Implementation (duplicated across 4 files):**
```javascript
// Duplicated in 4 files
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

async function ensureReportsDir() {
  const reportsDir = path.join(PROJECT_ROOT, 'tests', 'reports');
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create reports directory: ${error.message}`);
  }
  return reportsDir;
}

// Duplicated dotenv suppression in 3 files
const originalStderrWrite = process.stderr.write;
const originalStdoutWrite = process.stdout.write;
process.stderr.write = () => {};
process.stdout.write = (chunk, encoding, callback) => {
  if (typeof chunk === 'string' && chunk.startsWith('{"jsonrpc":')) {
    return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
  }
  return true;
};
require("dotenv").config({ path: path.join(PROJECT_ROOT, '.env.test') });
process.stderr.write = originalStderrWrite;
process.stdout.write = originalStdoutWrite;
```

**Impact:**
- Maintenance burden: bug fixes must be applied to 4+ files
- Code bloat: ~150 lines of duplicated code
- Inconsistent behavior risk

**Recommended Solution:**
```javascript
// scripts/mcp/lib/mcp-utils.js
const fs = require("fs").promises;
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

async function ensureReportsDir(subdir = '') {
  const reportsDir = path.join(PROJECT_ROOT, 'tests', 'reports', subdir);
  await fs.mkdir(reportsDir, { recursive: true });
  return reportsDir;
}

function suppressDotenvOutput(envPath) {
  const originalStderrWrite = process.stderr.write;
  const originalStdoutWrite = process.stdout.write;

  process.stderr.write = () => {};
  process.stdout.write = (chunk, encoding, callback) => {
    if (typeof chunk === 'string' && chunk.startsWith('{"jsonrpc":')) {
      return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
    }
    return true;
  };

  require("dotenv").config({ path: envPath });

  process.stderr.write = originalStderrWrite;
  process.stdout.write = originalStdoutWrite;
}

function createMcpServer(name, version = "1.0.0") {
  const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
  return new McpServer({ name, version });
}

async function startMcpServer(server) {
  const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`MCP Server started: ${server.name}`);
}

module.exports = {
  PROJECT_ROOT,
  getTimestamp,
  ensureReportsDir,
  suppressDotenvOutput,
  createMcpServer,
  startMcpServer,
};
```

**Implementation Steps:**
1. Create `/scripts/mcp/lib/mcp-utils.js` with shared utilities
2. Refactor each MCP server to use the shared module
3. Run MCP server tests to verify functionality
4. Update CLAUDE.md MCP documentation

---

### Issue 2: Reinvented .env Parsing in mued-material-generator-claude.js

**Location:** `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-material-generator-claude.js` (Lines 22-52)

**Problem:** Hand-rolled .env file parser instead of using established library with safe output handling.

**Current Implementation:**
```javascript
// Manual .env.local parsing to avoid dotenv console output
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}
```

**Impact:**
- Security: Does not handle edge cases (escaped quotes, multiline values)
- Maintenance: Reimplements standard functionality
- Bug risk: May parse values incorrectly

**Recommended Solution:**
Use the same `suppressDotenvOutput()` pattern from Issue 1, or use `dotenv-safe`:

```javascript
// Use the shared utility
const { suppressDotenvOutput, PROJECT_ROOT } = require('./lib/mcp-utils');
suppressDotenvOutput(path.join(PROJECT_ROOT, '.env.local'));
```

**Implementation Steps:**
1. After creating mcp-utils.js, update mued-material-generator-claude.js
2. Remove manual parsing code (Lines 22-52)
3. Test that ANTHROPIC_API_KEY is correctly loaded

---

### Issue 3: Duplicate Database Check Scripts

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-tables.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/test-db-connection.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/archive/check-tables.mjs`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/db-utilities.ts` (verify command)

**Problem:** Four scripts that all check database tables, each with slightly different implementations:
- `check-tables.ts`: Uses Drizzle ORM
- `test-db-connection.ts`: Uses raw @neondatabase/serverless Pool
- `check-tables.mjs` (archived): Uses raw Pool with different pattern
- `db-utilities.ts verify`: Uses Drizzle ORM

**Impact:**
- Confusion about which script to use
- Inconsistent database connection patterns
- Archived file still present despite README claiming consolidation

**Recommended Solution:**
```typescript
// scripts/db-utilities.ts - Add 'check-tables' as alias for 'verify'
// and add connection-test functionality

// Command: test-connection - Quick connectivity test
async function testConnection() {
  console.log('\n Testing database connection...\n');

  if (!process.env.DATABASE_URL) {
    logError('DATABASE_URL is not set');
    process.exit(1);
  }

  try {
    const result = await db.execute(sql`
      SELECT NOW() as now, current_database() as db
    `);
    logSuccess(`Connected to ${result.rows[0].db}`);
    logInfo(`Server time: ${result.rows[0].now}`);
  } catch (error) {
    logError(`Connection failed: ${error}`);
    process.exit(1);
  }
}

// Update command router
switch (command) {
  case 'test-connection':
    await testConnection();
    break;
  case 'check-tables':
  case 'verify':  // Both commands do the same thing
    await verifyTables();
    break;
  // ...
}
```

**Implementation Steps:**
1. Merge `test-db-connection.ts` functionality into `db-utilities.ts`
2. Delete `check-tables.ts` (use `db-utilities.ts verify` instead)
3. Delete archived `check-tables.mjs`
4. Update package.json scripts

---

### Issue 4: Duplicate Test Runner Scripts

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/test-runner.sh`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/run-integration-tests.js`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/test-coverage.sh`

**Problem:** Three scripts doing similar integration test running:
- `test-runner.sh`: Shell script running integration tests
- `run-integration-tests.js`: Node script running the same tests plus coverage
- `test-coverage.sh`: Comprehensive coverage script

The `test-runner.sh` and `run-integration-tests.js` are nearly identical in purpose.

**Current Implementation (test-runner.sh):**
```bash
npx vitest run tests/integration/api/rag-metrics-api.test.ts tests/integration/api/content-library-api.test.ts --reporter=verbose
```

**Current Implementation (run-integration-tests.js):**
```javascript
const command = `npx vitest run tests/integration/api/rag-metrics-api.test.ts tests/integration/api/content-library-api.test.ts --reporter=verbose`;
execSync(command, {...});
```

**Impact:**
- Redundant files
- Confusion about which to use
- Maintenance of two scripts for same purpose

**Recommended Solution:**
Consolidate into `test-coverage.sh` which already has comprehensive functionality:

```bash
# Add to test-coverage.sh
case "$1" in
  integration)
    run_test_suite "integration-tests" "npm run test:integration"
    ;;
  all|"")
    # Current full coverage behavior
    ;;
esac
```

**Implementation Steps:**
1. Add integration-only option to `test-coverage.sh`
2. Delete `test-runner.sh`
3. Delete `run-integration-tests.js`
4. Update package.json scripts

---

## Medium Priority Issues

### Issue 5: Multiple Material/User Check Scripts with Overlapping Functionality

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-user.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-user-quota.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-materials.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-material-access.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-material-content.ts`

**Problem:** Five separate scripts for checking user and material data, when these could be commands in a single CLI tool.

**Impact:**
- 5 scripts where 1 would suffice
- Duplicate database connection setup
- Inconsistent output formatting

**Recommended Solution:**
Create `scripts/check-data.ts` with subcommands:

```typescript
#!/usr/bin/env tsx

import { config } from 'dotenv';
import { db } from '../db';
import { users, materials, subscriptions } from '../db/schema';

config({ path: '.env.local' });

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  switch (command) {
    case 'user':
      await checkUser(arg); // email as arg
      break;
    case 'user-quota':
      await checkUserQuota();
      break;
    case 'materials':
      await checkMaterials();
      break;
    case 'material-access':
      await checkMaterialAccess();
      break;
    case 'material-content':
      await checkMaterialContent(arg); // id as arg
      break;
    default:
      console.log('Usage: tsx check-data.ts <command> [args]');
      console.log('Commands: user <email>, user-quota, materials, material-access, material-content <id>');
  }
}
```

**Implementation Steps:**
1. Create `check-data.ts` with merged functionality
2. Delete the 5 individual check scripts
3. Update any references in package.json or documentation

---

### Issue 6: Redundant Playwright Test Result Parsing

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-unit-test.js` (Lines 39-86, 89-136)
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-playwright-e2e.js` (Lines 54-103)

**Problem:** Similar but different parsing functions for test results:
- `parseVitestOutput()` for unit tests
- `parseCoverageOutput()` for coverage
- `parsePlaywrightResults()` for E2E

These could be unified with a configurable parser.

**Current Implementation:**
```javascript
// parseVitestOutput (mued-unit-test.js)
function parseVitestOutput(output) {
  const stats = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, failures: [] };
  const passedMatch = output.match(/✓\s+(\d+)\s+test/);
  // ...
}

// parsePlaywrightResults (mued-playwright-e2e.js)
async function parsePlaywrightResults(jsonPath) {
  const data = await fs.readFile(jsonPath, 'utf-8');
  const report = JSON.parse(data);
  const stats = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, failures: [] };
  // ...
}
```

**Recommended Solution:**
```javascript
// scripts/mcp/lib/test-result-parser.js
function parseTestResults(input, format = 'vitest') {
  const stats = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    failures: []
  };

  switch (format) {
    case 'vitest':
      return parseVitestOutput(input, stats);
    case 'playwright-json':
      return parsePlaywrightJson(input, stats);
    case 'playwright-stdout':
      return parsePlaywrightStdout(input, stats);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

module.exports = { parseTestResults };
```

**Implementation Steps:**
1. Create `scripts/mcp/lib/test-result-parser.js`
2. Move parsing logic into single module with format parameter
3. Update MCP servers to use shared parser

---

### Issue 7: test-server.js Overlaps with Other MCP Servers

**Location:** `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/test-server.js`

**Problem:** This server provides `test_health`, `test_api`, `test_booking`, `run_test_suite` - functionality that overlaps with:
- `mued-unit-test.js` (test running)
- `mued-playwright-e2e.js` (E2E tests)
- `mued-browser-debug.js` (API debugging)

**Impact:**
- Redundant MCP server
- Confusion about which server to use
- Additional maintenance burden

**Recommended Solution:**
Either:
1. Merge useful tools into `mued-browser-debug.js` (API testing fits well there)
2. Delete entirely if functionality is covered elsewhere

**Implementation Steps:**
1. Audit which tools are actively used
2. Migrate useful tools to appropriate server
3. Delete `test-server.js`
4. Update Claude Desktop config

---

### Issue 8: Archived Scripts Not Actually Archived

**Location:** `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/archive/`

**Problem:** README.md states consolidation happened (25 to 8 scripts), but:
- Archive directory still contains 14 files
- No clear indication if these are safe to delete
- Some archived functionality (check-tables.mjs) duplicated in main scripts

**Impact:**
- Repository bloat
- Confusion about which scripts are current
- Git history complexity

**Recommended Solution:**
Either:
1. Delete archive directory entirely (history preserved in git)
2. Move to a separate `legacy/` branch

**Implementation Steps:**
1. Verify all archived functionality exists in consolidated scripts
2. Create a final archive commit with message explaining removal
3. Delete `scripts/archive/` directory

---

### Issue 9: Inconsistent Database Connection Patterns

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-user.ts` (Lines 9-13) - Uses `pg.Client`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/check-user-quota.ts` - Uses Drizzle `db`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/test-db-connection.ts` - Uses `@neondatabase/serverless`

**Problem:** Three different database connection patterns across scripts.

**Current Implementations:**
```typescript
// Pattern 1: pg.Client (check-user.ts)
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Pattern 2: Drizzle ORM (check-user-quota.ts)
import { db } from '../db';

// Pattern 3: Neon serverless (test-db-connection.ts)
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

**Impact:**
- Inconsistent error handling
- Different SSL configurations
- Harder to maintain

**Recommended Solution:**
Standardize on Drizzle ORM (`db` import) for all scripts, as it's already configured for the project:

```typescript
// Standard pattern for all scripts
import { db } from '../db';
import { sql } from 'drizzle-orm';

// For raw queries
const result = await db.execute(sql`SELECT NOW()`);

// For typed queries
const users = await db.select().from(usersTable);
```

**Implementation Steps:**
1. Update `check-user.ts` to use Drizzle ORM
2. Update any other scripts using raw pg client
3. Document standard pattern in CLAUDE.md

---

### Issue 10: Duplicate Report Generation Logic

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-unit-test.js` (Lines 139-215)
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-playwright-e2e.js` (Lines 106-153)

**Problem:** Both MCP servers generate markdown reports with similar structure but duplicated code.

**Recommended Solution:**
```javascript
// scripts/mcp/lib/report-generator.js
function generateMarkdownReport({ title, stats, coverage, output, failures }) {
  let markdown = `# ${title}\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
  markdown += `**Total Tests:** ${stats.total}\n`;
  markdown += `**Duration:** ${(stats.duration / 1000).toFixed(2)}s\n\n`;

  // Common summary table
  markdown += `## Results\n\n`;
  markdown += `| Status | Count | Percentage |\n`;
  markdown += `|--------|-------|------------|\n`;
  markdown += `| Passed | ${stats.passed} | ${pct(stats.passed, stats.total)}% |\n`;
  markdown += `| Failed | ${stats.failed} | ${pct(stats.failed, stats.total)}% |\n`;
  markdown += `| Skipped | ${stats.skipped} | ${pct(stats.skipped, stats.total)}% |\n\n`;

  // Optional coverage section
  if (coverage) {
    markdown += formatCoverageSection(coverage);
  }

  // Failures section
  if (failures?.length > 0) {
    markdown += formatFailuresSection(failures);
  }

  // Console output
  markdown += `## Console Output\n\n\`\`\`\n${output}\n\`\`\`\n`;

  return markdown;
}

module.exports = { generateMarkdownReport };
```

---

## Low Priority Improvements

### Issue 11: test-e2e-unified.js Duplicates Playwright Config

**Location:** `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/test-e2e-unified.js`

**Problem:** This standalone script duplicates test configuration that exists in `playwright.config.ts`:
- Viewport settings
- Timeout values
- Base URL configuration

The MCP server `mued-playwright-e2e.js` properly uses the Playwright config file.

**Recommendation:** Consider deprecating `test-e2e-unified.js` in favor of using Playwright CLI or the MCP server directly.

---

### Issue 12: Migration Scripts Could Be Consolidated

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/apply-migrations.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/run-phase2-migrations.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/run-phase1.3-migrations.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/run-phase1-log-migration.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/migrate-sessions-phase2.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/rollback-phase2.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/rollback-sessions-phase2.ts`

**Problem:** 7 migration-related scripts that could be unified into a single migration CLI.

**Recommendation:** Create a unified `migrations.ts` CLI with subcommands:
```bash
tsx migrations.ts apply <phase>     # Apply migrations for a phase
tsx migrations.ts rollback <phase>  # Rollback migrations
tsx migrations.ts status            # Show migration status
```

---

### Issue 13: Unused/Debug Scripts Should Be Cleaned

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/debug-library-error.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/debug-material-page.ts`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/test-library-rss.js`

**Problem:** Debug scripts that may no longer be needed.

**Recommendation:**
1. Review if still actively used
2. If not, delete or archive
3. If yes, document purpose in README

---

### Issue 14: Shell Scripts Lack Error Handling Standards

**Location:**
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/test-runner.sh`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/setup-env.sh`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/setup-github-secrets.sh`
- `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/reorganize-docs.sh`

**Problem:** Inconsistent use of `set -e`, `set -u`, `set -o pipefail`.

**Recommendation:** Add standard shell header:
```bash
#!/bin/bash
set -euo pipefail
IFS=$'\n\t'
```

---

## Architectural Recommendations

### 1. Create Shared MCP Utilities Library

```
scripts/mcp/
  lib/
    mcp-utils.js       # Server initialization, common functions
    test-parser.js     # Test result parsing
    report-generator.js # Markdown report generation
  mued-unit-test.js
  mued-playwright-e2e.js
  mued-playwright-screenshot.js
  mued-browser-debug.js
```

### 2. Consolidate Data Check Scripts

```
scripts/
  check-data.ts        # Unified data checking CLI
  db-utilities.ts      # Database management CLI (already exists)
```

### 3. Unify Test Running

Use npm scripts as the primary interface:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "./scripts/test-coverage.sh"
  }
}
```

---

## Dependencies Analysis

### Outdated Packages
No specific outdated packages identified in scripts (would need `npm outdated` analysis).

### Unused Dependencies
- `pg` package is used in `check-user.ts` but could be replaced with Drizzle

### Missing Beneficial Dependencies
- **zx** (Google): Would simplify shell script-like tasks in JS
  - Would replace custom execAsync wrappers
  - Better process management

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total files analyzed | 62 |
| Issues found | 14 |
| High priority | 4 |
| Medium priority | 6 |
| Low priority | 4 |
| Estimated removable LOC | ~800-1000 |
| Files to consolidate/delete | 12-15 |
| Estimated effort (hours) | 8-12 |

---

## Implementation Priority Matrix

| Issue | Impact | Effort | Priority | Dependency |
|-------|--------|--------|----------|------------|
| #1 MCP Utilities | HIGH | MEDIUM | 1 | None |
| #2 Env Parsing | HIGH | LOW | 2 | #1 |
| #3 DB Check Scripts | MEDIUM | LOW | 3 | None |
| #4 Test Runners | MEDIUM | LOW | 4 | None |
| #5 Check Scripts | MEDIUM | MEDIUM | 5 | None |
| #6 Test Parsing | MEDIUM | MEDIUM | 6 | #1 |
| #8 Archive Cleanup | LOW | LOW | 7 | #3, #4 |

---

*Report generated by Claude Code Optimization Analysis*
*Last updated: 2025-11-26*
