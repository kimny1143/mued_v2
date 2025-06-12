import { NextRequest, NextResponse } from 'next/server';


import { convertLessonSlotRequestToDb } from '@/lib/caseConverter';
import { hasPermission, normalizeRoleName } from '@/lib/role-utils';
import { getSessionFromRequest } from '@/lib/session';

import { prisma } from '../../../../lib/prisma';

// データベースの時刻文字列をUTCとして解釈するヘルパー関数
function ensureUTCTimestamp(timestamp: Date | string | null): string | null {
  if (!timestamp) return null;
  const timestampStr = timestamp instanceof Date ? timestamp.toISOString() : timestamp.toString();
  // タイムゾーン指定がない場合、Zサフィックスを追加してUTCとして扱う
  if (timestampStr && !timestampStr.endsWith('Z') && !timestampStr.includes('+') && !timestampStr.includes('-')) {
    return timestampStr + 'Z';
  }
  return timestampStr;
}

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
    
    // フロントエンドが期待するキャメルケース形式に変換
    const formattedSlot = {
      id: slot.id,
      teacherId: slot.teacher_id,               // teacher_id → teacherId
      startTime: ensureUTCTimestamp(slot.start_time),  // UTC時刻として解釈
      endTime: ensureUTCTimestamp(slot.end_time),      // UTC時刻として解釈
      hourlyRate: slot.hourly_rate,             // hourly_rate → hourlyRate
      currency: slot.currency,
      minHours: slot.min_hours,                 // min_hours → minHours
      maxHours: slot.max_hours,                 // max_hours → maxHours
      isAvailable: slot.is_available,           // is_available → isAvailable
      createdAt: ensureUTCTimestamp(slot.created_at),  // UTC時刻として解釈
      updatedAt: ensureUTCTimestamp(slot.updated_at),  // UTC時刻として解釈
      minDuration: slot.min_duration,           // min_duration → minDuration
      maxDuration: slot.max_duration,           // max_duration → maxDuration
      teacher: slot.users,
      reservations: slot.reservations.map(reservation => ({
        id: reservation.id,
        slotId: reservation.slot_id,            // slot_id → slotId
        studentId: reservation.student_id,      // student_id → studentId
        status: reservation.status,
        paymentId: reservation.payment_id,      // payment_id → paymentId
        bookedStartTime: ensureUTCTimestamp(reservation.booked_start_time),  // UTC時刻として解釈
        bookedEndTime: ensureUTCTimestamp(reservation.booked_end_time),      // UTC時刻として解釈
        hoursBooked: reservation.hours_booked,  // hours_booked → hoursBooked
        totalAmount: reservation.total_amount,  // total_amount → totalAmount
        notes: reservation.notes,
        createdAt: ensureUTCTimestamp(reservation.created_at),  // UTC時刻として解釈
        updatedAt: ensureUTCTimestamp(reservation.updated_at),  // UTC時刻として解釈
        durationMinutes: reservation.duration_minutes  // duration_minutes → durationMinutes
      }))
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
    
    // スロットが存在するか確認（予約情報も含めて取得）
    const existingSlot = await prisma.lesson_slots.findUnique({
      where: { id },
      include: {
        reservations: {
          where: {
            status: {
              in: ['PENDING_APPROVAL', 'APPROVED', 'CONFIRMED']
            }
          },
          orderBy: [
            { booked_start_time: 'asc' },
            { booked_end_time: 'asc' }
          ]
        }
      }
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
    
    // 権限チェック：講師本人またはアドミンのみ更新可能（role-utilsを使用）
    const normalizedRole = normalizeRoleName(sessionInfo.role);
    const hasAdminPermission = hasPermission(sessionInfo.role || '', 'admin');
    const isOwner = sessionInfo.user.id === existingSlot.teacher_id;
    
    console.log('🔍 スロット更新権限チェック (role-utils):', {
      originalRole: sessionInfo.role,
      normalizedRole,
      hasAdminPermission,
      isOwner,
      canUpdate: hasAdminPermission || isOwner
    });
    
    if (!hasAdminPermission && !isOwner) {
      return NextResponse.json(
        { error: 'このレッスン枠を更新する権限がありません' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // ユーティリティ関数を使用してデータベース用に変換
    const updateData = convertLessonSlotRequestToDb(data) as LessonSlotUpdateData;
    
    // 開始時間と終了時間の両方が指定された場合、時間の妥当性を検証
    if (updateData.start_time && updateData.end_time) {
      if (updateData.start_time >= updateData.end_time) {
        return NextResponse.json(
          { error: '開始時間は終了時間より前である必要があります' },
          { status: 400 }
        );
      }
    }
    
    // 予約がある場合の時間変更制約をチェック
    if (existingSlot.reservations.length > 0 && (updateData.start_time || updateData.end_time)) {
      const newStartTime = updateData.start_time || existingSlot.start_time;
      const newEndTime = updateData.end_time || existingSlot.end_time;
      
      // 最も早い予約開始時刻と最も遅い予約終了時刻を取得
      const earliestBookingStart = existingSlot.reservations[0].booked_start_time;
      const latestBookingEnd = existingSlot.reservations.reduce((latest, res) => {
        return res.booked_end_time && res.booked_end_time > latest ? res.booked_end_time : latest;
      }, existingSlot.reservations[0].booked_end_time!);
      
      // 新しいスロット時間が既存の予約を含むかチェック
      if (newStartTime > earliestBookingStart) {
        return NextResponse.json(
          { error: `既存の予約（${new Date(earliestBookingStart).toLocaleString('ja-JP')}開始）があるため、開始時刻をそれより後に変更できません` },
          { status: 400 }
        );
      }
      
      if (newEndTime < latestBookingEnd) {
        return NextResponse.json(
          { error: `既存の予約（${new Date(latestBookingEnd).toLocaleString('ja-JP')}終了）があるため、終了時刻をそれより前に変更できません` },
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
    
    // レスポンスもキャメルケース形式に変換
    const responseSlot = {
      id: updatedSlot.id,
      teacherId: updatedSlot.teacher_id,           // teacher_id → teacherId
      startTime: ensureUTCTimestamp(updatedSlot.start_time),  // UTC時刻として解釈
      endTime: ensureUTCTimestamp(updatedSlot.end_time),      // UTC時刻として解釈
      hourlyRate: updatedSlot.hourly_rate,         // hourly_rate → hourlyRate
      currency: updatedSlot.currency,
      minHours: updatedSlot.min_hours,             // min_hours → minHours
      maxHours: updatedSlot.max_hours,             // max_hours → maxHours
      minDuration: updatedSlot.min_duration,       // min_duration → minDuration
      maxDuration: updatedSlot.max_duration,       // max_duration → maxDuration
      isAvailable: updatedSlot.is_available,       // is_available → isAvailable
      createdAt: ensureUTCTimestamp(updatedSlot.created_at),  // UTC時刻として解釈
      updatedAt: ensureUTCTimestamp(updatedSlot.updated_at)   // UTC時刻として解釈
    };
    
    return NextResponse.json(responseSlot);
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
    
    // 権限チェック：講師本人またはアドミンのみ削除可能（role-utilsを使用）
    const normalizedRole = normalizeRoleName(sessionInfo.role);
    const hasAdminPermission = hasPermission(sessionInfo.role || '', 'admin');
    const isOwner = sessionInfo.user.id === existingSlot.teacher_id;
    
    console.log('🔍 スロット削除権限チェック (role-utils):', {
      originalRole: sessionInfo.role,
      normalizedRole,
      hasAdminPermission,
      isOwner,
      canDelete: hasAdminPermission || isOwner
    });
    
    if (!hasAdminPermission && !isOwner) {
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