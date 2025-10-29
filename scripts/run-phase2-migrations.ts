#!/usr/bin/env tsx

/**
 * Phase 2 Migration Executor
 *
 * Executes database migrations for RAG metrics, data provenance, and plugin registry
 *
 * Migrations included:
 * - 0006_add_rag_metrics.sql: Core RAG tables (ai_dialogue_log, provenance, rag_metrics_history, plugin_registry)
 * - 0007_optimize_rag_indexes.sql: Performance optimization indexes
 * - 0008_add_foreign_keys_fixed.sql: Referential integrity constraints
 *
 * Usage:
 *   tsx scripts/run-phase2-migrations.ts
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import ws from 'ws';

// Load environment variables
config({ path: '.env.local' });

// Configure WebSocket for Neon
// @ts-ignore
globalThis.WebSocket = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface Migration {
  file: string;
  description: string;
  sql?: string;
}

const migrations: Migration[] = [
  {
    file: '0006_add_rag_metrics.sql',
    description: 'Create RAG metrics tables (ai_dialogue_log, provenance, rag_metrics_history, plugin_registry)'
  },
  {
    file: '0007_optimize_rag_indexes.sql',
    description: 'Optimize indexes for analytics queries'
  },
  {
    file: '0008_add_foreign_keys_fixed.sql',
    description: 'Add foreign key constraints for data integrity'
  }
];

async function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

async function logError(message: string) {
  console.error(`❌ ${message}`);
}

async function logInfo(message: string) {
  console.log(`📋 ${message}`);
}

async function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

/**
 * Check if a table exists in the database
 */
async function tableExists(tableName: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    `, [tableName]);
    return result.rows[0].exists;
  } finally {
    client.release();
  }
}

/**
 * Check current migration state
 */
async function checkMigrationState() {
  logInfo('Checking current database state...');

  const tables = ['ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry'];
  const existingTables: string[] = [];

  for (const table of tables) {
    const exists = await tableExists(table);
    if (exists) {
      existingTables.push(table);
      logWarning(`Table '${table}' already exists`);
    }
  }

  if (existingTables.length > 0) {
    console.log('\n⚠️  Some Phase 2 tables already exist:');
    existingTables.forEach(t => console.log(`   - ${t}`));
    console.log('\nThe migrations use "CREATE TABLE IF NOT EXISTS" so they are safe to re-run.\n');
  } else {
    logSuccess('No Phase 2 tables found - fresh migration');
  }

  return existingTables;
}

/**
 * Execute a single migration file
 */
async function executeMigration(migration: Migration): Promise<boolean> {
  const migrationPath = join(process.cwd(), 'db', 'migrations', migration.file);

  try {
    logInfo(`Executing: ${migration.description}`);

    // Read SQL file
    const sql = readFileSync(migrationPath, 'utf-8');
    migration.sql = sql;

    // Execute migration
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');

      logSuccess(`Completed: ${migration.file}`);
      return true;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logError(`Failed to execute ${migration.file}`);
    console.error(error);
    return false;
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  logInfo('Verifying migration results...');

  const client = await pool.connect();

  try {
    // Check tables
    const tables = ['ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry'];
    for (const table of tables) {
      const exists = await tableExists(table);
      if (exists) {
        logSuccess(`Table '${table}' exists`);
      } else {
        logError(`Table '${table}' does not exist`);
      }
    }

    // Check ENUM types
    const enumTypes = ['content_type', 'acquisition_method', 'license_type'];
    for (const enumType of enumTypes) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_type
          WHERE typname = $1
        );
      `, [enumType]);

      if (result.rows[0].exists) {
        logSuccess(`ENUM type '${enumType}' exists`);
      } else {
        logError(`ENUM type '${enumType}' does not exist`);
      }
    }

    // Check indexes
    const indexes = [
      'idx_ai_dialogue_user',
      'idx_ai_dialogue_session',
      'idx_ai_dialogue_user_created',
      'idx_provenance_content',
      'idx_provenance_expiring',
      'idx_rag_metrics_date',
      'idx_plugin_name'
    ];

    for (const idx of indexes) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE indexname = $1
        );
      `, [idx]);

      if (result.rows[0].exists) {
        logSuccess(`Index '${idx}' exists`);
      } else {
        logWarning(`Index '${idx}' does not exist`);
      }
    }

    // Check foreign keys
    const foreignKeys = [
      'fk_ai_dialogue_user',
      'fk_provenance_acquired_by'
    ];

    for (const fk of foreignKeys) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints
          WHERE constraint_name = $1
          AND constraint_type = 'FOREIGN KEY'
        );
      `, [fk]);

      if (result.rows[0].exists) {
        logSuccess(`Foreign key '${fk}' exists`);
      } else {
        logWarning(`Foreign key '${fk}' does not exist`);
      }
    }

    // Check plugin_registry initial data
    const pluginResult = await client.query(`
      SELECT COUNT(*) as count FROM plugin_registry;
    `);

    const pluginCount = parseInt(pluginResult.rows[0].count);
    if (pluginCount > 0) {
      logSuccess(`plugin_registry has ${pluginCount} entries`);

      // Show plugin details
      const plugins = await client.query(`
        SELECT name, source, enabled, version FROM plugin_registry;
      `);

      console.log('\nRegistered Plugins:');
      plugins.rows.forEach(plugin => {
        console.log(`  - ${plugin.name} (${plugin.source}) v${plugin.version} ${plugin.enabled ? '✓' : '✗'}`);
      });
    } else {
      logWarning('plugin_registry is empty');
    }

  } finally {
    client.release();
  }
}

/**
 * Generate migration report
 */
async function generateReport(executedMigrations: Migration[], startTime: Date) {
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;

  console.log('\n' + '='.repeat(70));
  console.log('📊 MIGRATION EXECUTION REPORT');
  console.log('='.repeat(70));

  console.log('\n📅 Execution Details:');
  console.log(`  Start Time:     ${startTime.toISOString()}`);
  console.log(`  End Time:       ${endTime.toISOString()}`);
  console.log(`  Duration:       ${duration.toFixed(2)}s`);

  console.log('\n📋 Executed Migrations:');
  executedMigrations.forEach((migration, index) => {
    console.log(`  ${index + 1}. ${migration.file}`);
    console.log(`     ${migration.description}`);
  });

  console.log('\n✅ Phase 2 Database Setup Complete!');
  console.log('\nNext Steps:');
  console.log('  1. Review verification output above');
  console.log('  2. Test API endpoints for RAG metrics');
  console.log('  3. Run integration tests: npm run test:integration');
  console.log('  4. Check plugin health: tsx scripts/db-utilities.ts check-plugins');

  console.log('\n' + '='.repeat(70));
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Phase 2 Migration Executor\n');

  const startTime = new Date();

  try {
    // Step 1: Pre-flight checks
    console.log('Step 1: Pre-flight checks');
    console.log('─'.repeat(70));
    const existingTables = await checkMigrationState();
    console.log('');

    // Step 2: Execute migrations
    console.log('Step 2: Execute migrations');
    console.log('─'.repeat(70));

    const executedMigrations: Migration[] = [];
    let allSuccessful = true;

    for (const migration of migrations) {
      const success = await executeMigration(migration);
      if (!success) {
        allSuccessful = false;
        logError('Migration failed! Stopping execution.');
        break;
      }
      executedMigrations.push(migration);
      console.log('');
    }

    if (!allSuccessful) {
      logError('Migration process failed. Database may be in an inconsistent state.');
      logInfo('Review logs above and consider running rollback script if needed.');
      process.exit(1);
    }

    // Step 3: Verify results
    console.log('Step 3: Verify migration results');
    console.log('─'.repeat(70));
    await verifyMigration();
    console.log('');

    // Step 4: Generate report
    await generateReport(executedMigrations, startTime);

    await pool.end();
    process.exit(0);

  } catch (error) {
    logError('Fatal error during migration execution');
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

// Execute
main();
