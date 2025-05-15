import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    // URLからユーザーIDを取得
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが指定されていません' }, 
        { status: 400 }
      );
    }
    
    console.log(`ユーザー情報取得 API: ID=${userId}`);
    
    // Supabase Admin権限でユーザー情報を取得
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, roleId, image')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('ユーザー情報取得エラー:', error);
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' }, 
        { status: 500 }
      );
    }
    
    if (!data) {
      console.log('ユーザーが見つかりません');
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' }, 
        { status: 404 }
      );
    }
    
    console.log(`ユーザー情報取得成功: ${data.name || data.email}`);
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('ユーザー情報取得API エラー:', err);
    return NextResponse.json(
      { error: '内部サーバーエラー' }, 
      { status: 500 }
    );
  }
} 