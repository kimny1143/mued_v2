/**
 * Simple SQL Migration Runner
 * Usage: npx tsx scripts/run-sql-migration.ts <migration-file.sql>
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function runMigration(migrationFile: string) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  // Read migration file
  const migrationPath = path.resolve(process.cwd(), migrationFile);

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`\n🚀 Running migration: ${migrationFile}`);
  console.log('─'.repeat(60));

  try {
    const statements = splitSQLStatements(migrationSql);
    console.log(`   Found ${statements.length} statements`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (!statement || statement.trim().length === 0) {
        continue;
      }

      const summary = statement
        .replace(/\s+/g, ' ')
        .substring(0, 60)
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

    console.log(`\n✅ Migration completed! Success: ${successCount}, Skipped: ${skipCount}`);

    // Verify tables created
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'muednote_mobile%'
      ORDER BY table_name
    `;

    if (tables.length > 0) {
      console.log('\n📋 Created tables:');
      tables.forEach((t) => {
        console.log(`  - ${t.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
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

// Run if called directly
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.log('Usage: npx tsx scripts/run-sql-migration.ts <migration-file.sql>');
  process.exit(1);
}

runMigration(migrationFile);
