import { NextResponse } from 'next/server';

/**
 * デバッグ用: 環境変数の状態を確認するAPI
 * このAPIは開発環境でのみ使用し、本番環境では無効化すべきです
 * セキュリティのため、変数名のみを表示し、値は表示しません
 */
export async function GET(req: Request) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '本番環境では利用できません' }, { status: 403 });
  }

  try {
    // 環境変数のリストを取得（値は表示しない）
    const envVars = Object.keys(process.env)
      .sort()
      .reduce((acc, key) => {
        // 変数の存在と長さのみを表示
        const value = process.env[key] || '';
        acc[key] = {
          exists: true,
          length: value.length,
          isEmpty: value.length === 0,
          preview: key.includes('SECRET') || key.includes('KEY') || key.includes('TOKEN') 
            ? '***' 
            : (value.length > 3 ? value.substring(0, 3) + '...' : value)
        };
        return acc;
      }, {} as Record<string, { exists: boolean; length: number; isEmpty: boolean; preview: string }>);

    // 特定の重要な環境変数の存在をチェック
    const criticalVars = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasSupabaseServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
      hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      nodeEnv: process.env.NODE_ENV,
      isDocker: process.env.IS_DOCKER === 'true'
    };

    return NextResponse.json({
      message: '環境変数の状態',
      criticalVars,
      allVars: envVars
    });
  } catch (error) {
    console.error('API処理エラー:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 