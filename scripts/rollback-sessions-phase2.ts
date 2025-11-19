/**
 * Rollback Script for Session/Interview Schema
 * Phase 2: Removes all Session/Interview tables and policies
 *
 * ⚠️ WARNING: This will permanently delete all session data!
 *
 * Usage:
 *   npx tsx scripts/rollback-sessions-phase2.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// ========================================
// Configuration
// ========================================

const DATABASE_URL = process.env.DATABASE_URL;

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
 * Ask for user confirmation
 */
async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Execute SQL statement
 */
async function executeSQL(
  sql: neon.NeonQueryFunction<false, false>,
  statement: string,
  description: string
): Promise<void> {
  console.log(`📦 ${description}...`);

  try {
    await sql(statement);
    console.log('   ✅ Success');
  } catch (error: any) {
    // Skip if doesn't exist
    if (
      error.message.includes('does not exist') ||
      error.message.includes('could not find')
    ) {
      console.log('   ⚠️  Already removed (skipped)');
      return;
    }

    console.error('   ❌ Error:', error.message);
    throw error;
  }
}

/**
 * Get row count from table
 */
async function getRowCount(
  sql: neon.NeonQueryFunction<false, false>,
  tableName: string
): Promise<number> {
  try {
    const result = await sql(`SELECT COUNT(*) as count FROM ${tableName}`);
    return parseInt(result[0].count as string);
  } catch {
    return 0;
  }
}

/**
 * Display data summary
 */
async function displayDataSummary(sql: neon.NeonQueryFunction<false, false>): Promise<void> {
  console.log('\n📊 Current data summary:');

  const tables = [
    'sessions',
    'session_analyses',
    'interview_questions',
    'interview_answers',
  ];

  let totalRows = 0;

  for (const table of tables) {
    const count = await getRowCount(sql, table);
    totalRows += count;
    console.log(`   - ${table}: ${count} rows`);
  }

  console.log(`   Total: ${totalRows} rows will be deleted\n`);
}

// ========================================
// Main Rollback Function
// ========================================

async function rollback() {
  console.log('========================================');
  console.log('⚠️  Session/Interview Rollback Script');
  console.log('========================================\n');

  console.log('This will PERMANENTLY DELETE:');
  console.log('- All session records');
  console.log('- All interview questions and answers');
  console.log('- All session analyses');
  console.log('- All related views and indexes');
  console.log('- All RLS policies');
  console.log('');

  const sql = neon(DATABASE_URL);

  try {
    // Step 1: Display current data
    await displayDataSummary(sql);

    // Step 2: Ask for confirmation
    const confirmed = await confirm('⚠️  Do you want to proceed with rollback?');

    if (!confirmed) {
      console.log('\n❌ Rollback cancelled by user');
      process.exit(0);
    }

    console.log('\n🔄 Starting rollback...\n');

    // Step 3: Execute rollback SQL
    const rollbackSQL = readMigrationFile('rollback_0010_sessions_phase2.sql');
    await executeSQL(sql, rollbackSQL, 'Executing rollback SQL');

    // Step 4: Verify rollback
    console.log('\n🔍 Verifying rollback...');

    const verifyChecks = [
      { name: 'sessions table', query: `SELECT COUNT(*) FROM sessions` },
      { name: 'session_type enum', query: `SELECT COUNT(*) FROM pg_type WHERE typname = 'session_type'` },
    ];

    let allRemoved = true;

    for (const check of verifyChecks) {
      try {
        await sql(check.query);
        console.log(`   ❌ ${check.name} still exists`);
        allRemoved = false;
      } catch {
        console.log(`   ✅ ${check.name} removed`);
      }
    }

    if (!allRemoved) {
      throw new Error('Some objects were not removed');
    }

    console.log('\n========================================');
    console.log('✅ Rollback completed successfully!');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('1. Re-run migration if needed: npm run db:migrate:sessions');
    console.log('2. Generate Drizzle types: npm run db:generate');
    console.log('');

  } catch (error: any) {
    console.error('\n========================================');
    console.error('❌ Rollback failed!');
    console.error('========================================\n');
    console.error('Error:', error.message);
    console.error('');
    process.exit(1);
  }
}

// ========================================
// Run Rollback
// ========================================

rollback();
