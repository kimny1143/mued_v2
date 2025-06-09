import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { createCheckoutSession } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils/url';

// 利用するStripe価格ID（単発レッスン）
const LESSON_PRICE_ID: string | undefined = process.env.NEXT_PUBLIC_LESSON_PRICE_ID;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { lessonSlotId } = await req.json();

    if (!lessonSlotId) {
      return NextResponse.json({ error: 'レッスン枠IDが必要です' }, { status: 400 });
    }

    // 認証 (Cookie / Authorization)
    const sessionInfo = await getSessionFromRequest(req);
    if (!sessionInfo) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Prisma でスロット取得 & 可用性チェック
    const slot = await prisma.lesson_slots.findUnique({
      where: { id: lessonSlotId },
      include: {
        users: true,
        reservations: true,
      },
    });

    if (!slot) {
      return NextResponse.json({ error: 'レッスン枠が見つかりません' }, { status: 404 });
    }

    if (!slot.is_available || slot.reservations.length > 0) {
      return NextResponse.json({ error: 'このレッスン枠は予約できません' }, { status: 409 });
    }

    const baseUrl = getBaseUrl(req);
    const lessonDate = new Date(slot.start_time).toLocaleString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    // Price ID 未設定チェック
    if (!LESSON_PRICE_ID) {
      return NextResponse.json({ error: 'Stripe Price ID が設定されていません' }, { status: 500 });
    }

    // Stripe セッション（登録済み Price ID 使用）
    const session = await createCheckoutSession({
      priceId: LESSON_PRICE_ID,
      successUrl: `${baseUrl}/dashboard/lessons?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/dashboard/lessons?cancelled=true`,
      metadata: {
        slot_d: slot.id,
        studentId: sessionInfo.user.id,
        teacherId: slot.teacher_id,
        startTime: slot.start_time.toISOString(),
        endTime: slot.end_time.toISOString(),
      },
      clientReferenceId: `${slot.id}:${sessionInfo.user.id}`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json({ error: 'チェックアウトセッション作成失敗' }, { status: 500 });
  }
} 