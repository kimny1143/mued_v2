import { createClient } from '@supabase/supabase-js';

// サービスロール（管理者権限）を使用するSupabaseクライアント
// 機密性の高い操作や管理者権限が必要な操作で使用する

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL 環境変数が設定されていません');
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 環境変数が設定されていません');
  console.error('利用可能な環境変数:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY 環境変数が不足しています');
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export { supabaseAdmin }; 