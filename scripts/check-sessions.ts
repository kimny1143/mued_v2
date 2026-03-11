import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL as string);

async function main() {
  const sessions = await sql`SELECT s.id, s.mode, s.mastering_mode, s.status, s.payment_status, count(t.id) as track_count FROM dial_sessions s LEFT JOIN dial_tracks t ON t.session_id = s.id GROUP BY s.id ORDER BY s.created_at DESC LIMIT 5`;
  for (const s of sessions) {
    console.log(`${s.id} mode=${s.mode} master=${s.mastering_mode} status=${s.status} pay=${s.payment_status} tracks=${s.track_count}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
