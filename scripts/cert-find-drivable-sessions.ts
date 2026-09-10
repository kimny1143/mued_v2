#!/usr/bin/env tsx
/** READ-ONLY: find candidate test/free-campaign sessions drivable for 60pt cert E2E shakeout. */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const rows = await sql`
    SELECT s.id, left(s.title, 24) AS title, s.payment_status, s.is_free_campaign,
           s.mode, s.mastering_mode, s.status, s.state,
           s.base_cycle_limit, s.additional_cycle_limit, s.additional_cycles_purchased, s.paid_cycle_count,
           s.guest_token IS NULL AS guest_null, s.user_id IS NULL AS user_null,
           s.created_at,
           (SELECT count(*) FROM dial_tracks t WHERE t.session_id = s.id) AS tracks,
           (SELECT count(*) FROM dial_messages m WHERE m.session_id = s.id) AS msgs,
           (SELECT count(*) FROM dial_tasks t WHERE t.session_id = s.id) AS tasks
    FROM dial_sessions s
    WHERE (s.is_free_campaign = true OR s.title ILIKE '%test%' OR s.payment_status = 'paid')
    ORDER BY s.created_at DESC
    LIMIT 20`;
  console.log(JSON.stringify(rows, null, 2));
  const total = await sql`SELECT count(*)::int AS n, max(created_at) AS latest FROM dial_sessions`;
  console.log('TOTAL sessions:', JSON.stringify(total));
}
main().then(() => process.exit(0)).catch((e) => { console.error('ERR', e.message); process.exit(1); });
