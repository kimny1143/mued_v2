/**
 * Check RLS (Row Level Security) Status
 *
 * Verifies that RLS policies are enabled in production database
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

async function checkRLSStatus() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('📊 Checking RLS Status for all tables...\n');

  try {
    // Check RLS status for all tables
    const rlsStatus = await sql`
      SELECT
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log('Table RLS Status:');
    console.log('─'.repeat(50));

    let hasRLS = 0;
    let noRLS = 0;

    for (const row of rlsStatus) {
      const status = row.rls_enabled ? '✅ ENABLED' : '⚠️  DISABLED';
      console.log(`${row.tablename.padEnd(30)} ${status}`);

      if (row.rls_enabled) {
        hasRLS++;
      } else {
        noRLS++;
      }
    }

    console.log('─'.repeat(50));
    console.log(`\nSummary:`);
    console.log(`  ✅ Tables with RLS: ${hasRLS}`);
    console.log(`  ⚠️  Tables without RLS: ${noRLS}`);

    if (noRLS > 0) {
      console.log('\n⚠️  WARNING: Some tables do not have RLS enabled.');
      console.log('   This may be intentional for public data, but verify security requirements.');
    } else {
      console.log('\n✅ All tables have RLS enabled.');
    }

    // Check RLS policies
    console.log('\n📋 Checking RLS Policies...\n');

    const policies = await sql`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    if (policies.length === 0) {
      console.log('⚠️  No RLS policies found.');
    } else {
      console.log(`Found ${policies.length} RLS policies:\n`);

      for (const policy of policies) {
        console.log(`Table: ${policy.tablename}`);
        console.log(`  Policy: ${policy.policyname}`);
        console.log(`  Command: ${policy.cmd}`);
        console.log(`  Roles: ${policy.roles.join(', ')}`);
        console.log();
      }
    }

  } catch (error) {
    console.error('❌ Error checking RLS status:', error);
    process.exit(1);
  }
}

checkRLSStatus();
