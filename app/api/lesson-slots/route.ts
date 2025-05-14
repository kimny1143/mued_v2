import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

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
  console.log("レッスンスロットAPI呼び出し - URL:", request.url);
  
  try {
    // データベース接続テスト
    try {
      // 簡単なクエリでDB接続をテスト
      await prisma.$queryRaw`SELECT 1 as connection_test`;
      console.log("データベース接続テスト: 成功");
    } catch (dbError) {
      console.error("データベース接続テスト: 失敗", dbError);
      return NextResponse.json({ 
        error: "データベース接続エラー", 
        details: dbError instanceof Error ? dbError.message : "不明なエラー",
        database_url: process.env.DATABASE_URL ? "設定済み (形式非表示)" : "未設定",
        connection_type: process.env.DATABASE_URL?.includes("pooler.supabase.com") 
          ? "Transaction Pooler" : "Direct Connection"
      }, { status: 500 });
    }
    
    // セッション情報を取得（デバッグ用）
    const sessionInfo = await getSessionFromRequest(request);
    console.log("API - 認証状態:", sessionInfo ? "認証済み" : "未認証", 
      sessionInfo?.user?.email || "メール情報なし");
    
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log("API - クエリパラメータ:", { teacherId, startDate, endDate });
    
    // クエリ条件を構築
    const where: LessonSlotWhereInput = {};
    
    if (teacherId) {
      where.teacherId = teacherId;
    }
    
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    console.log("API - クエリ条件:", JSON.stringify(where));
    
    // データベースからスロットを取得
    const slots = await prisma.lessonSlot.findMany({
      where,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    console.log(`API - 取得結果: ${slots.length}件のスロット`);
    
    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching lesson slots:', error);
    // エラー詳細をレスポンスに含める
    return NextResponse.json(
      { 
        error: '時間枠の取得中にエラーが発生しました', 
        details: String(error),
        stack: error instanceof Error ? error.stack : undefined 
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