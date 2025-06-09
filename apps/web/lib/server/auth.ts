import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export const getServerSession = cache(async () => {
  try {
    // 通常のクライアントで認証状態を確認
    const supabase = await createClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.log('[getServerSession] No user found:', error?.message || 'No user');
      return null;
    }
    
    // サービスロールクライアントでユーザー情報を取得（RLSを回避）
    const serviceClient = createServiceClient();
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('id, email, name, role_id')
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      console.error('[getServerSession] Failed to fetch user data:', userError);
      return null;
    }
    
    console.log('[getServerSession] User found:', userData.email, 'Role:', userData.role_id);
    
    return {
      user: {
        id: userData.id,
        email: userData.email || '',
        name: userData.name || userData.email?.split('@')[0] || ''
      },
      role: userData.role_id || 'student'
    };
  } catch (error) {
    console.error('[getServerSession] Error:', error);
    return null;
  }
});