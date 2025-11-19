#!/usr/bin/env tsx

/**
 * Run Phase 1 MUEDnote log_entries migration
 * Migration: 0009_add_log_entries_phase1.sql
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';
import ws from 'ws';

// Load environment variables
config({ path: '.env.local' });

// Configure WebSocket for Neon
// @ts-expect-error - WebSocket polyfill for Node.js environment
globalThis.WebSocket = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  console.log('\n🔄 Running Phase 1 MUEDnote log_entries migration...\n');

  const client = await pool.connect();

  try {
    // Read migration file
    const migrationPath = join(
      process.cwd(),
      'db/migrations/0009_add_log_entries_phase1.sql'
    );
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📋 Executing migration SQL...\n');

    // Execute the entire migration as one statement
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying migration...\n');

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('log_entries')
      ORDER BY table_name;
    `);

    if (tables.rows.length > 0) {
      console.log('📋 Created tables:');
      tables.rows.forEach((table: any) => {
        console.log(`  ✓ ${table.table_name}`);
      });
    } else {
      console.log('⚠️  log_entries table already exists');
    }

    // Check row count
    const logCount = await client.query('SELECT COUNT(*) as count FROM log_entries');
    console.log(`\n📊 log_entries: ${logCount.rows[0].count} rows\n`);

    console.log('✅ Migration completed successfully!\n');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('⚠️  Migration already applied (tables exist)\n');
    } else {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
