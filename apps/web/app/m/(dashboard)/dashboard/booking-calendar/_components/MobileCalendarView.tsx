'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, addMonths, subMonths, startOfDay, isSameDay, isToday, getDay, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ja } from 'date-fns/locale';
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
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 日付のスロット数を取得
  const getDateSlotCount = (date: Date) => {
    return lessonSlots.filter(slot => 
      isSameDay(new Date(slot.startTime), date)
    ).length;
  };

  // 日付の予約数を取得
  const getDateReservationCount = (date: Date) => {
    return reservations.filter(reservation => {
      const slot = lessonSlots.find(s => s.id === reservation.slotId);
      return slot && isSameDay(new Date(slot.startTime), date);
    }).length;
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
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      
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
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
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
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
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
                const slotStart = new Date(slot.startTime);
                const slotEnd = new Date(slot.endTime);
                
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
                
                const reservation = reservations.find(r => r.slotId === slot.id);
                const mentorName = slot.teacher?.name || slot.teacher?.email?.split('@')[0];
                
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
                      } else if (slot.isAvailable && !reservation) {
                        onSlotSelect(slot);
                      }
                    }}
                  >
                    <div 
                      className={`
                        h-full rounded border-2 p-2 transition-all
                        ${reservation 
                          ? isMentor ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'
                          : slot.isAvailable 
                            ? isMentor ? 'bg-gray-100 border-gray-300 hover:bg-gray-200' : 'bg-green-100 border-green-300 hover:bg-green-200' 
                            : 'bg-gray-100 border-gray-300'
                        }
                      `}
                    >
                      {/* スロット基本情報 */}
                      <div className="text-xs">
                        <div className="font-semibold truncate">
                          {format(slotStart, 'HH:mm')}-{format(slotEnd, 'HH:mm')}
                          {slotStart < dayStart && <span className="ml-1">(前日から)</span>}
                          {slotEnd > dayEnd && <span className="ml-1">(翌日まで)</span>}
                        </div>
                        
                        {isMentor ? (
                          reservation ? (
                            <div className="text-xs mt-1 truncate">
                              {reservation.student?.name || '生徒'}さん
                              <span className={`ml-1 px-1 py-0.5 rounded text-xxs ${
                                reservation.status === 'PENDING_APPROVAL' 
                                  ? 'bg-yellow-200 text-yellow-800' 
                                  : 'bg-green-200 text-green-800'
                              }`}>
                                {reservation.status === 'PENDING_APPROVAL' ? '承認待ち' : '承認済み'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-gray-600 text-xs">未予約</div>
                          )
                        ) : (
                          <div className="text-xs mt-1">
                            <div className="truncate">{mentorName}先生</div>
                            {!reservation && <div className="text-gray-600">¥{(slot.hourlyRate || 0).toLocaleString()}</div>}
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