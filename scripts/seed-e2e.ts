// E2E Seed Script (Supabase)
// -------------------------------------------------
// 開発者が手元 or CI で `npm run seed:e2e` を実行すると、
// Supabase にテスト用データ（レッスンスロットなど）が投入されます。
// 現在は型とインサート例だけ書いておき、本実装は TODO とします。
// -------------------------------------------------
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !serviceRoleKey) {
  console.error('Supabase env が不足しています');
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  // 例: lesson_slots テーブルにダミー枠を 1 件
  await admin.from('lesson_slots').insert([
    {
      id: 'seed-slot-001',
      mentor_id: 'e2e_mentor',
      start_time: new Date(Date.now() + 3600_000).toISOString(),
      end_time: new Date(Date.now() + 7200_000).toISOString(),
      capacity: 1,
    },
  ]);

  console.log('E2E seed 完了');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 