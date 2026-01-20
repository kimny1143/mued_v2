/**
 * Create hoo_conversations table
 * Run: npx tsx scripts/create-hoo-table.ts
 */

import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { db } from '../db';

// Load environment variables
config();

async function createHooTable() {
  try {
    // Check if table exists
    const checkResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'hoo_conversations'
      );
    `);

    const exists = checkResult.rows[0]?.exists;

    if (exists) {
      console.log('✅ hoo_conversations table already exists');
      return;
    }

    console.log('🔄 Creating hoo_conversations table...');

    // Create table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hoo_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),

        -- Conversation content
        title TEXT,
        messages JSONB NOT NULL DEFAULT '[]',
        message_count INTEGER NOT NULL DEFAULT 0,

        -- AI model info
        model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
        provider TEXT NOT NULL DEFAULT 'claude',

        -- Usage metrics
        total_input_tokens INTEGER NOT NULL DEFAULT 0,
        total_output_tokens INTEGER NOT NULL DEFAULT 0,
        total_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

        -- Timestamps
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Optional metadata
        summary TEXT,
        tags JSONB,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_hoo_conversations_user_id ON hoo_conversations(user_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_hoo_conversations_started_at ON hoo_conversations(started_at);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_hoo_conversations_last_message_at ON hoo_conversations(last_message_at);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_hoo_conversations_user_started ON hoo_conversations(user_id, started_at);
    `);

    console.log('✅ hoo_conversations table created successfully');

    // Verify
    const verifyResult = await db.execute(sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'hoo_conversations'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Table columns:');
    for (const row of verifyResult.rows) {
      const r = row as { column_name: string; data_type: string };
      console.log(`  - ${r.column_name}: ${r.data_type}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createHooTable();
