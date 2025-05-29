'use client';

import React from 'react';
import { format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/app/components/ui/button';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Mentor } from './MentorList';
import type { ExtendedTimeSlot, MyReservation, OtherReservation } from '../_types/calendar.js';

interface DayViewProps {
  selectedDate: Date;
  allTimeSlots: ExtendedTimeSlot[];
  myReservations: MyReservation[];
  otherReservations: OtherReservation[];
  isLoadingReservations: boolean;
  mentors: Mentor[];
  onBackToMonth: () => void;
  onDayNavigation: (date: Date) => void;
  onSlotClick: (slot: ExtendedTimeSlot, mentor: Mentor | null) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  selectedDate,
  allTimeSlots,
  myReservations,
  otherReservations,
  isLoadingReservations,
  mentors,
  onBackToMonth,
  onDayNavigation,
  onSlotClick,
}) => {
  // デバッグログを追加
  console.log('🔍 DayView デバッグ情報:');
  console.log('- selectedDate:', selectedDate);
  console.log('- allTimeSlots:', allTimeSlots);
  console.log('- myReservations:', myReservations);
  console.log('- otherReservations:', otherReservations);
  console.log('- mentors:', mentors);

  // 価格フォーマット関数
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  const daySlots = allTimeSlots.filter(slot => 
    isSameDay(new Date(slot.startTime), selectedDate) && slot.isAvailable
  );
  
  console.log('🔍 daySlots (フィルタ後):', daySlots);
  
  // メンター別にスロットをグループ化
  const slotsByMentor = daySlots.reduce((acc, slot) => {
    const mentorId = slot.mentorId;
    if (!acc[mentorId]) {
      acc[mentorId] = [];
    }
    acc[mentorId].push(slot);
    return acc;
  }, {} as Record<string, ExtendedTimeSlot[]>);

  console.log('🔍 slotsByMentor:', slotsByMentor);

  // この日にスロットがあるメンターのみを取得
  const availableMentors = mentors.filter(mentor => 
    slotsByMentor[mentor.id] && slotsByMentor[mentor.id].length > 0
  );

  console.log('🔍 availableMentors:', availableMentors);

  // 時間軸の生成（8:00-22:00、1時間刻み）
  const timeSlots = [];
  for (let hour = 8; hour <= 22; hour++) {
    timeSlots.push(hour);
  }

  if (availableMentors.length === 0) {
    return (
      <div className="mt-4">
        {/* 日表示ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={onBackToMonth}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            月表示に戻る
          </Button>
          <h4 className="text-xl font-semibold text-gray-900">
            {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })}
          </h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prevDay = new Date(selectedDate);
                prevDay.setDate(prevDay.getDate() - 1);
                onDayNavigation(prevDay);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const nextDay = new Date(selectedDate);
                nextDay.setDate(nextDay.getDate() + 1);
                onDayNavigation(nextDay);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-400 mb-2">📅</div>
          <p className="text-gray-500 font-medium">この日には利用可能なスロットがありません</p>
          <p className="text-xs text-gray-400 mt-1">別の日を選択してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* 日表示ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          onClick={onBackToMonth}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          月表示に戻る
        </Button>
        <h4 className="text-xl font-semibold text-gray-900">
          {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })}
          {isLoadingReservations && (
            <span className="ml-2 text-sm text-gray-500">予約情報読み込み中...</span>
          )}
        </h4>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const prevDay = new Date(selectedDate);
              prevDay.setDate(prevDay.getDate() - 1);
              onDayNavigation(prevDay);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const nextDay = new Date(selectedDate);
              nextDay.setDate(nextDay.getDate() + 1);
              onDayNavigation(nextDay);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Google Calendar風タイムライン表示 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* メンターヘッダー */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="grid" style={{ gridTemplateColumns: '80px repeat(' + availableMentors.length + ', 1fr)' }}>
            {/* 時間軸ヘッダー */}
            <div className="p-3 border-r border-gray-200 text-center text-sm font-medium text-gray-600">
              時間
            </div>
            
            {/* メンターヘッダー */}
            {availableMentors.map((mentor) => (
              <div key={mentor.id} className="p-3 text-center border-r border-gray-200 last:border-r-0">
                <div className="flex flex-col items-center gap-2">
                  {mentor.image ? (
                    <img
                      src={mentor.image}
                      alt={mentor.name || ''}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="text-sm font-medium text-gray-900 truncate w-full">
                    {mentor.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(slotsByMentor[mentor.id] || []).length}スロット
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* タイムライングリッド */}
        <div className="relative">
          {/* 時間軸とグリッド線 */}
          <div className="divide-y divide-gray-200">
            {timeSlots.map((hour) => (
              <div 
                key={hour}
                className="grid min-h-[60px]"
                style={{ gridTemplateColumns: '80px repeat(' + availableMentors.length + ', 1fr)' }}
              >
                {/* 時間軸 */}
                <div className="p-3 border-r border-gray-200 flex items-center justify-center bg-gray-50">
                  <div className="text-sm font-medium text-gray-600">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
                
                {/* 空のメンターセル（背景グリッド） */}
                {availableMentors.map((mentor) => (
                  <div 
                    key={`${mentor.id}-${hour}`}
                    className="border-r border-gray-200 last:border-r-0"
                  />
                ))}
              </div>
            ))}
          </div>

          {/* スロット帯の重ね表示 */}
          <div className="absolute inset-0 pointer-events-none">
            {availableMentors.map((mentor, mentorIndex) => {
              const mentorSlots = slotsByMentor[mentor.id] || [];
              
              return mentorSlots.map((slot) => {
                // スロットの時間範囲を計算
                const slotStart = new Date(slot.startTime);
                const slotEnd = new Date(slot.endTime);
                
                // グリッド上での位置計算
                const startHour = slotStart.getHours();
                const startMinute = slotStart.getMinutes();
                const endHour = slotEnd.getHours();
                const endMinute = slotEnd.getMinutes();
                
                // 8:00を基準とした相対位置
                const startPosition = (startHour - 8) + (startMinute / 60);
                const endPosition = (endHour - 8) + (endMinute / 60);
                const duration = endPosition - startPosition;
                
                // CSS Gridに合わせた正しい位置計算
                const leftPosition = `calc(80px + (${mentorIndex} * (100% - 80px) / ${availableMentors.length}))`;
                const slotWidth = `calc((100% - 80px) / ${availableMentors.length} - 2px)`;
                
                return (
                  <div key={slot.id} className="relative">
                    {/* ベーススロット帯 */}
                    <div
                      className={`absolute pointer-events-auto cursor-pointer transition-all rounded-md border-2 ${
                        slot.bookingStatus === 'available' 
                          ? 'bg-green-100 border-green-300 hover:bg-green-200'
                          : slot.bookingStatus === 'partial'
                          ? 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200'
                          : slot.bookingStatus === 'full'
                          ? 'bg-orange-100 border-orange-300'
                          : 'bg-gray-100 border-gray-300'
                      }`}
                      style={{
                        top: `${startPosition * 60}px`,
                        height: `${duration * 60 - 2}px`,
                        left: leftPosition,
                        width: slotWidth
                      }}
                      onClick={() => {
                        if (slot.bookingStatus === 'available' || slot.bookingStatus === 'partial') {
                          const selectedMentor = mentors.find(m => m.id === slot.mentorId);
                          onSlotClick(slot, selectedMentor || null);
                        }
                      }}
                    >
                      <div className="p-2 h-full flex flex-col justify-between text-xs">
                        {/* スロット基本情報 */}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {format(slotStart, 'HH:mm')}-{format(slotEnd, 'HH:mm')}
                          </div>
                          <div className="text-gray-700 font-medium">
                            {formatPrice(slot.hourlyRate || 5000)}
                          </div>
                        </div>
                        
                        {/* 予約状況サマリー */}
                        <div className="mt-1">
                          {slot.bookingStatus === 'available' && (
                            <div className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              完全空き
                            </div>
                          )}
                          {slot.bookingStatus === 'partial' && (
                            <div className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                              {slot.availableTime}分空き
                            </div>
                          )}
                          {slot.bookingStatus === 'full' && (
                            <div className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                              満席
                            </div>
                          )}
                          {slot.reservationCount > 0 && (
                            <div className="text-gray-600 text-xs mt-1">
                              {slot.reservationCount}件予約
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 生徒自身の予約を最優先で表示 */}
                    {(() => {
                      const myReservationsInSlot = myReservations.filter(res => 
                        isSameDay(new Date(res.bookedStartTime), selectedDate) &&
                        res.slotId === slot.id &&
                        (res.status === 'CONFIRMED' || res.status === 'PENDING' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL')
                      );
                      
                      console.log(`🔍 スロット ${slot.id} の自分の予約チェック:`, {
                        slotId: slot.id,
                        selectedDate: selectedDate.toISOString(),
                        myReservations: myReservations.map(res => ({
                          id: res.id,
                          slotId: res.slotId,
                          status: res.status,
                          bookedStartTime: res.bookedStartTime,
                          bookedEndTime: res.bookedEndTime,
                          isSameDay: isSameDay(new Date(res.bookedStartTime), selectedDate),
                          slotMatch: res.slotId === slot.id
                        })),
                        myReservationsInSlot
                      });
                      
                      return myReservationsInSlot.map((myReservation, myResIndex) => {
                        const resStart = new Date(myReservation.bookedStartTime);
                        const resEnd = new Date(myReservation.bookedEndTime);
                        
                        console.log(`🔍 自分の予約を表示: ${myReservation.id}`, {
                          resStart: resStart.toISOString(),
                          resEnd: resEnd.toISOString(),
                          status: myReservation.status
                        });
                        
                        // 予約時間の相対位置計算
                        const resStartPos = (resStart.getHours() - 8) + (resStart.getMinutes() / 60);
                        const resEndPos = (resEnd.getHours() - 8) + (resEnd.getMinutes() / 60);
                        const resDuration = resEndPos - resStartPos;
                        
                        // 生徒自身の予約の色分け
                        const myReservationColors = {
                          CONFIRMED: 'bg-blue-200 border-blue-500 text-blue-900',
                          APPROVED: 'bg-green-200 border-green-500 text-green-900',
                          PENDING_APPROVAL: 'bg-orange-200 border-orange-500 text-orange-900',
                          PENDING: 'bg-yellow-200 border-yellow-500 text-yellow-900'
                        };
                        
                        const statusText = {
                          CONFIRMED: '確定済み',
                          APPROVED: '承認済み',
                          PENDING_APPROVAL: '承認待ち',
                          PENDING: '保留中'
                        };
                        
                        return (
                          <div
                            key={`my-reservation-${myReservation.id}-${myResIndex}`}
                            className={`absolute rounded-md border-3 ${
                              myReservationColors[myReservation.status as keyof typeof myReservationColors] || 'bg-gray-200 border-gray-500 text-gray-900'
                            }`}
                            style={{
                              top: `${resStartPos * 60 + 2}px`,
                              height: `${resDuration * 60 - 4}px`,
                              left: leftPosition,
                              width: slotWidth,
                              zIndex: 20 // 他の予約より上に表示
                            }}
                          >
                            <div className="p-2 h-full flex flex-col justify-center text-xs">
                              <div className="font-bold text-center">
                                🎵 あなたの予約
                              </div>
                              <div className="font-semibold text-center">
                                {format(resStart, 'HH:mm')}-{format(resEnd, 'HH:mm')}
                              </div>
                              <div className="text-center text-xs opacity-90">
                                {statusText[myReservation.status as keyof typeof statusText] || myReservation.status}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                    
                    {/* 他の予約の重ね表示（プライバシー保護） */}
                    {(() => {
                      // このスロットに関連する他の予約を取得
                      const otherReservationsInSlot = otherReservations.filter(res => 
                        isSameDay(new Date(res.bookedStartTime), selectedDate) &&
                        res.slotId === slot.id &&
                        (res.status === 'CONFIRMED' || res.status === 'PENDING' || res.status === 'APPROVED' || res.status === 'PENDING_APPROVAL')
                      );
                      
                      return otherReservationsInSlot.map((otherReservation, otherResIndex) => {
                        const resStart = new Date(otherReservation.bookedStartTime);
                        const resEnd = new Date(otherReservation.bookedEndTime);
                        
                        // 予約時間の相対位置計算
                        const resStartPos = (resStart.getHours() - 8) + (resStart.getMinutes() / 60);
                        const resEndPos = (resEnd.getHours() - 8) + (resEnd.getMinutes() / 60);
                        const resDuration = resEndPos - resStartPos;
                        
                        return (
                          <div
                            key={`other-reservation-${otherReservation.id}-${otherResIndex}`}
                            className={`absolute rounded border-2 ${
                              otherReservation.status === 'CONFIRMED' 
                                ? 'bg-red-200 border-red-400' 
                                : 'bg-orange-200 border-orange-400'
                            }`}
                            style={{
                              top: `${resStartPos * 60 + 2}px`,
                              height: `${resDuration * 60 - 4}px`,
                              left: leftPosition,
                              width: slotWidth,
                              zIndex: 10
                            }}
                          >
                            <div className="p-1 text-xs">
                              <div className={`font-medium ${
                                otherReservation.status === 'CONFIRMED' 
                                  ? 'text-red-800' 
                                  : 'text-orange-800'
                              }`}>
                                {format(resStart, 'HH:mm')}-{format(resEnd, 'HH:mm')}
                              </div>
                              <div className={`text-xs ${
                                otherReservation.status === 'CONFIRMED' 
                                  ? 'text-red-700' 
                                  : 'text-orange-700'
                              }`}>
                                {otherReservation.status === 'CONFIRMED' ? '予約済み' : '保留中'}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>
      
      {/* 日表示の凡例 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-3">タイムライン表示の見方</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* 生徒の予約凡例 */}
          <div>
            <h6 className="text-xs font-medium text-gray-600 mb-2">あなたの予約</h6>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-6 bg-blue-200 border-2 border-blue-500 rounded text-blue-900 text-xs flex items-center justify-center">🎵</div>
                <span>確定済み</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-6 bg-green-200 border-2 border-green-500 rounded text-green-900 text-xs flex items-center justify-center">🎵</div>
                <span>承認済み（決済待ち）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-6 bg-orange-200 border-2 border-orange-500 rounded text-orange-900 text-xs flex items-center justify-center">🎵</div>
                <span>承認待ち</span>
              </div>
            </div>
          </div>
          
          {/* 他の予約凡例 */}
          <div>
            <h6 className="text-xs font-medium text-gray-600 mb-2">他の予約</h6>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-6 bg-red-200 border-2 border-red-400 rounded text-red-800 text-xs flex items-center justify-center">時</div>
                <span>確定済み（時間のみ表示）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-6 bg-orange-200 border-2 border-orange-400 rounded text-orange-800 text-xs flex items-center justify-center">時</div>
                <span>保留中（時間のみ表示）</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-[10px] text-gray-600 border-t pt-2 mt-3">
          💡 <strong>プライバシー保護:</strong> 他の生徒の予約は時間のみ表示され、個人情報は表示されません
          <br />💡 <strong>予約状況:</strong> {otherReservations.length}件の他の予約が表示されています
        </div>
      </div>
    </div>
  );
}; 