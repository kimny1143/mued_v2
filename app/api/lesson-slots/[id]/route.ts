import { prisma } from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

// 更新データの型を定義（Prismaスキーマに合わせてスネークケース）
type LessonSlotUpdateData = {
  start_time?: Date;
  end_time?: Date;
  is_available?: boolean;
  hourly_rate?: number;
  currency?: string;
  min_hours?: number;
  max_hours?: number | null;
  min_duration?: number;
  max_duration?: number | null;
};

// 特定のレッスンスロットを取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const slot = await prisma.lesson_slots.findUnique({
      where: { id },
      include: {
          users: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        reservations: true,
      },
    });
    
    if (!slot) {
      return NextResponse.json(
        { error: '指定されたレッスン枠が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // フロントエンドが期待するteacher形式に変換
    const formattedSlot = {
      ...slot,
      teacher: slot.users
    };
    
    return NextResponse.json(formattedSlot);
  } catch (error) {
    console.error('Error fetching lesson slot:', error);
    return NextResponse.json(
      { error: 'レッスン枠の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// レッスンスロットを更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const sessionInfo = await getSessionFromRequest(request);
    
    // スロットが存在するか確認
    const existingSlot = await prisma.lesson_slots.findUnique({
      where: { id },
    });
    
    if (!existingSlot) {
      return NextResponse.json(
        { error: '指定されたレッスン枠が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 認証チェック
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // 権限チェック：講師本人またはアドミンのみ更新可能
    if (sessionInfo.role !== 'admin' && sessionInfo.user.id !== existingSlot.teacher_id) {
      return NextResponse.json(
        { error: 'このレッスン枠を更新する権限がありません' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 更新可能なフィールドを検証
    const updateData: LessonSlotUpdateData = {};
    
    if (data.startTime) updateData.start_time = new Date(data.startTime);
    if (data.endTime) updateData.end_time = new Date(data.endTime);
    if (data.isAvailable !== undefined) updateData.is_available = Boolean(data.isAvailable);
    if (data.hourlyRate !== undefined) updateData.hourly_rate = parseInt(data.hourlyRate, 10);
    if (data.currency) updateData.currency = data.currency;
    if (data.minHours !== undefined) {
      updateData.min_hours = parseInt(data.minHours, 10);
      updateData.min_duration = parseInt(data.minHours, 10) * 60; // 時間を分に変換
    }
    if (data.maxHours !== undefined) {
      updateData.max_hours = data.maxHours !== null ? parseInt(data.maxHours, 10) : null;
      updateData.max_duration = data.maxHours !== null ? parseInt(data.maxHours, 10) * 60 : null; // 時間を分に変換
    }
    
    // 開始時間と終了時間の両方が指定された場合、時間の妥当性を検証
    if (updateData.start_time && updateData.end_time) {
      if (updateData.start_time >= updateData.end_time) {
        return NextResponse.json(
          { error: '開始時間は終了時間より前である必要があります' },
          { status: 400 }
        );
      }
    }
    
    // スロットの重複をチェック
    if (updateData.start_time || updateData.end_time) {
      const startTime = updateData.start_time || existingSlot.start_time;
      const endTime = updateData.end_time || existingSlot.end_time;
      
      const overlappingSlot = await prisma.lesson_slots.findFirst({
        where: {
          id: { not: id },
          teacher_id: existingSlot.teacher_id,
          OR: [
            {
              start_time: { lte: startTime },
              end_time: { gt: startTime },
            },
            {
              start_time: { lt: endTime },
              end_time: { gte: endTime },
            },
            {
              start_time: { gte: startTime },
              end_time: { lte: endTime },
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
    }
    
    // スロットを更新
    const updatedSlot = await prisma.lesson_slots.update({
      where: { id },
      data: updateData,
    });
    
    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Error updating lesson slot:', error);
    return NextResponse.json(
      { error: 'レッスン枠の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// レッスンスロットを削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const sessionInfo = await getSessionFromRequest(request);
    
    // スロットが存在するか確認
    const existingSlot = await prisma.lesson_slots.findUnique({
      where: { id },
      include: {
        reservations: true,
      },
    });
    
    if (!existingSlot) {
      return NextResponse.json(
        { error: '指定されたレッスン枠が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 認証チェック
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // 権限チェック：講師本人またはアドミンのみ削除可能
    if (sessionInfo.role !== 'admin' && sessionInfo.user.id !== existingSlot.teacher_id) {
      return NextResponse.json(
        { error: 'このレッスン枠を削除する権限がありません' },
        { status: 403 }
      );
    }
    
    // 予約が存在する場合は削除できない
    if (existingSlot.reservations.length > 0) {
      return NextResponse.json(
        { error: 'このレッスン枠には既に予約が存在するため削除できません' },
        { status: 409 }
      );
    }
    
    // スロットを削除
    await prisma.lesson_slots.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting lesson slot:', error);
    return NextResponse.json(
      { error: 'レッスン枠の削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 