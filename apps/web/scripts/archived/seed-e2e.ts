// E2E Seed Script (Supabase)
// -------------------------------------------------
// 開発者が手元 or CI で `npm run seed:e2e` を実行すると、
// Supabase にテスト用データ（レッスンスロットなど）が投入されます。
// -------------------------------------------------
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
  // 1. テストユーザー作成
  const mentorId = uuidv4();
  const adminId = uuidv4();
  
  await admin.from('users').insert([
    {
      id: mentorId,
      email: 'e2e_mentor@example.com',
      role: 'mentor',
      name: 'E2E Mentor',
    },
    {
      id: adminId,
      email: 'e2e_admin@example.com',
      role: 'admin',
      name: 'E2E Admin',
    },
  ]);

  // 2. レッスンスロット作成 (未来3件)
  const now = Date.now();
  const slots = [
    {
      id: uuidv4(),
      mentor_id: mentorId,
      start_time: new Date(now + 3600_000).toISOString(), // 1時間後
      end_time: new Date(now + 7200_000).toISOString(),   // 2時間後
      capacity: 1,
      status: 'available',
    },
    {
      id: uuidv4(),
      mentor_id: mentorId,
      start_time: new Date(now + 86400_000).toISOString(), // 24時間後
      end_time: new Date(now + 90000_000).toISOString(),   // 25時間後
      capacity: 2,
      status: 'available',
    },
    {
      id: uuidv4(),
      mentor_id: mentorId,
      start_time: new Date(now + 172800_000).toISOString(), // 48時間後
      end_time: new Date(now + 176400_000).toISOString(),   // 49時間後
      capacity: 1,
      status: 'available',
    },
  ];

  await admin.from('lesson_slots').insert(slots);

  console.log('✅ E2E seed 完了');
  console.log('- メンター:', 'e2e_mentor@example.com');
  console.log('- 管理者:', 'e2e_admin@example.com');
  console.log('- レッスン枠:', slots.length, '件作成');
}

main().catch((e) => {
  console.error('❌ Seed 失敗:', e);
  process.exit(1);
}); 