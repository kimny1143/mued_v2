import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkTables() {
  console.log('📊 Checking all tables in database...\n');

  const result = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  console.log(`Tables found: ${result.rows.length}\n`);
  result.rows.forEach((row: any) => {
    console.log('  -', row.table_name);
  });

  // Check materials table specifically
  console.log('\n📦 Checking materials table...');
  const materialsCount = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM materials;
  `).catch(err => {
    console.log('❌ Error accessing materials table:', err.message);
    return null;
  });

  if (materialsCount) {
    console.log('✅ Materials count:', materialsCount.rows[0].count);
  }

  // Check users table
  console.log('\n👥 Checking users table...');
  const usersCount = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM users;
  `).catch(err => {
    console.log('❌ Error accessing users table:', err.message);
    return null;
  });

  if (usersCount) {
    console.log('✅ Users count:', usersCount.rows[0].count);
  }

  process.exit(0);
}

checkTables().catch(console.error);
