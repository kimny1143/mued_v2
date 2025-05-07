import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Prisma } from '../../../src/generated/prisma';

// 予約ステータスの列挙型
enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// 支払いステータスの列挙型
enum PaymentStatus {
  UNPAID = 'UNPAID',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

// 予約一覧を取得
export async function GET(request: NextRequest) {
  try {
    // JWTトークンからユーザー情報を取得
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const slotId = searchParams.get('slotId');
    
    // クエリ条件を構築
    const where: Prisma.ReservationWhereInput = {};
    
    // 教師（メンター）は自分の全予約を、生徒は自分の予約のみを見られる
    if (token.role === 'mentor') {
      where.slot = {
        teacherId: token.sub,
      };
    } else if (token.role === 'admin') {
      // 管理者は全ての予約を閲覧可能
    } else {
      // 生徒は自分の予約のみ閲覧可能
      where.studentId = token.sub;
    }
    
    if (status && Object.values(ReservationStatus).includes(status as ReservationStatus)) {
      where.status = status as ReservationStatus;
    }
    
    if (slotId) {
      where.slotId = slotId;
    }
    
    // データベースから予約を取得
    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        slot: {
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
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        slot: {
          startTime: 'asc',
        },
      },
    });
    
    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: '予約の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 新しい予約を作成
export async function POST(request: NextRequest) {
  try {
    // JWTトークンからユーザー情報を取得
    const token = await getToken({ req: request });
    
    if (!token) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const data = await request.json();
    
    // 入力検証
    if (!data.slotId) {
      return NextResponse.json(
        { error: 'レッスン枠IDは必須です' },
        { status: 400 }
      );
    }
    
    // スロットが存在するか確認
    const slot = await prisma.lessonSlot.findUnique({
      where: { id: data.slotId },
      include: {
        reservations: {
          where: {
            status: {
              in: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            },
          },
        },
      },
    });
    
    if (!slot) {
      return NextResponse.json(
        { error: '指定されたレッスン枠が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // スロットが利用可能か確認
    if (!slot.isAvailable) {
      return NextResponse.json(
        { error: 'このレッスン枠は現在予約できません' },
        { status: 409 }
      );
    }
    
    // すでに予約が存在するか確認
    if (slot.reservations.length > 0) {
      return NextResponse.json(
        { error: 'このレッスン枠は既に予約されています' },
        { status: 409 }
      );
    }
    
    // レッスン枠が過去のものでないことを確認
    if (new Date(slot.startTime) < new Date()) {
      return NextResponse.json(
        { error: '過去のレッスン枠は予約できません' },
        { status: 400 }
      );
    }
    
    // 自分自身のレッスン枠は予約できない（講師が自分のレッスンを予約するケース）
    if (token.sub === slot.teacherId) {
      return NextResponse.json(
        { error: '自分自身のレッスン枠は予約できません' },
        { status: 400 }
      );
    }
    
    // 予約を作成
    const newReservation = await prisma.reservation.create({
      data: {
        slotId: data.slotId,
        studentId: token.sub as string,
        status: ReservationStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        notes: data.notes,
      },
      include: {
        slot: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json(newReservation, { status: 201 });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: '予約の作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 