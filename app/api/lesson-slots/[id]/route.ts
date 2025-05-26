import { prisma } from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

// 更新データの型を定義
type LessonSlotUpdateData = {
  startTime?: Date;
  endTime?: Date;
  isAvailable?: boolean;
  hourlyRate?: number;
  currency?: string;
  minHours?: number;
  maxHours?: number | null;
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
    
    return NextResponse.json(slot);
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
    const existingSlot = await prisma.lessonSlot.findUnique({
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
    if (sessionInfo.role !== 'admin' && sessionInfo.user.id !== existingSlot.teacherId) {
      return NextResponse.json(
        { error: 'このレッスン枠を更新する権限がありません' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 更新可能なフィールドを検証
    const updateData: LessonSlotUpdateData = {};
    
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.isAvailable !== undefined) updateData.isAvailable = Boolean(data.isAvailable);
    if (data.hourlyRate !== undefined) updateData.hourlyRate = parseInt(data.hourlyRate, 10);
    if (data.currency) updateData.currency = data.currency;
    if (data.minHours !== undefined) updateData.minHours = parseInt(data.minHours, 10);
    if (data.maxHours !== undefined) updateData.maxHours = data.maxHours !== null ? parseInt(data.maxHours, 10) : null;
    
    // 開始時間と終了時間の両方が指定された場合、時間の妥当性を検証
    if (updateData.startTime && updateData.endTime) {
      if (updateData.startTime >= updateData.endTime) {
        return NextResponse.json(
          { error: '開始時間は終了時間より前である必要があります' },
          { status: 400 }
        );
      }
    }
    
    // スロットの重複をチェック
    if (updateData.startTime || updateData.endTime) {
      const startTime = updateData.startTime || existingSlot.startTime;
      const endTime = updateData.endTime || existingSlot.endTime;
      
      const overlappingSlot = await prisma.lessonSlot.findFirst({
        where: {
          id: { not: id },
          teacherId: existingSlot.teacherId,
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
    }
    
    // スロットを更新
    const updatedSlot = await prisma.lessonSlot.update({
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
    const existingSlot = await prisma.lessonSlot.findUnique({
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
    if (sessionInfo.role !== 'admin' && sessionInfo.user.id !== existingSlot.teacherId) {
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
    await prisma.lessonSlot.delete({
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