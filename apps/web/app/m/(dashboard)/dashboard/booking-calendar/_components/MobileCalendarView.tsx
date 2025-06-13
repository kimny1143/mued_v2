'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths, startOfDay, isSameDay, isToday, getDay, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
import { formatJst } from '@/lib/utils/timezone';
import type { LessonSlot, Reservation } from '../_types/calendar';

interface MobileCalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  lessonSlots: LessonSlot[];
  reservations: Reservation[];
  onSlotSelect: (slot: LessonSlot) => void;
  viewMode: 'month' | 'day';
  setViewMode: (mode: 'month' | 'day') => void;
  isMentor: boolean;
}

export default function MobileCalendarView({
  currentDate,
  setCurrentDate,
  lessonSlots,
  reservations,
  onSlotSelect,
  viewMode,
  setViewMode,
  isMentor
}: MobileCalendarViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(currentDate);
  
  // 初回マウント時のみcurrentDateをselectedDateに設定
  useEffect(() => {
    setSelectedDate(currentDate);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 日付のスロット数を取得
  const getDateSlotCount = (date: Date) => {
    return lessonSlots.filter(slot => {
      const startTimeStr = typeof slot.startTime === 'string' ? slot.startTime : slot.startTime.toISOString();
      return isSameDay(new Date(startTimeStr.endsWith('Z') ? startTimeStr : startTimeStr + 'Z'), date);
    }).length;
  };

  // 日付の予約数を取得
  const getDateReservationCount = (date: Date) => {
    // 全てのスロットから、指定日の予約数を集計
    return lessonSlots.reduce((count, slot) => {
      const startTimeStr = typeof slot.startTime === 'string' ? slot.startTime : slot.startTime.toISOString();
      if (isSameDay(new Date(startTimeStr.endsWith('Z') ? startTimeStr : startTimeStr + 'Z'), date)) {
        return count + (slot.reservations?.length || 0);
      }
      return count;
    }, 0);
  };

  // カレンダーグリッドの生成
  const generateCalendarDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { locale: ja });
    const end = endOfWeek(endOfMonth(currentDate), { locale: ja });
    const days = [];
    let day = start;

    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  // 月表示
  const renderMonthView = () => {
    const days = generateCalendarDays();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    return (
      <div className="px-4">
        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'yyyy年M月', { locale: ja })}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
            <div key={day} className={`text-center text-xs font-medium ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}>
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isCurrentMonth = day >= monthStart && day <= monthEnd;
            const slotCount = getDateSlotCount(day);
            const reservationCount = getDateReservationCount(day);
            const dayOfWeek = getDay(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  // PC版と同じフロー：メンター・生徒問わず、まず日表示に切り替え
                  setSelectedDate(day);
                  setViewMode('day');
                  setCurrentDate(day); // カレンダーの基準日も更新
                }}
                className={`
                  aspect-square p-1 rounded-md relative
                  ${!isCurrentMonth ? 'text-gray-400' : ''}
                  ${isToday(day) ? 'bg-blue-50 font-semibold' : ''}
                  ${isSameDay(selectedDate, day) ? 'ring-2 ring-blue-500' : ''}
                  ${dayOfWeek === 0 ? 'text-red-500' : ''}
                  ${dayOfWeek === 6 ? 'text-blue-500' : ''}
                  ${isMentor ? 'hover:bg-green-50' : 'hover:bg-blue-50'}
                `}
              >
                <div className="text-sm">{format(day, 'd')}</div>
                
                {/* スロット/予約インジケーター */}
                {isCurrentMonth && (slotCount > 0 || reservationCount > 0) && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                    {slotCount > 0 && (
                      <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    )}
                    {reservationCount > 0 && (
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 日表示
  const renderDayView = () => {
    const daySlots = lessonSlots.filter(slot => {
      const startTimeStr = typeof slot.startTime === 'string' ? slot.startTime : slot.startTime.toISOString();
      const endTimeStr = typeof slot.endTime === 'string' ? slot.endTime : slot.endTime.toISOString();
      
      const slotStart = new Date(startTimeStr.endsWith('Z') ? startTimeStr : startTimeStr + 'Z');
      const slotEnd = new Date(endTimeStr.endsWith('Z') ? endTimeStr : endTimeStr + 'Z');
      
      // 選択日の0:00と23:59:59を設定
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      // より正確な重複判定（PC版と同じロジック）
      return (
        // ケース1: スロット開始が選択日内
        (slotStart >= dayStart && slotStart <= dayEnd) ||
        // ケース2: スロット終了が選択日内
        (slotEnd >= dayStart && slotEnd <= dayEnd) ||
        // ケース3: スロットが選択日全体を含む
        (slotStart <= dayStart && slotEnd >= dayEnd)
      );
    });

    const timeSlots = Array.from({ length: 24 }, (_, i) => i); // 0:00-23:00（PC版と同じ）

    return (
      <div className="px-4">
        {/* 日付ナビゲーション */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const prevDate = addDays(selectedDate, -1);
              setSelectedDate(prevDate);
              setCurrentDate(prevDate);
            }}
            className="p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">
              {format(selectedDate, 'M月d日(E)', { locale: ja })}
            </h2>
            {isToday(selectedDate) && (
              <span className="text-xs text-blue-500">今日</span>
            )}
          </div>
          <button
            onClick={() => {
              const nextDate = addDays(selectedDate, 1);
              setSelectedDate(nextDate);
              setCurrentDate(nextDate);
            }}
            className="p-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 月表示に戻るボタン */}
        <button
          onClick={() => setViewMode('month')}
          className="mb-4 text-sm text-blue-500"
        >
          ← カレンダーに戻る
        </button>

        {/* メンター用：新規スロット作成ボタン */}
        {isMentor && (
          <button
            onClick={() => {
              const dateString = format(selectedDate, 'yyyy-MM-dd');
              router.push(`/m/dashboard/slots/new?date=${dateString}`);
            }}
            className="w-full mb-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            + この日に新しいスロットを作成
          </button>
        )}

        {/* タイムライン表示（Googleカレンダー風） */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gray-50 border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">
                {daySlots.length}件のレッスンスロット
              </div>
              {isMentor && (
                <button
                  onClick={() => {
                    const dateString = format(selectedDate, 'yyyy-MM-dd');
                    router.push(`/m/dashboard/slots/new?date=${dateString}`);
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded text-sm font-medium hover:bg-green-600 transition-colors flex items-center gap-1"
                >
                  + 新規作成
                </button>
              )}
            </div>
          </div>

          {/* タイムライングリッド */}
          <div className="relative">
            {/* 時間軸とグリッド線 */}
            <div className="divide-y divide-gray-200">
              {timeSlots.map((hour) => (
                <div 
                  key={hour}
                  className="grid grid-cols-[60px_1fr] h-[50px] relative"
                >
                  {/* 時間軸 */}
                  <div className="p-2 border-r border-gray-200 flex items-center justify-center bg-gray-50">
                    <div className="text-xs font-medium text-gray-600">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  </div>
                  
                  {/* スロット表示エリア */}
                  <div 
                    className={`relative h-full ${isMentor ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    onClick={(e) => {
                      // メンターのみ、空いている場所で新規作成
                      if (isMentor && e.target === e.currentTarget) {
                        const dateString = format(selectedDate, 'yyyy-MM-dd');
                        const timeString = hour.toString().padStart(2, '0') + ':00';
                        router.push(`/m/dashboard/slots/new?date=${dateString}&time=${timeString}`);
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            {/* スロット帯の重ね表示 */}
            <div className="absolute inset-0 pointer-events-none">
              {daySlots.map((slot, slotIndex) => {
                const startTimeStr = typeof slot.startTime === 'string' ? slot.startTime : slot.startTime.toISOString();
                const endTimeStr = typeof slot.endTime === 'string' ? slot.endTime : slot.endTime.toISOString();
                
                const slotStart = new Date(startTimeStr.endsWith('Z') ? startTimeStr : startTimeStr + 'Z');
                const slotEnd = new Date(endTimeStr.endsWith('Z') ? endTimeStr : endTimeStr + 'Z');
                
                // 選択日の範囲
                const dayStart = new Date(selectedDate);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(selectedDate);
                dayEnd.setHours(23, 59, 59, 999);
                
                // 表示用の開始・終了時刻（選択日の範囲内に制限）
                const displayStart = slotStart < dayStart ? dayStart : slotStart;
                const displayEnd = slotEnd > dayEnd ? dayEnd : slotEnd;
                
                // 位置計算
                const startHour = displayStart.getHours();
                const startMinute = displayStart.getMinutes();
                const startPosition = startHour * 50 + (startMinute / 60) * 50; // 50pxが1時間
                
                const displayDurationMs = displayEnd.getTime() - displayStart.getTime();
                const displayDurationMinutes = displayDurationMs / (1000 * 60);
                const height = (displayDurationMinutes / 60) * 50; // 50pxが1時間
                
                // このスロットに関連する全予約を取得
                // 重要: slot.reservationsには全ユーザーの予約が含まれている
                // reservations配列には自分の予約のみが含まれている
                const slotReservations = slot.reservations || [];
                
                // デバッグ: slotオブジェクトの構造を確認
                if (!isMentor && slotIndex === 0) {
                  console.log('📱 スロットデータ構造:', {
                    slotId: slot.id,
                    hasReservations: !!slot.reservations,
                    reservationsLength: slot.reservations?.length || 0,
                    slotKeys: Object.keys(slot),
                    sampleReservation: slot.reservations?.[0]
                  });
                }
                
                // デバッグ: スロット内の予約情報を確認
                if (slotReservations.length > 0 && !isMentor) {
                  console.log('📱 生徒側 - スロット予約情報:', {
                    slotId: slot.id,
                    slotTime: `${formatJst(slotStart, 'HH:mm')}-${formatJst(slotEnd, 'HH:mm')}`,
                    reservationCount: slotReservations.length,
                    reservations: slotReservations.map(r => ({
                      status: r.status,
                      bookedTime: `${r.bookedStartTime} - ${r.bookedEndTime}`
                    })),
                    note: 'slot.reservationsを使用中'
                  });
                }
                
                const mentorName = slot.teacher?.name || slot.teacher?.email?.split('@')[0];
                
                // スロット内の予約可能性を判定
                const hasAvailableTime = (() => {
                  if (!slot.isAvailable) {
                    console.log('📱 スロット利用不可:', slot.id);
                    return false;
                  }
                  if (slotReservations.length === 0) {
                    console.log('📱 予約なし - 利用可能:', slot.id);
                    return true;
                  }
                  
                  // スロットの制約を確認
                  const slotDurationMinutes = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
                  const minDuration = slot.minHours ? slot.minHours * 60 : 60;
                  const maxDuration = slot.maxHours ? 
                    Math.min(slot.maxHours * 60, slotDurationMinutes) : 
                    Math.min(180, slotDurationMinutes);
                  
                  // 予約済み時間帯を整理（タイムゾーン考慮）
                  const rawBookedPeriods = slotReservations
                    .filter(r => r.status !== 'CANCELED')
                    .map(r => {
                      // 文字列がZで終わっていない場合はZを追加（UTC時刻として扱う）
                      const startStr = r.bookedStartTime.endsWith('Z') ? r.bookedStartTime : r.bookedStartTime + 'Z';
                      const endStr = r.bookedEndTime.endsWith('Z') ? r.bookedEndTime : r.bookedEndTime + 'Z';
                      return {
                        start: new Date(startStr),
                        end: new Date(endStr)
                      };
                    })
                    .sort((a, b) => a.start.getTime() - b.start.getTime());
                  
                  // 重複する予約期間をマージ
                  const bookedPeriods: Array<{start: Date, end: Date}> = [];
                  for (const period of rawBookedPeriods) {
                    if (bookedPeriods.length === 0) {
                      bookedPeriods.push(period);
                    } else {
                      const lastPeriod = bookedPeriods[bookedPeriods.length - 1];
                      if (period.start <= lastPeriod.end) {
                        // 重複している場合はマージ
                        lastPeriod.end = new Date(Math.max(lastPeriod.end.getTime(), period.end.getTime()));
                      } else {
                        bookedPeriods.push(period);
                      }
                    }
                  }
                  
                  // 空き時間をチェック
                  let checkTime = slotStart;
                  
                  for (const period of bookedPeriods) {
                    const gapMinutes = (period.start.getTime() - checkTime.getTime()) / (1000 * 60);
                    if (gapMinutes >= minDuration && gapMinutes <= maxDuration) {
                      return true;
                    }
                    checkTime = period.end;
                  }
                  
                  // 最後の予約から終了時刻までの空き時間
                  const finalGapMinutes = (slotEnd.getTime() - checkTime.getTime()) / (1000 * 60);
                  const result = finalGapMinutes >= minDuration && finalGapMinutes <= maxDuration;
                  
                  // デバッグ: 利用可能性判定結果
                  if (!isMentor && slotReservations.length > 0) {
                    console.log('📱 生徒側 - 利用可能性判定:', {
                      slotId: slot.id,
                      hasAvailableTime: result,
                      minDuration,
                      maxDuration,
                      bookedPeriods: bookedPeriods.map(p => ({
                        start: formatJst(p.start, 'HH:mm'),
                        end: formatJst(p.end, 'HH:mm')
                      })),
                      finalGapMinutes,
                      slotDurationMinutes,
                      allReservationsInSlot: slotReservations.length,
                      myReservations: reservations.filter(r => r.slotId === slot.id).length
                    });
                  }
                  
                  return result;
                })();
                
                return (
                  <div
                    key={slot.id}
                    className="absolute left-[62px] right-2 pointer-events-auto cursor-pointer"
                    style={{
                      top: `${startPosition}px`,
                      height: `${Math.max(height, 30)}px`,
                      zIndex: 10 + slotIndex
                    }}
                    onClick={() => {
                      if (isMentor) {
                        router.push(`/m/dashboard/slots/${slot.id}/edit`);
                      } else if (hasAvailableTime) {
                        onSlotSelect(slot);
                      }
                    }}
                  >
                    <div 
                      className={`
                        h-full rounded border-2 p-2 transition-all
                        ${slotReservations.length > 0 
                          ? isMentor ? 'bg-blue-100 border-blue-300' : hasAvailableTime ? 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200' : 'bg-gray-100 border-gray-300'
                          : slot.isAvailable 
                            ? isMentor ? 'bg-gray-100 border-gray-300 hover:bg-gray-200' : 'bg-green-100 border-green-300 hover:bg-green-200' 
                            : 'bg-gray-100 border-gray-300'
                        }
                      `}
                    >
                      {/* スロット基本情報 */}
                      <div className="text-xs">
                        <div className="font-semibold truncate">
                          {formatJst(slotStart, 'HH:mm')}-{formatJst(slotEnd, 'HH:mm')}
                          {slotStart < dayStart && <span className="ml-1">(前日から)</span>}
                          {slotEnd > dayEnd && <span className="ml-1">(翌日まで)</span>}
                        </div>
                        
                        {isMentor ? (
                          slotReservations.length > 0 ? (
                            <div className="text-xs mt-1">
                              <div className="truncate">
                                {slotReservations.length}件の予約
                              </div>
                              {slotReservations.slice(0, 1).map(res => (
                                <div key={res.id} className="truncate">
                                  {res.student?.name || '生徒'}さん
                                  <span className={`ml-1 px-1 py-0.5 rounded text-xxs ${
                                    res.status === 'PENDING_APPROVAL' 
                                      ? 'bg-yellow-200 text-yellow-800' 
                                      : 'bg-green-200 text-green-800'
                                  }`}>
                                    {res.status === 'PENDING_APPROVAL' ? '承認待ち' : '承認済み'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-600 text-xs">未予約</div>
                          )
                        ) : (
                          <div className="text-xs mt-1">
                            <div className="truncate">{mentorName}先生</div>
                            {hasAvailableTime && (
                              <div className="text-gray-600">
                                ¥{(slot.hourlyRate || 0).toLocaleString()}
                                {slotReservations.length > 0 && (
                                  <span className="ml-1 text-yellow-600">部分予約可</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return viewMode === 'month' ? renderMonthView() : renderDayView();
}