'use client';

import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, startOfDay } from 'date-fns';
import { Mentor } from './MentorList';
import type { ExtendedTimeSlot, MyReservation } from '../_types/calendar.js';

interface MonthViewProps {
  currentDate: Date;
  allTimeSlots: ExtendedTimeSlot[];
  myReservations: MyReservation[];
  mentors: Mentor[];
  onDateClick: (date: Date) => void;
  onSlotClick: (date: Date, slot: ExtendedTimeSlot, mentor: Mentor | null) => void;
  selectedDates: Date[];
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  allTimeSlots,
  myReservations,
  mentors,
  onDateClick,
  onSlotClick,
  selectedDates,
}) => {
  // 予約可能な日付リスト
  const availableDays = Array.from(new Set(
    allTimeSlots
      .filter(slot => slot.isAvailable)
      .map(slot => startOfDay(new Date(slot.startTime)).getTime())
  )).map(timestamp => new Date(timestamp));

  // 日付が今日かどうかをチェック
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  if (availableDays.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <div className="text-gray-400 mb-2">📅</div>
        <p className="text-gray-500 font-medium">利用可能な日付がありません</p>
        <p className="text-xs text-gray-400 mt-1">他のメンターを選択してください</p>
      </div>
    );
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="grid grid-cols-7 gap-2">
      {/* 曜日ヘッダー */}
      {['月', '火', '水', '木', '金', '土', '日'].map((day, index) => (
        <div key={index} className="text-center text-xs font-medium text-gray-500 py-2">
          {day}
        </div>
      ))}
      
      {/* 月の日付を表示 */}
      {calendarDays.map((date, index) => {
        const daySlots = allTimeSlots.filter(slot => 
          isSameDay(new Date(slot.startTime), date) && slot.isAvailable
        );
        
        const isCurrentMonth = isSameMonth(date, currentDate);
        const isAvailable = availableDays.some(d => isSameDay(d, date));
        const todayMark = isToday(date);
        const isSelected = selectedDates.some(d => isSameDay(d, date));
        
        // 予約状況の分析
        const extSlots = daySlots as ExtendedTimeSlot[];
        const statusCounts = {
          available: extSlots.filter(s => s.bookingStatus === 'available').length,
          partial: extSlots.filter(s => s.bookingStatus === 'partial').length,
          full: extSlots.filter(s => s.bookingStatus === 'full').length,
          unavailable: extSlots.filter(s => s.bookingStatus === 'unavailable').length,
        };
        
        const totalReservations = extSlots.reduce((sum, s) => sum + (s.reservationCount || 0), 0);
        
        // 日付全体の予約状況を判定
        let dayStatus: 'available' | 'partial' | 'full' | 'unavailable' = 'available';
        if (!isAvailable) {
          dayStatus = 'unavailable';
        } else if (statusCounts.full > 0 && statusCounts.available === 0) {
          dayStatus = 'full';
        } else if (statusCounts.partial > 0 || statusCounts.full > 0) {
          dayStatus = 'partial';
        }
        
        return (
          <button
            key={index}
            onClick={() => isAvailable ? onDateClick(date) : undefined}
            disabled={!isAvailable}
            className={`
              aspect-square p-1 text-center rounded-lg transition-all duration-200 relative min-h-[60px] flex flex-col justify-between
              ${!isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''}
              ${isCurrentMonth && !isAvailable ? 'text-gray-400 bg-gray-50' : ''}
              ${isAvailable && !isSelected && dayStatus === 'available' ? 'bg-green-50 border-2 border-green-200 text-green-800 hover:bg-green-100 hover:border-green-400' : ''}
              ${isAvailable && !isSelected && dayStatus === 'partial' ? 'bg-yellow-50 border-2 border-yellow-300 text-yellow-800 hover:bg-yellow-100 hover:border-yellow-400' : ''}
              ${isAvailable && !isSelected && dayStatus === 'full' ? 'bg-orange-50 border-2 border-orange-300 text-orange-800 hover:bg-orange-100 hover:border-orange-400' : ''}
              ${isSelected ? 'bg-primary text-primary-foreground border-2 border-primary' : ''}
              ${todayMark && !isSelected ? 'ring-2 ring-blue-500 ring-offset-1 font-bold' : ''}
              ${todayMark && isSelected ? 'bg-primary text-primary-foreground border-2 border-primary font-bold' : ''}
            `}
          >
            <div className="text-sm font-medium">
              {format(date, 'd')}
            </div>
            
            {/* 生徒自身の予約を最優先で表示 - PENDING_APPROVALを含むように修正 */}
            {(() => {
              const myReservationsOnDate = myReservations.filter(res => 
                isSameDay(new Date(res.bookedStartTime), date) && 
                (res.status === 'CONFIRMED' || res.status === 'PENDING' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL')
              );
              
              if (myReservationsOnDate.length > 0) {
                return (
                  <div className="flex flex-col gap-0.5 w-full mt-1">
                    {myReservationsOnDate.slice(0, 2).map((reservation, resIndex) => {
                      const startTime = new Date(reservation.bookedStartTime);
                      const timeString = format(startTime, 'HH:mm');
                      
                      // ステータス別の色分け（コンパクト表示）- PENDING_APPROVALの色を追加
                      const statusColors = {
                        CONFIRMED: 'bg-blue-100 border-blue-400 text-blue-800',
                        APPROVED: 'bg-green-100 border-green-400 text-green-800',
                        PENDING_APPROVAL: 'bg-orange-100 border-orange-400 text-orange-800',
                        PENDING: 'bg-yellow-100 border-yellow-400 text-yellow-800'
                      };
                      
                      // ステータス表示用のアイコンと文字
                      const statusDisplay = {
                        CONFIRMED: '🎵',
                        APPROVED: '✅',
                        PENDING_APPROVAL: '⏳',
                        PENDING: '⏰'
                      };
                      
                      return (
                        <div
                          key={`my-reservation-${reservation.id}-${resIndex}`}
                          className={`px-0.5 py-0 text-xxs font-medium rounded border ${
                            statusColors[reservation.status as keyof typeof statusColors] || 'bg-gray-100 border-gray-400 text-gray-800'
                          } mb-0.5 truncate`}
                          title={`${reservation.status === 'PENDING_APPROVAL' ? 'メンター確認中' : 
                                    reservation.status === 'APPROVED' ? '承認済み' :
                                    reservation.status === 'CONFIRMED' ? '確定済み' : 
                                    reservation.status === 'PENDING' ? '保留中' : reservation.status} - ${timeString}`}
                        >
                          {statusDisplay[reservation.status as keyof typeof statusDisplay] || '📅'}{timeString}
                        </div>
                      );
                    })}
                    
                    {myReservationsOnDate.length > 2 && (
                      <div className="text-micro text-center text-blue-600 font-medium bg-blue-50 rounded px-0.5 py-0 border border-blue-200">
                        +{myReservationsOnDate.length - 2}件の予約
                      </div>
                    )}
                  </div>
                );
              }
              
              return null;
            })()}

            {/* スロットタグ表示 - 自分の予約がない日のみ */}
            {(() => {
              const myReservationsOnDate = myReservations.filter(res => 
                isSameDay(new Date(res.bookedStartTime), date) && 
                (res.status === 'CONFIRMED' || res.status === 'PENDING' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL')
              );
              
              if (myReservationsOnDate.length > 0) return null;
              
              return isAvailable && daySlots.length > 0 && (
                <div className="flex flex-col gap-0.5 w-full mt-1">
                  {daySlots.slice(0, 3).map((slot, slotIndex) => {
                    const extSlot = slot as ExtendedTimeSlot;
                    
                    return (
                      <div
                        key={`${extSlot.id}-${slotIndex}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (extSlot.bookingStatus === 'available' || extSlot.bookingStatus === 'partial') {
                            const selectedMentor = mentors.find(m => m.id === extSlot.mentorId);
                            onSlotClick(date, extSlot, selectedMentor || null);
                          }
                        }}
                        className={`
                          ${extSlot.bookingStatus === 'available' ? 'calendar-slot-tag-available' : 
                            extSlot.bookingStatus === 'partial' ? 'calendar-slot-tag-partial' :
                            extSlot.bookingStatus === 'full' ? 'calendar-slot-tag-full' : 'calendar-slot-tag-unavailable'}
                          cursor-pointer transition-colors leading-tight max-w-full truncate
                          ${(extSlot.bookingStatus === 'available' || extSlot.bookingStatus === 'partial') ? 'hover:opacity-80' : 'cursor-default'}
                        `}
                        title={`${extSlot.mentorName} ${format(new Date(extSlot.startTime), 'HH:mm')}-${format(new Date(extSlot.endTime), 'HH:mm')} ${extSlot.bookingStatus === 'available' ? '(完全空き)' : extSlot.bookingStatus === 'partial' ? `(${extSlot.availableTime}分空き)` : extSlot.bookingStatus === 'full' ? '(満席)' : '(利用不可)'} - クリックで予約`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">
                            {extSlot.mentorName?.substring(0, 2)}
                          </span>
                          <span className="ml-1">
                            {format(new Date(extSlot.startTime), 'H:mm')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {daySlots.length > 3 && (
                    <div 
                      onClick={() => onDateClick(date)}
                      className="text-micro text-center text-gray-600 font-medium cursor-pointer hover:text-blue-600 bg-gray-50 rounded px-0.5 py-0 border border-gray-200"
                      title="すべてのスロットを表示"
                    >
                      +{daySlots.length - 3}件
                    </div>
                  )}
                  
                  {totalReservations > 0 && (
                    <div className="text-micro text-center text-gray-500 font-medium">
                      {totalReservations}予約済み
                    </div>
                  )}
                </div>
              );
            })()}
            
            {/* 今日のマーク */}
            {todayMark && (
              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                isSelected ? 'bg-white' : 'bg-blue-500'
              }`} />
            )}
            
            {/* 選択中のマーク */}
            {isSelected && (
              <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
}; 