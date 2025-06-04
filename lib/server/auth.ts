import { supabaseServer } from '@/lib/supabase-server';
import { cache } from 'react';

export const getServerSession = cache(async () => {
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return {
      user: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || ''
      }
    };
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }
});