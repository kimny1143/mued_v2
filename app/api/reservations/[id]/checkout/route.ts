import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 🚨 このAPIルートは廃止されました
  // 新しいSetup Intentフローを使用してください: /api/reservations/[id]/setup-payment
  return NextResponse.json({
    error: 'このAPIルートは廃止されました。新しいSetup Intentフローを使用してください。',
    newEndpoint: '/api/reservations/[id]/setup-payment',
    reason: 'Setup Intentによる段階的決済フローに移行しました',
    migration: {
      oldFlow: '即座決済（予約時点で決済実行）',
      newFlow: 'Setup Intent（カード情報登録 → メンター承認 → 自動決済）',
      benefits: [
        'メンター承認前の誤課金を防止',
        'キャンセル処理の簡素化',
        'より安全な決済フロー'
      ]
    }
  }, { status: 410 }); // 410 Gone
} 