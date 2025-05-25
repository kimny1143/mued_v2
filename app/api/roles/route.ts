import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('ロール情報取得API呼び出し');
    
    // rolesテーブルから全ロール情報を取得
    const { data: roles, error } = await supabaseAdmin
      .from('roles')
      .select('id, name, description')
      .order('name');
    
    if (error) {
      console.error('ロール情報取得エラー:', error);
      return NextResponse.json(
        { error: 'ロール情報の取得に失敗しました' },
        { status: 500 }
      );
    }
    
    console.log('取得したロール情報:', roles);
    
    return NextResponse.json(roles || []);
  } catch (err) {
    console.error('ロール情報取得API エラー:', err);
    return NextResponse.json(
      { error: '内部サーバーエラー', details: String(err) },
      { status: 500 }
    );
  }
} 