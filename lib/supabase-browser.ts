// lib/supabase-browser.ts 
'use client';

import { createBrowserClient } from '@supabase/ssr';

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  // ↓ 型キャストで「ビルド時に必ず文字列になる」ことを保証
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);