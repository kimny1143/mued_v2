import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * サブスクリプションデータを強制的に作成するための超シンプルなAPI
 * 特定のユーザーIDを対象に、データベースに直接操作を行います
 */
export async function GET(request: Request) {
  try {
    // ユーザーIDをハードコード
    const userId = "ceea27bd-e97b-43be-baaa-4ea4a8118926";

    // 管理者クライアントを初期化
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE || '',
      { auth: { persistSession: false } }
    );

    // 全ての既存サブスクリプションを削除
    const { error: deleteError } = await admin
      .from('stripe_user_subscriptions')
      .delete()
      .eq('userId', userId);

    // 現在時刻とサブスクリプション期間を設定
    const now = Math.floor(Date.now() / 1000);
    const oneMonthLater = now + 30 * 24 * 60 * 60; // 30日後
    
    // サブスクリプションデータを直接作成
    const { data, error } = await admin
      .from('stripe_user_subscriptions')
      .insert({
        userId: userId,
        customerId: `cus_manual_fix_${Date.now()}`,
        subscriptionId: `sub_manual_fix_${Date.now()}`,
        priceId: 'price_1RMJdXRYtspYtD2zESbuO5mG',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthLater
      })
      .select();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      });
    }

    return NextResponse.json({
      success: true,
      message: "サブスクリプションを強制的に作成しました",
      userId: userId,
      data: data
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: "システムエラーが発生しました",
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 