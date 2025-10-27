import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

try {
  // 最新の予約を取得
  const result = await pool.query(`
    SELECT
      id,
      student_id,
      status,
      payment_status,
      amount,
      stripe_session_id,
      stripe_payment_intent_id,
      created_at,
      updated_at
    FROM reservations
    ORDER BY created_at DESC
    LIMIT 3
  `);

  console.log('\n最新の予約データ:');
  console.log('==================\n');

  result.rows.forEach((row, index) => {
    console.log(`予約 ${index + 1}:`);
    console.log(`  ID: ${row.id}`);
    console.log(`  Status: ${row.status}`);
    console.log(`  Payment Status: ${row.payment_status}`);
    console.log(`  Amount: ${row.amount}`);
    console.log(`  Stripe Session ID: ${row.stripe_session_id ? row.stripe_session_id.substring(0, 20) + '...' : 'null'}`);
    console.log(`  Stripe Payment Intent ID: ${row.stripe_payment_intent_id ? row.stripe_payment_intent_id.substring(0, 20) + '...' : 'null'}`);
    console.log(`  Created: ${row.created_at}`);
    console.log(`  Updated: ${row.updated_at}`);
    console.log('');
  });

  await pool.end();
  process.exit(0);
} catch (error) {
  console.error('Error:', error);
  await pool.end();
  process.exit(1);
}
