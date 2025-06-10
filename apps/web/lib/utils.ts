import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 環境に応じて正しいベースURLを取得する統一関数
 * クライアント・サーバー両方で動作する
 * 
 * @deprecated 新しい実装は lib/utils/url.ts の getBaseUrl(request) を使用してください
 */
export function getBaseUrl(): string {
  // NEXT_PUBLIC_URL を最優先（Vercel環境設定で使用）
  if (process.env.NEXT_PUBLIC_URL) {
    return process.env.NEXT_PUBLIC_URL;
  }
  
  // 明示的に設定されたサイトURLを優先（ローカル開発・テスト用）
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // 明示的に設定されたデプロイURL（Vercel環境でのオーバーライド用）
  const deployUrl = process.env.NEXT_PUBLIC_DEPLOY_URL;
  if (deployUrl) {
    return deployUrl.startsWith('http') ? deployUrl : `https://${deployUrl}`;
  }
  
  // クライアントサイドの場合、現在のURLを使用
  if (typeof window !== 'undefined') {
    // Vercelドメインやカスタムドメインの場合は現在のオリジンを使用
    if (window.location.host.includes('vercel.app') || 
        window.location.host.includes('mued.jp')) {
      return window.location.origin;
    }
  }
  
  // Vercel環境変数をチェック
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // バックアップとしてのVercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 本番環境向け固定URL
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://www.mued.jp';
  }
  
  // ローカル開発環境のデフォルト
  return 'http://localhost:3000';
}

// レッスン予約関連の型定義
export type ReservationType = {
  id: string;
  bookedStartTime: string | Date;
  bookedEndTime: string | Date;
  status: string;
};

export type LessonSlotType = {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  teacherId?: string;
  isAvailable: boolean;
  reservations?: ReservationType[];
  hourlyRate?: number;
  currency?: string;
};

// 時間単位の予約状況
//export type ReservationStatus = {
//  startTime: Date;
//  endTime: Date;
//  isReserved: boolean;
//  reservationId?: string;
//};

export type TimeSlotStatus = {
  startTime: Date;
  endTime: Date;
  isReserved: boolean;
  reservationId?: string;
}

/**
 * 時間単位のスロットを生成する関数
 */
export function generateHourlySlots(
  slot: LessonSlotType, 
  existingReservations: ReservationType[] = []
): TimeSlotStatus[] {
  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);
  const hourlySlots: TimeSlotStatus[] = [];
  
  // スロットを1時間ごとに分割
  let currentSlotStart = new Date(startTime);
  while (currentSlotStart < endTime) {
    const currentSlotEnd = new Date(currentSlotStart);
    currentSlotEnd.setHours(currentSlotEnd.getHours() + 1);
    
    // この時間枠が終了時間を超えないようにする
    const adjustedEnd = currentSlotEnd > endTime ? endTime : currentSlotEnd;
    
    // この時間枠が予約済みかチェック
    const isReserved = existingReservations.some(reservation => {
      const reservationStart = new Date(reservation.bookedStartTime);
      const reservationEnd = new Date(reservation.bookedEndTime);
      
      return (
        (reservationStart <= currentSlotStart && reservationEnd > currentSlotStart) ||
        (reservationStart < adjustedEnd && reservationEnd >= adjustedEnd) ||
        (reservationStart >= currentSlotStart && reservationEnd <= adjustedEnd)
      );
    });
    
    // 予約済みの場合、対応する予約IDを見つける
    const reservationId = isReserved 
      ? findReservationId(existingReservations, currentSlotStart, adjustedEnd)
      : undefined;
    
    hourlySlots.push({
      startTime: new Date(currentSlotStart),
      endTime: new Date(adjustedEnd),
      isReserved,
      reservationId
    });
    
    // 次の時間枠へ
    currentSlotStart = new Date(adjustedEnd);
  }
  
  return hourlySlots;
}

/**
 * 指定された時間枠に対応する予約IDを探す
 */
export function findReservationId(
  reservations: ReservationType[], 
  slotStart: Date, 
  slotEnd: Date
): string | undefined {
  const reservation = reservations.find(res => {
    const resStart = new Date(res.bookedStartTime);
    const resEnd = new Date(res.bookedEndTime);
    
    return (
      (resStart <= slotStart && resEnd > slotStart) ||
      (resStart < slotEnd && resEnd >= slotEnd) ||
      (resStart >= slotStart && resEnd <= slotEnd)
    );
  });
  
  return reservation?.id;
}

/**
 * 合計予約時間（分）の計算
 */
export function calculateTotalReservedMinutes(reservations: ReservationType[]): number {
  return reservations.reduce((total, reservation) => {
    const start = new Date(reservation.bookedStartTime);
    const end = new Date(reservation.bookedEndTime);
    const minutes = (end.getTime() - start.getTime()) / (60 * 1000);
    return total + minutes;
  }, 0);
}

/**
 * スロット全体の時間（分）
 */
export function calculateSlotTotalMinutes(slot: LessonSlotType): number {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  return (end.getTime() - start.getTime()) / (60 * 1000);
}

/**
 * レッスンスロットから利用可能な時間帯の選択肢を生成する
 */
export function generateAvailableTimeSlots(
  slot: LessonSlotType,
  minHours: number = 1,
  maxHours: number = 0 // 0の場合は制限なし
): {
  startTime: Date;
  endTime: Date;
  hours: number;
  label: string;
}[] {
  const startTime = new Date(slot.startTime);
  const endTime = new Date(slot.endTime);
  const reservations = slot.reservations || [];
  
  // 予約済み時間帯を取得
  const reservedRanges = reservations
    .filter(res => res.status === 'CONFIRMED' || res.status === 'PENDING')
    .map(res => ({
      start: new Date(res.bookedStartTime),
      end: new Date(res.bookedEndTime)
    }));
  
  // スロット全体の時間（時間単位）
  const slotTotalHours = (endTime.getTime() - startTime.getTime()) / (60 * 60 * 1000);
  
  // 最大予約時間が指定されていない場合はスロット全体の時間を使用
  const effectiveMaxHours = maxHours || slotTotalHours;
  
  // 利用可能な時間帯の選択肢を生成
  const availableSlots: {
    startTime: Date;
    endTime: Date;
    hours: number;
    label: string;
  }[] = [];
  
  // 1時間単位で利用可能な時間帯を探す
  for (let startHour = 0; startHour < slotTotalHours; startHour++) {
    const slotStart = new Date(startTime);
    slotStart.setHours(startTime.getHours() + startHour);
    
    // 予約可能な最大時間を計算
    for (let duration = minHours; duration <= effectiveMaxHours; duration++) {
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotStart.getHours() + duration);
      
      // スロット終了時間を超えないことを確認
      if (slotEnd > endTime) continue;
      
      // この時間帯が既存の予約と重複しないことを確認
      const hasOverlap = reservedRanges.some(range => 
        (slotStart < range.end && slotEnd > range.start)
      );
      
      if (!hasOverlap) {
        // 時間を整形して表示用のラベルを作成
        const formatTime = (date: Date) => 
          `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        availableSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          hours: duration,
          label: `${formatTime(slotStart)} - ${formatTime(slotEnd)} (${duration}時間)`
        });
      }
    }
  }
  
  return availableSlots;
} 