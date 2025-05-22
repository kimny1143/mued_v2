import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseISO, isValid, isBefore } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: { mentorId: string } }
) {
  try {
    const { mentorId } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // クエリパラメータから日付範囲を取得
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    // 日付バリデーション
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: '開始日と終了日の両方を指定してください (from, to)' },
        { status: 400 }
      );
    }
    
    const fromDate = parseISO(fromParam);
    const toDate = parseISO(toParam);
    
    if (!isValid(fromDate) || !isValid(toDate)) {
      return NextResponse.json(
        { error: '無効な日付形式です。YYYY-MM-DD形式で指定してください。' },
        { status: 400 }
      );
    }
    
    if (isBefore(toDate, fromDate)) {
      return NextResponse.json(
        { error: '終了日は開始日より後である必要があります。' },
        { status: 400 }
      );
    }
    
    // mentorIdがUUIDの有効な形式かチェック（簡易的なバリデーション）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(mentorId)) {
      return NextResponse.json(
        { error: '無効なメンターIDです。' },
        { status: 400 }
      );
    }
    
    // 指定されたメンターの予約可能枠を取得
    const lessonSlots = await prisma.lessonSlot.findMany({
      where: {
        teacherId: mentorId,
        startTime: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        reservations: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    
    // クライアントに返すデータ形式に変換
    const formattedSlots = lessonSlots.map(slot => ({
      id: slot.id,
      mentorId: slot.teacherId,
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      isBooked: Boolean(slot.reservations.length > 0 && slot.reservations.some(r => r.status !== 'CANCELED')),
    }));
    
    return NextResponse.json(formattedSlots);
    
  } catch (error) {
    console.error('Error fetching mentor lesson slots:', error);
    return NextResponse.json(
      { error: 'メンターの予約可能枠取得中にエラーが発生しました。' },
      { status: 500 }
    );
  }
} 