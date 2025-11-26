/**
 * MUEDnote V3 Chat Tables Migration Script
 *
 * Usage:
 *   cd apps/muednote-v3
 *   npx tsx scripts/migrate-chat-tables.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/MUEDNOTE_DATABASE_URL=(.+)/);
const DATABASE_URL = match?.[1]?.trim();

if (!DATABASE_URL) {
  console.error('❌ Error: MUEDNOTE_DATABASE_URL not found in .env.local');
  process.exit(1);
}

/**
 * Split SQL file into individual statements
 * Respects DO $$ blocks and multi-line statements
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
      dollarQuoteCount = 0;
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements.filter(stmt => stmt.length > 0);
}

async function migrate() {
  console.log('========================================');
  console.log('MUEDnote V3 Chat Tables Migration');
  console.log('========================================\n');

  const sql = neon(DATABASE_URL!);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const result = await sql`SELECT version()`;
    console.log('✅ Connection successful');
    console.log(`   PostgreSQL: ${result[0].version.split(',')[0]}\n`);

    // Read migration file
    const migrationPath = path.join(__dirname, '..', '..', '..', 'db', 'migrations', '0010_muednote_v3_chat_tables.sql');
    console.log(`📂 Reading migration: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    const statements = splitSQLStatements(migrationSQL);

    console.log(`📦 Executing ${statements.length} statements...\n`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const summary = statement.replace(/\s+/g, ' ').substring(0, 60).trim();
      console.log(`   [${i + 1}/${statements.length}] ${summary}...`);

      try {
        await sql.query(statement);
        successCount++;
        console.log(`   ✅ Success`);
      } catch (error: any) {
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate key')
        ) {
          console.log(`   ⚠️  Already exists (skipped)`);
          skipCount++;
          continue;
        }
        console.error(`   ❌ Error: ${error.message}`);
        throw error;
      }
    }

    // Verify tables
    console.log('\n🔍 Verifying migration...');

    const tables = ['chat_sessions', 'chat_messages', 'ai_profiles', 'ai_memories'];
    for (const table of tables) {
      try {
        const count = await sql`SELECT COUNT(*) FROM ${sql(table)}`;
        console.log(`   ✅ ${table} - OK`);
      } catch (error: any) {
        // Try raw query
        try {
          await sql.query(`SELECT COUNT(*) FROM ${table}`);
          console.log(`   ✅ ${table} - OK`);
        } catch {
          console.log(`   ❌ ${table} - ${error.message}`);
        }
      }
    }

    console.log('\n========================================');
    console.log(`✅ Migration completed!`);
    console.log(`   Success: ${successCount}, Skipped: ${skipCount}`);
    console.log('========================================\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
