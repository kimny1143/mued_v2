/**
 * Session/Interview Schema Migration Script
 * Phase 2: MUEDnote AI Interview-driven Logging System
 *
 * Usage:
 *   npx tsx scripts/migrate-sessions-phase2.ts
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

// ========================================
// Configuration
// ========================================

const DATABASE_URL = process.env.DATABASE_URL ?? '';

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not set');
  console.error('Please set it in your .env.local file');
  process.exit(1);
}

// ========================================
// Helper Functions
// ========================================

/**
 * Read SQL file from migrations directory
 */
function readMigrationFile(filename: string): string {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  const filePath = path.join(migrationsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Split SQL file into individual statements
 * Respects DO $$ blocks, CREATE FUNCTION $$ blocks, and multi-line statements
 */
function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let dollarQuoteCount = 0;

  const lines = sql.split('\n');

  for (const line of lines) {
    // Skip pure comment lines (only when not inside dollar-quoted block)
    if (line.trim().startsWith('--') && dollarQuoteCount === 0) {
      continue;
    }

    current += line + '\n';

    // Count $$ occurrences in this line
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      dollarQuoteCount += dollarMatches.length;
    }

    // End of statement: semicolon when dollar quotes are balanced
    if (line.trim().endsWith(';') && dollarQuoteCount % 2 === 0) {
      statements.push(current.trim());
      current = '';
      dollarQuoteCount = 0; // Reset for next statement
    }
  }

  // Add remaining content if any
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(stmt => stmt.length > 0);
}

/**
 * Execute SQL statements sequentially
 */
async function executeSQLStatements(
  sql: NeonQueryFunction<false, false>,
  statements: string[],
  description: string
): Promise<void> {
  console.log(`\n📦 Executing: ${description}`);
  console.log(`   (${statements.length} statements)`);

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip empty statements and pure comments
    if (!statement || statement.trim().length === 0) {
      continue;
    }

    // Log statement summary (first 80 chars)
    const summary = statement
      .replace(/\s+/g, ' ')
      .substring(0, 80)
      .trim();
    console.log(`   [${i + 1}/${statements.length}] ${summary}...`);

    try {
      await sql.query(statement);
      successCount++;
    } catch (error: any) {
      // Skip if already exists (idempotency)
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate key')
      ) {
        console.log(`   ⚠️  Already exists (skipped)`);
        skipCount++;
        continue;
      }

      console.error(`   ❌ Error executing statement:`);
      console.error(`      ${error.message}`);
      throw error;
    }
  }

  console.log(`   ✅ Success: ${successCount}, Skipped: ${skipCount}`);
}

/**
 * Test database connection
 */
async function testConnection(sql: NeonQueryFunction<false, false>): Promise<void> {
  console.log('🔌 Testing database connection...');

  try {
    const result = await sql`SELECT version()`;
    console.log('✅ Connection successful');
    console.log(`   PostgreSQL version: ${result[0].version.split(',')[0]}`);
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    throw error;
  }
}

/**
 * Verify migration success
 */
async function verifyMigration(sql: NeonQueryFunction<false, false>): Promise<void> {
  console.log('\n🔍 Verifying migration...');

  const checks = [
    { name: 'sessions table', query: `SELECT COUNT(*) FROM sessions` },
    { name: 'session_analyses table', query: `SELECT COUNT(*) FROM session_analyses` },
    { name: 'interview_questions table', query: `SELECT COUNT(*) FROM interview_questions` },
    { name: 'interview_answers table', query: `SELECT COUNT(*) FROM interview_answers` },
    { name: 'session_type enum', query: `SELECT COUNT(*) FROM pg_type WHERE typname = 'session_type'` },
    { name: 'interview_focus enum', query: `SELECT COUNT(*) FROM pg_type WHERE typname = 'interview_focus'` },
    { name: 'v_sessions_with_user view', query: `SELECT COUNT(*) FROM v_sessions_with_user` },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      await sql.query(check.query);
      console.log(`   ✅ ${check.name}`);
    } catch (error: any) {
      console.error(`   ❌ ${check.name}: ${error.message}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    throw new Error('Migration verification failed');
  }

  console.log('\n✅ All verification checks passed');
}

// ========================================
// Main Migration Function
// ========================================

async function migrate() {
  console.log('========================================');
  console.log('MUEDnote Session/Interview Migration');
  console.log('Phase 2: AI Interview-driven Logging');
  console.log('========================================\n');

  const sql = neon(DATABASE_URL);

  try {
    // Step 1: Test connection
    await testConnection(sql);

    // Step 2: Execute main migration (0010)
    const migrationSQL = readMigrationFile('0010_add_sessions_phase2.sql');
    const statements = splitSQLStatements(migrationSQL);
    await executeSQLStatements(
      sql,
      statements,
      '0010_add_sessions_phase2.sql - Core tables and indexes'
    );

    // Step 3: Execute RLS policies migration (0011)
    const rlsSQL = readMigrationFile('0011_add_sessions_rls_policies.sql');
    const rlsStatements = splitSQLStatements(rlsSQL);
    await executeSQLStatements(
      sql,
      rlsStatements,
      '0011_add_sessions_rls_policies.sql - Row Level Security'
    );

    // Step 4: Verify migration
    await verifyMigration(sql);

    console.log('\n========================================');
    console.log('✅ Migration completed successfully!');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('1. Generate Drizzle types: npm run db:generate');
    console.log('2. Open Drizzle Studio: npm run db:studio');
    console.log('3. Test with: npm run test');
    console.log('');

  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ Migration failed!');
    console.error('========================================\n');
    console.error('Error:', error.message);
    console.error('\nTo rollback, run:');
    console.error('npx tsx scripts/rollback-sessions-phase2.ts');
    console.error('');
    process.exit(1);
  }
}

// ========================================
// Run Migration
// ========================================

migrate();
