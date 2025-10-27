# MUED LMS v2 - Scripts Directory

## Overview
This directory contains automation scripts for the MUED LMS v2 project. Scripts have been consolidated and optimized for better maintainability and reduced redundancy.

**Total Scripts: 8 essential files** (reduced from 25)

## Script Structure

### Core Scripts (8 files)

#### 1. **`test-e2e-unified.js`** - Comprehensive E2E Testing
Consolidated E2E test suite that replaces 7 separate test scripts.

**Usage:**
```bash
node test-e2e-unified.js                  # Run all tests
node test-e2e-unified.js --suite login    # Run login tests only
node test-e2e-unified.js --suite booking  # Run booking tests
node test-e2e-unified.js --headless=false # Run with browser visible
node test-e2e-unified.js --screenshot     # Capture screenshots
```

**Replaces:**
- check-clerk-flow.js
- check-login-page.js
- test-password-login.js
- test-simple-login.js
- test-booking-page.js
- debug-calendar.js
- test-e2e-complete.js

---

#### 2. **`db-utilities.ts`** - Database Management
Unified database management CLI tool.

**Usage:**
```bash
tsx db-utilities.ts seed-test          # Create test users and slots
tsx db-utilities.ts verify             # Verify all tables exist
tsx db-utilities.ts check-tables       # List all tables with counts
tsx db-utilities.ts check-reservations # Check reservation data
tsx db-utilities.ts clean-test         # Remove test data
```

**Replaces:**
- create-test-users.js
- create-test-slots.js
- check-tables.mjs
- check-reservation.mjs

---

#### 3. **`seed.ts`** - Production Database Seeding
Seeds the production database with initial data.

**Usage:**
```bash
npm run db:seed    # Via package.json script
tsx scripts/seed.ts # Direct execution
```

---

#### 4. **`setup-stripe-products.ts`** - Stripe Product Setup
Configures Stripe products and pricing for the application.

**Usage:**
```bash
npm run stripe:setup       # Via package.json script
tsx scripts/setup-stripe-products.ts # Direct execution
```

---

#### 5. **`sync-clerk-users.ts`** - Clerk User Synchronization
Synchronizes user data between Clerk and the local database.

**Usage:**
```bash
tsx scripts/sync-clerk-users.ts
```

---

#### 6. **`setup-env.sh`** - Environment Configuration
Unified environment and deployment setup script.

**Usage:**
```bash
./setup-env.sh vercel-set     # Set Vercel environment variables
./setup-env.sh vercel-verify  # Verify Vercel environment
./setup-env.sh test-deps      # Install test dependencies
./setup-env.sh all            # Run all setup tasks
```

**Replaces:**
- set-vercel-env.sh
- verify-vercel-env.sh
- setup-test-deps.sh

---

#### 7. **`add-indexes.sql`** - Database Performance Optimization
SQL script for adding database indexes to improve query performance.

**Usage:**
```bash
# Apply via database client
psql $DATABASE_URL < scripts/add-indexes.sql
```

---

#### 8. **`reorganize-docs.sh`** - Documentation Management
Utility for reorganizing and maintaining documentation structure.

**Usage:**
```bash
./reorganize-docs.sh
```

---

## MCP Servers Directory (`/scripts/mcp/`)

Model Context Protocol servers for Claude Desktop integration.

### Available MCP Servers:

1. **`mued-playwright-e2e.js`** - E2E test automation via MCP
2. **`mued-playwright-screenshot.js`** - Screenshot capture via MCP
3. **`mued-unit-test.js`** - Unit test execution via MCP
4. **`test-server.js`** - General testing server

These servers are configured in Claude Desktop config:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

---

## Archive Directory (`/scripts/archive/`)

Contains legacy scripts that have been replaced or consolidated. These are kept for reference but should not be used in active development.

**Archived Scripts (14 files):**
- Login/auth testing scripts (7 files)
- Database utility scripts (4 files)
- MCP/screenshot testing scripts (3 files)
- Environment setup scripts (3 files)

---

## Migration Guide

If you were using old scripts, here's how to migrate:

| Old Script | New Script | Command |
|------------|------------|---------|
| `check-clerk-flow.js` | `test-e2e-unified.js` | `--suite login` |
| `test-booking-page.js` | `test-e2e-unified.js` | `--suite booking` |
| `create-test-users.js` | `db-utilities.ts` | `seed-test` |
| `check-tables.mjs` | `db-utilities.ts` | `check-tables` |
| `set-vercel-env.sh` | `setup-env.sh` | `vercel-set` |
| `verify-vercel-env.sh` | `setup-env.sh` | `vercel-verify` |

---

## Best Practices

1. **Use Consolidated Scripts**: Always use the new unified scripts instead of creating new single-purpose scripts.

2. **Add Features, Don't Add Files**: If you need new functionality, add it as a command/option to existing scripts rather than creating new files.

3. **Document Changes**: Update this README when adding new commands or options to scripts.

4. **Test Before Commit**: Always test scripts locally before committing changes.

---

## Quick Reference

```bash
# Testing
node test-e2e-unified.js --suite=all

# Database
tsx db-utilities.ts seed-test
tsx db-utilities.ts verify

# Environment
./setup-env.sh all

# Production Setup
npm run db:seed
npm run stripe:setup
```

---

*Last Updated: 2025-10-27*
*Script Consolidation: Reduced from 25 to 8 essential files*