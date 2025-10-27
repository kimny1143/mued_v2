#!/usr/bin/env tsx

/**
 * Database Migration Script
 * Applies SQL migrations to Neon PostgreSQL
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function applyMigration(filePath: string) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log(`\n📂 Applying migration: ${path.basename(filePath)}`);

    const sql = fs.readFileSync(filePath, 'utf-8');
    await client.query(sql);

    console.log(`✅ Successfully applied: ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error applying ${path.basename(filePath)}:`, error);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const migrations = process.argv.slice(2);

  if (migrations.length === 0) {
    console.log('Usage: tsx scripts/apply-migrations.ts <migration-file-1> [migration-file-2] ...');
    console.log('\nExample:');
    console.log('  tsx scripts/apply-migrations.ts db/migrations/0004_gin_indexes.sql');
    process.exit(1);
  }

  console.log('🚀 Starting database migrations...');
  console.log(`📍 Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}`);

  for (const migration of migrations) {
    const fullPath = path.resolve(migration);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Migration file not found: ${migration}`);
      process.exit(1);
    }

    await applyMigration(fullPath);
  }

  console.log('\n✅ All migrations applied successfully!');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
