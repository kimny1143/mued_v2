import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { normalizeRoleName } from '@/lib/role-utils';

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
      .select(`
        id, 
        email, 
        name, 
        role_id,
        roles (
          name
        )
      `)
      .eq('id', user.id)
      .single();
    
    if (userError || !userData) {
      console.error('[getServerSession] Failed to fetch user data:', userError);
      return null;
    }
    
    // ロール名を正規化して取得
    const roleName = normalizeRoleName(userData.roles?.name);
    
    console.log('[getServerSession] User found:', userData.email, 'Role:', roleName, '(Original:', userData.roles?.name, ')');
    
    return {
      user: {
        id: userData.id,
        email: userData.email || '',
        name: userData.name || userData.email?.split('@')[0] || ''
      },
      role: roleName
    };
  } catch (error) {
    console.error('[getServerSession] Error:', error);
    return null;
  }
});