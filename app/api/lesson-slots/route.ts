import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { stripe } from '@/lib/stripe';

// Stripeから単体レッスン価格を取得する関数
async function getSingleLessonPrice() {
  try {
    // 単体レッスン用の価格ID
    const LESSON_PRICE_ID = 'price_1ROXvxRYtspYtD2zVhMlsy6M';
    
    // 価格情報を取得
    const price = await stripe.prices.retrieve(LESSON_PRICE_ID);
    
    return {
      priceId: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      productId: typeof price.product === 'string' ? price.product : price.product?.id
    };
  } catch (error) {
    console.error('単体レッスン価格取得エラー:', error);
    // エラー時はデフォルト値を返す
    return {
      priceId: 'price_1ROXvxRYtspYtD2zVhMlsy6M',
      unitAmount: 5000, // 50ドル = 5000セント
      currency: 'usd',
      productId: 'prod_test_singlelesson'
    };
  }
}

// WhereInputの型を定義
type LessonSlotWhereInput = {
  teacherId?: string;
  startTime?: {
    gte?: Date;
    lte?: Date;
  };
};

// レッスンスロット一覧を取得
export async function GET(request: NextRequest) {
  try {
    // セッション情報を取得
    const sessionInfo = await getSessionFromRequest(request);
    
    console.log("認証状態:", sessionInfo ? "認証済み" : "未認証", 
                sessionInfo?.user?.email || "メール情報なし");
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // 現在以降の利用可能なレッスン枠を取得
    const lessonSlots = await prisma.lessonSlot.findMany({
      where: {
        startTime: {
          gte: new Date(), // 現在時刻以降
        },
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        // 予約情報も取得
        reservations: {
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            studentId: true,
          }
        }
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    // Stripeから単体レッスン価格を取得
    const priceInfo = await getSingleLessonPrice();
    
    // レスポンスデータを整形
    const formattedSlots = lessonSlots.map(slot => ({
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      teacherId: slot.teacherId,
      teacher: slot.teacher ? {
        id: slot.teacher.id,
        name: slot.teacher.name,
        image: slot.teacher.image,
      } : null,
      mentorName: slot.teacher?.name || undefined,
      isAvailable: slot.isAvailable,
      // Stripe価格情報を追加
      price: priceInfo.unitAmount,
      currency: priceInfo.currency,
      priceId: priceInfo.priceId,
      // 予約情報
      reservations: slot.reservations,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
    }));

    return NextResponse.json(formattedSlots);
  } catch (error) {
    console.error("レッスンスロット取得エラー:", error);
    
    return NextResponse.json(
      { 
        error: 'レッスンスロットの取得中にエラーが発生しました', 
        details: error instanceof Error ? error.message : String(error),
        database_url: process.env.DATABASE_URL ? '設定済み (形式非表示)' : '未設定',
      },
      { status: 500 }
    );
  }
}

// 新しいレッスンスロットを作成
export async function POST(request: NextRequest) {
  try {
    // セッション情報を取得
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // 権限チェック
    if (sessionInfo.role !== 'mentor') {
      return NextResponse.json(
        { error: '講師のみがレッスン枠を作成できます' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 入力検証
    if (!data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: '開始時間と終了時間は必須です' },
        { status: 400 }
      );
    }
    
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    
    // 開始時間が終了時間より前であることを確認
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: '開始時間は終了時間より前である必要があります' },
        { status: 400 }
      );
    }
    
    // スロットの重複をチェック
    const overlappingSlot = await prisma.lessonSlot.findFirst({
      where: {
        teacherId: sessionInfo.user.id,
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });
    
    if (overlappingSlot) {
      return NextResponse.json(
        { error: '指定された時間帯に重複するスロットが存在します' },
        { status: 409 }
      );
    }
    
    // 新しいスロットを作成
    const newSlot = await prisma.lessonSlot.create({
      data: {
        teacherId: sessionInfo.user.id,
        startTime,
        endTime,
        isAvailable: data.isAvailable ?? true,
      },
    });
    
    return NextResponse.json(newSlot, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson slot:', error);
    return NextResponse.json(
      { error: 'レッスン枠の作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 