'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { SlotModal } from './SlotModal';

// デバッグモード
const DEBUG = true;

// 時間表示設定 - 24時間対応
const TIME_RANGE = {
  START_HOUR: 0,  // 0:00から開始
  END_HOUR: 23,   // 23:00まで表示
};

// 時間軸生成関数
const generateTimeSlots = (startHour: number = TIME_RANGE.START_HOUR, endHour: number = TIME_RANGE.END_HOUR) => {
  const timeSlots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    timeSlots.push(hour);
  }
  return timeSlots;
};

// メンタースロットの型定義
interface MentorLessonSlot {
  id: string;
  teacherId: string;
  startTime: string | Date;
  endTime: string | Date;
  isAvailable: boolean;
  hourlyRate?: number;
  currency?: string;
  minDuration?: number;
  maxDuration?: number;
  description?: string;
  teacher: {
    id: string;
    name: string | null;
    email?: string | null;
    image: string | null;
  };
  reservations: Array<{
    id: string;
    status: string;
    bookedStartTime?: string;
    bookedEndTime?: string;
    student?: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SlotsCalendarProps {
  slots: MentorLessonSlot[];
  isLoading: boolean;
  onSlotUpdate: (updatedSlot: MentorLessonSlot) => void;
  onSlotDelete: (deletedSlotId: string) => void;
  onReservationClick?: (reservation: MentorLessonSlot['reservations'][0], mode?: 'view' | 'cancel' | 'reschedule' | 'approve' | 'reject') => void;
  onDateClick?: (date: Date) => void;
}

export const SlotsCalendar: React.FC<SlotsCalendarProps> = ({
  slots,
  isLoading,
  onSlotUpdate,
  onSlotDelete,
  onReservationClick,
  onDateClick,
}) => {
  // 現在表示中の日付
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // 選択された日付
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // モーダル関連のstate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MentorLessonSlot | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');

  // スロットがある日付リストを生成
  const slotDays = Array.from(new Set(
    slots.map(slot => startOfDay(new Date(slot.startTime)).getTime())
  )).map(timestamp => new Date(timestamp));

  // 日付が今日かどうかをチェック
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // 特定の日のスロットを取得
  const getSlotsForDate = (date: Date) => {
    return slots.filter(slot => 
      isSameDay(new Date(slot.startTime), date)
    );
  };

  // スロットの状態を判定
  const getSlotStatus = (slot: MentorLessonSlot) => {
    if (!slot.isAvailable) return 'disabled';
    if (slot.reservations?.some(r => r.status === 'CONFIRMED')) return 'booked';
    if (slot.reservations?.some(r => r.status === 'PENDING')) return 'pending';
    return 'available';
  };

  // 日付クリック処理 - 日付別予約一覧モーダルを開く
  const handleDateClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  // 空の日付エリアクリック処理 - 新規スロット作成（削除予定）
  const handleEmptyAreaClick = (date: Date) => {
    // 新しい実装では使用しない - 代わりにhandleDateClickを使用
    // 日別表示で新規作成機能を提供
    if (onDateClick) {
      onDateClick(date);
      return;
    }
    
    // フォールバック処理（onDateClickが提供されていない場合のみ）
    const daySlots = getSlotsForDate(date);
    setSelectedDate(date);
    
    if (daySlots.length === 0) {
      // その日にスロットがない場合は新規作成モードでモーダルを開く
      setSelectedSlot(null);
      setModalMode('create');
      setIsModalOpen(true);
    } else if (daySlots.length === 1) {
      // スロットが1つの場合はそのスロットを表示
      setSelectedSlot(daySlots[0]);
      setModalMode('view');
      setIsModalOpen(true);
    } else {
      // 複数のスロットがある場合は選択ダイアログを表示（今回はシンプルに最初のスロットを表示）
      setSelectedSlot(daySlots[0]);
      setModalMode('view');
      setIsModalOpen(true);
    }
  };

  // スロットカードをクリックしたときの処理
  const handleSlotClick = (slot: MentorLessonSlot, mode: 'view' | 'edit' = 'view') => {
    setSelectedSlot(slot);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  // スロットタグクリック（編集）
  const handleSlotTagClick = (slot: MentorLessonSlot, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックを停止
    setSelectedSlot(slot);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // モーダルを閉じる処理
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
    setSelectedDate(null);
  };

  // 月を変更する処理
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };

  return (
    <div className="flex flex-col space-y-4">
      {DEBUG && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-2 text-blue-900">📊 カレンダー情報</h3>
          <div className="text-xs space-y-1 text-blue-800">
            <p>• 総スロット数: <span className="font-medium">{slots.length}</span></p>
            <p>• スロットがある日: <span className="font-medium">{slotDays.length}日</span></p>
            <p>• 表示月: <span className="font-medium">{format(currentDate, 'yyyy年MM月', { locale: ja })}</span></p>
          </div>
        </div>
      )}
      
      <div className="p-0 sm:px-0">
        {/* ヘッダー - 月選択 */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToPreviousMonth}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg sm:text-xl font-semibold">
            {format(currentDate, 'yyyy年 MM月', { locale: ja })}
          </h2>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={goToNextMonth}
            className="p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64" aria-live="polite" aria-busy="true">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="sr-only">読み込み中...</span>
          </div>
        ) : (
          <>
            {/* カレンダーグリッド - モバイル対応強化 */}
            <div className="grid grid-cols-7 gap-2">
              {/* 曜日ヘッダー */}
              {['月', '火', '水', '木', '金', '土', '日'].map((day, index) => (
                <div key={index} className="text-center text-xs font-medium text-gray-500 py-1 sm:py-2">
                  {day}
                </div>
              ))}
              
              {/* 月の日付を表示 */}
              {(() => {
                const monthStart = startOfMonth(currentDate);
                const monthEnd = endOfMonth(currentDate);
                const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
                const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
                const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                
                return calendarDays.map((date, index) => {
                  const daySlots = getSlotsForDate(date);
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  const hasSlots = daySlots.length > 0;
                  const todayMark = isToday(date);
                  
                  // スロットの状態別カウント
                  const availableSlots = daySlots.filter(s => getSlotStatus(s) === 'available').length;
                  const bookedSlots = daySlots.filter(s => getSlotStatus(s) === 'booked').length;
                  const pendingSlots = daySlots.filter(s => getSlotStatus(s) === 'pending').length;
                  
                  return (
                    <div
                      key={index}
                      onClick={isCurrentMonth ? () => handleDateClick(date) : undefined}
                      className={`
                        aspect-square p-1 sm:p-2 text-center rounded-md sm:rounded-lg transition-all duration-200 relative 
                        min-h-[60px] flex flex-col justify-between
                        ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
                        ${isCurrentMonth && !hasSlots ? 'text-gray-600 bg-white hover:bg-gray-50 border border-dashed border-gray-300 cursor-pointer' : ''}
                        ${hasSlots ? 'bg-blue-50 border-2 border-blue-200 cursor-pointer' : ''}
                        ${todayMark ? 'font-bold ring-2 ring-primary ring-offset-1' : ''}
                      `}
                    >
                      <div className="text-sm font-medium">
                        {format(date, 'd')}
                      </div>
                      
                      {/* スロット情報表示 - モバイル最適化 */}
                      {hasSlots && (
                        <div className="flex flex-col gap-0.5 w-full mt-1">
                          {/* スロットタグ表示（モバイルでは最大2個まで） */}
                          {daySlots.slice(0, typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 3).map((slot, slotIndex) => {
                            const slotStatus = getSlotStatus(slot);
                            const statusColors = {
                              available: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200',
                              booked: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200',
                              pending: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200',
                              disabled: 'bg-gray-100 border-gray-300 text-gray-600'
                            };
                            
                            return (
                              <div key={`slot-${slot.id}`} className="w-full">
                                {/* スロット時間表示 - モバイル対応 */}
                                <div
                                  onClick={(e) => handleSlotTagClick(slot, e)}
                                  className={`
                                    text-xxs px-0.5 py-0 rounded text-center font-medium cursor-pointer transition-colors
                                    ${statusColors[slotStatus]}
                                    leading-tight max-w-full truncate mb-0.5
                                  `}
                                  title={`${format(new Date(slot.startTime), 'HH:mm')}-${format(new Date(slot.endTime), 'HH:mm')} (クリックで編集)`}
                                >
                                  {format(new Date(slot.startTime), 'H:mm')}-{format(new Date(slot.endTime), 'H:mm')}
                                </div>
                                
                                {/* 予約済み情報表示（モバイル最適化） */}
                                {slot.reservations && slot.reservations.length > 0 && (
                                  <div className="flex flex-col gap-0.5">
                                    {slot.reservations
                                      .filter(res => res.status === 'CONFIRMED' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL')
                                      .slice(0, 1) // モバイルでは1件まで表示
                                      .map((reservation, resIndex) => {
                                        const startTime = new Date(reservation.bookedStartTime || '');
                                        const timeString = format(startTime, 'HH:mm');
                                        
                                        // ステータス別の色分け（コンパクト表示）
                                        const reservationColors = {
                                          CONFIRMED: 'bg-blue-100 border-blue-400 text-blue-800',
                                          APPROVED: 'bg-green-100 border-green-400 text-green-800',
                                          PENDING_APPROVAL: 'bg-orange-100 border-orange-400 text-orange-800',
                                          PENDING: 'bg-yellow-100 border-yellow-400 text-yellow-800'
                                        };
                                        
                                        return (
                                            <div
                                              key={`reservation-${reservation.id}-${resIndex}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // 日付別予約一覧モーダルを開く
                                                handleDateClick(date);
                                              }}
                                              className={`px-0.5 py-0 text-xxs font-medium rounded border cursor-pointer hover:opacity-80 ${
                                                reservationColors[reservation.status as keyof typeof reservationColors] || 'bg-gray-100 border-gray-400 text-gray-800'
                                              } truncate text-center`}
                                              title={`予約: ${reservation.student?.name || '生徒'} ${timeString} (クリックで一覧表示)`}
                                            >
                                              🎵{timeString}
                                            </div>
                                          );
                                      })}
                                    
                                    {/* 複数予約がある場合の省略表示 */}
                                    {slot.reservations.filter(res => res.status === 'CONFIRMED' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL').length > 1 && (
                                      <div className="text-xxs text-center text-gray-600 font-medium">
                                        +{slot.reservations.filter(res => res.status === 'CONFIRMED' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL').length - 1}件
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 省略表示の調整 */}
                          {daySlots.length > (typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 3) && (
                            <div 
                              onClick={() => handleDateClick(date)}
                              className="text-xxs text-center text-gray-600 font-medium cursor-pointer hover:text-blue-600"
                              title="すべてのスロットを表示"
                            >
                              +{daySlots.length - (typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 3)}件
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 今日のマーク */}
                      {todayMark && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                      )}
                      
                      {/* スロットなしの日のプラスアイコン */}
                      {!hasSlots && isCurrentMonth && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <CalendarIcon className="w-2 h-2 sm:w-3 sm:h-3 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            
            {/* 凡例 - モバイル対応 */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 mb-3">凡例</h5>
              
              {/* スロット状態の凡例 */}
              <div className="mb-4">
                <h6 className="text-xs font-medium text-gray-600 mb-2">スロット状態</h6>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                    <span>利用可能</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                    <span>予約済み</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                    <span>保留中</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>無効</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span>今日</span>
                  </div>
                </div>
              </div>
              
              {/* 予約情報の凡例 */}
              <div className="mb-3">
                <h6 className="text-xs font-medium text-gray-600 mb-2">予約情報</h6>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="px-1 py-0.5 text-xs font-medium rounded border bg-blue-100 border-blue-400 text-blue-800">🎵</div>
                    <span>確定済み</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-1 py-0.5 text-xs font-medium rounded border bg-green-100 border-green-400 text-green-800">🎵</div>
                    <span>承認済み</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-1 py-0.5 text-xs font-medium rounded border bg-orange-100 border-orange-400 text-orange-800">🎵</div>
                    <span>承認待ち</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-1 py-0.5 text-xs font-medium rounded border bg-yellow-100 border-yellow-400 text-yellow-800">🎵</div>
                    <span>保留中</span>
                  </div>
                </div>
              </div>
              
              <div className="text-xxs text-gray-600">
                💡 <strong>操作方法:</strong> 日付をクリック→日別タイムライン表示、スロットタグクリック→編集<br/>
                💡 <strong>予約表示:</strong> 🎵アイコン付きで生徒の予約時間を表示
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* スロット詳細/編集モーダル */}
      <SlotModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        slot={selectedSlot}
        selectedDate={selectedDate}
        mode={modalMode}
        onSlotUpdate={onSlotUpdate}
        onSlotDelete={onSlotDelete}
      />
    </div>
  );
};

export default SlotsCalendar; 