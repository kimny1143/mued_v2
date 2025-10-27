import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

pool.on('connect', () => {
  console.log('Connected to database');
});

try {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  console.log('\nTables in database:');
  console.log('==================');
  result.rows.forEach(row => {
    console.log('- ' + row.table_name);
  });

  // Check if webhook_events exists
  const webhookEventsExists = result.rows.some(row => row.table_name === 'webhook_events');
  console.log('\nwebhook_events table exists:', webhookEventsExists);

  await pool.end();
  process.exit(0);
} catch (error) {
  console.error('Error:', error);
  await pool.end();
  process.exit(1);
}
