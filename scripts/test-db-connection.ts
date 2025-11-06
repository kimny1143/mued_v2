#!/usr/bin/env tsx

/**
 * Quick database connection test
 * Verifies that we can connect to the database before running migrations
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Load environment variables
config({ path: '.env.local' });

// Configure WebSocket for Neon
// @ts-expect-error - WebSocket polyfill for Node.js environment
globalThis.WebSocket = ws;

async function testConnection() {
  console.log('🔍 Testing database connection...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env.local');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const client = await pool.connect();

    // Test basic query
    const result = await client.query('SELECT NOW() as now, current_database() as db, version() as version');

    console.log('✅ Connection successful!\n');
    console.log('Database Info:');
    console.log('─'.repeat(70));
    console.log(`  Database: ${result.rows[0].db}`);
    console.log(`  Server Time: ${result.rows[0].now}`);
    console.log(`  PostgreSQL Version: ${result.rows[0].version.split(',')[0]}`);
    console.log('─'.repeat(70));

    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 Existing tables:');
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('  (no tables found)');
    }

    // Check for Phase 2 tables
    const phase2Tables = ['ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry'];
    const existingPhase2 = tablesResult.rows
      .map(r => r.table_name)
      .filter(name => phase2Tables.includes(name));

    if (existingPhase2.length > 0) {
      console.log('\n⚠️  Phase 2 tables already exist:');
      existingPhase2.forEach(t => console.log(`  - ${t}`));
      console.log('\nMigrations will use IF NOT EXISTS clauses, so re-running is safe.');
    } else {
      console.log('\n✅ No Phase 2 tables found - ready for fresh migration');
    }

    client.release();
    await pool.end();

    console.log('\n✅ Database connection test passed!\n');

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

testConnection();
