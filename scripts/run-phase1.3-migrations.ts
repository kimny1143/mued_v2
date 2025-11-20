#!/usr/bin/env tsx

/**
 * Phase 1.3 Migration Runner
 * Applies RAG embeddings and question templates
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function runMigration(filePath: string, description: string) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log(`\n📂 ${description}`);
    console.log(`   File: ${path.basename(filePath)}`);

    const sql = fs.readFileSync(filePath, 'utf-8');
    const startTime = Date.now();

    await client.query(sql);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Success: ${description} (${elapsed}ms)`);
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    console.error(error);
    throw error;
  } finally {
    await client.end();
  }
}

async function verifyPgVector() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);

    if (result.rows.length === 0) {
      console.error('❌ pgvector extension not found!');
      console.error('   Neon PostgreSQL should support pgvector by default.');
      console.error('   If this error persists, contact Neon support.');
      process.exit(1);
    }

    console.log('✅ pgvector extension verified:', result.rows[0]);
  } catch (error) {
    console.error('❌ Failed to verify pgvector:', error);
    throw error;
  } finally {
    await client.end();
  }
}

async function verifyIndexes() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('\n📊 Verifying indexes...');

    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('rag_embeddings', 'question_templates')
      ORDER BY tablename, indexname;
    `);

    if (result.rows.length === 0) {
      console.warn('⚠️  No indexes found (this might be expected if migrations just ran)');
    } else {
      console.log(`\n   Found ${result.rows.length} indexes:`);
      for (const row of result.rows) {
        console.log(`   - ${row.indexname} on ${row.tablename}`);
      }
    }

    // Check for HNSW index specifically
    const hnswCheck = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'rag_embeddings'
        AND indexname LIKE '%vector%'
        AND indexdef LIKE '%hnsw%';
    `);

    if (hnswCheck.rows.length > 0) {
      console.log('\n✅ HNSW index found:', hnswCheck.rows[0].indexname);
    } else {
      console.warn('\n⚠️  HNSW index not found. Check migration 0012.');
    }
  } catch (error) {
    console.error('❌ Failed to verify indexes:', error);
  } finally {
    await client.end();
  }
}

async function countRecords() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('\n📊 Counting records...');

    const templates = await client.query('SELECT COUNT(*) FROM question_templates');
    const embeddings = await client.query('SELECT COUNT(*) FROM rag_embeddings');

    console.log(`   question_templates: ${templates.rows[0].count} rows`);
    console.log(`   rag_embeddings: ${embeddings.rows[0].count} rows`);

    if (parseInt(templates.rows[0].count) === 0) {
      console.warn('\n⚠️  No question templates found. Run seed script:');
      console.warn('   npm run db:seed:templates');
    }
  } catch (error) {
    console.error('❌ Failed to count records:', error);
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 1.3 Migration: RAG Embeddings + Question Templates     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`\n📍 Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}\n`);

  const migrations = [
    {
      file: 'db/migrations/0012_add_rag_embeddings.sql',
      description: 'Create rag_embeddings table with pgvector (HNSW)',
    },
    {
      file: 'db/migrations/0013_add_question_templates.sql',
      description: 'Create question_templates table with seed data',
    },
    {
      file: 'db/migrations/0014_add_rag_rls_policies.sql',
      description: 'Add Row-Level Security policies',
    },
  ];

  // Step 1: Verify pgvector extension
  console.log('🔍 Step 1: Verifying pgvector extension...');
  await verifyPgVector();

  // Step 2: Run migrations
  console.log('\n🔍 Step 2: Running migrations...');
  for (const migration of migrations) {
    const fullPath = path.resolve(migration.file);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Migration file not found: ${migration.file}`);
      process.exit(1);
    }

    await runMigration(fullPath, migration.description);
  }

  // Step 3: Verify indexes
  await verifyIndexes();

  // Step 4: Count records
  await countRecords();

  // Step 5: Next steps
  console.log('\n✅ Phase 1.3 migrations completed successfully!\n');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Next Steps                                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('   1. Verify templates: psql -c "SELECT COUNT(*) FROM question_templates;"');
  console.log('   2. Generate embeddings: npm run job:generate-embeddings');
  console.log('   3. Test RAG search: npm run test:integration -- rag');
  console.log('   4. Deploy InterviewerService: See PHASE1.3_IMPLEMENTATION_PLAN.md');
  console.log('');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  console.error('\n💡 Rollback command:');
  console.error('   tsx scripts/apply-migrations.ts db/migrations/rollback_0012_rag_phase1.3.sql');
  process.exit(1);
});
