import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function rollbackPhase2() {
  console.log('🔄 Rolling back Phase 2 migrations...\n');

  try {
    // Read rollback script
    const rollbackSQL = readFileSync(
      join(process.cwd(), 'db/migrations/rollback_0006_add_rag_metrics.sql'),
      'utf-8'
    );

    // Execute rollback using query() method
    await sql.query(rollbackSQL, []);

    console.log('✅ Phase 2 migrations rolled back successfully!');
    console.log('\nYou can now re-run the migrations with: npm run db:migrate:phase2');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

rollbackPhase2();
