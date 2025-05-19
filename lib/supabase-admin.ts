import { createClient } from '@supabase/supabase-js';

// サービスロール（管理者権限）を使用するSupabaseクライアント
// 機密性の高い操作や管理者権限が必要な操作で使用する

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('❌ Supabase admin 環境変数が不足しています');
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export { supabaseAdmin }; 