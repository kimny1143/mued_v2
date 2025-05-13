import { createClient } from '@supabase/supabase-js';

/**
 * サービスロール（管理者権限）を使用するSupabaseクライアント
 * このクライアントは機密性の高い操作や管理者権限が必要な操作で使用します
 */
export function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} 