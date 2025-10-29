import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function setAdminRole() {
  console.log('👤 Setting admin role for current user...\n');

  try {
    // Get first user
    const users = await sql`SELECT id, clerk_id, email, name FROM users LIMIT 1`;

    if (users.length === 0) {
      console.log('❌ No users found');
      process.exit(1);
    }

    const user = users[0];
    console.log(`Found user: ${user.name || user.email} (${user.clerk_id})`);

    // Update role to admin
    await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`;

    console.log('✅ Role updated to admin\n');
    console.log('You can now access the admin dashboard at:');
    console.log('http://localhost:3000/dashboard/admin/rag-metrics\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setAdminRole();
