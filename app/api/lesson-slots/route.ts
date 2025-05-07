import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
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
    
    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching lesson slots:', error);
    return NextResponse.json(
      { error: '時間枠の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 新しいレッスンスロットを作成
export async function POST(request: NextRequest) {
  try {
    // JWTトークンからユーザー情報を取得
    const token = await getToken({ req: request });
    
    if (!token || token.role !== 'mentor') {
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
        teacherId: token.sub,
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
        teacherId: token.sub as string,
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