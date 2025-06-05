import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('🧪 テストエンドポイント呼び出し成功');
  
  return NextResponse.json({
    message: 'テストエンドポイント正常動作',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    }
  });
} 