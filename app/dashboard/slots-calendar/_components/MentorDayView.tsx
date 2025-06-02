'use client';

import React, { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/app/components/ui/button';
import { ChevronLeft, ChevronRight, User, CheckCircle, XCircle, Plus } from 'lucide-react';
import { SlotModal } from './SlotModal';

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
    totalAmount?: number;
    notes?: string;
    student?: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface MentorDayViewProps {
  selectedDate: Date;
  slots: MentorLessonSlot[];
  isLoading: boolean;
  onBackToMonth: () => void;
  onDayNavigation: (date: Date) => void;
  onReservationClick: (reservation: MentorLessonSlot['reservations'][0]) => void;
  onApprove?: (reservationId: string) => Promise<void>;
  userRole: 'student' | 'mentor' | 'admin';
  onSlotUpdate?: (updatedSlot: MentorLessonSlot) => void;
  onSlotDelete?: (deletedSlotId: string) => void;
}

export const MentorDayView: React.FC<MentorDayViewProps> = ({
  selectedDate,
  slots,
  isLoading,
  onBackToMonth,
  onDayNavigation,
  onReservationClick,
  onApprove,
  userRole,
  onSlotUpdate,
  onSlotDelete,
}) => {
  // デバッグ: 基本情報のみ（パフォーマンス重視）
  console.log(`📅 MentorDayView render START: ${selectedDate.toDateString()}, slots: ${slots.length}, role: ${userRole}`);
  
  // PENDING_APPROVALの予約を確認
  const pendingApprovalReservations = slots.flatMap(slot => 
    slot.reservations?.filter(res => res.status === 'PENDING_APPROVAL') || []
  );
  if (pendingApprovalReservations.length > 0) {
    console.log('🔍 MentorDayView - PENDING_APPROVAL予約:', pendingApprovalReservations.length + '件', pendingApprovalReservations);
  }

  // モーダル関連のstate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MentorLessonSlot | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');

  // isModalOpenの変化を追跡
  useEffect(() => {
    console.log('🔍 isModalOpen changed to:', isModalOpen);
  }, [isModalOpen]);

  // 料金フォーマット関数
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  // その日のスロットをフィルタ
  const daySlots = slots.filter(slot => 
    isSameDay(new Date(slot.startTime), selectedDate)
  );
  
  // デバッグ: PENDING_APPROVALの予約を確認
  useEffect(() => {
    console.log('🔍 MentorDayView - 選択日:', selectedDate.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    console.log('🔍 MentorDayView - その日のスロット数:', daySlots.length);
    
    if (daySlots.length > 0) {
      daySlots.forEach(slot => {
        console.log('🔍 スロット詳細:', {
          id: slot.id,
          startTime: new Date(slot.startTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          endTime: new Date(slot.endTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          予約数: slot.reservations?.length || 0
        });
      });
      
      const allReservations = daySlots.flatMap(slot => slot.reservations || []);
      console.log('🔍 MentorDayView - 全予約数:', allReservations.length);
      console.log('🔍 MentorDayView - 予約ステータス内訳:', 
        allReservations.reduce((acc, res) => {
          acc[res.status] = (acc[res.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
      
      const pendingApprovalReservations = allReservations.filter(res => res.status === 'PENDING_APPROVAL');
      console.log('🔍 MentorDayView - PENDING_APPROVAL予約:', pendingApprovalReservations.length);
      if (pendingApprovalReservations.length > 0) {
        console.log('🔍 PENDING_APPROVAL予約詳細:', pendingApprovalReservations);
      }
    } else {
      console.log('⚠️ その日のスロットが見つかりません');
    }
  }, [daySlots, selectedDate]);
  
  // 時間軸の生成（0:00-23:00、24時間表示）
  const timeSlots = [];
  for (let hour = 0; hour <= 23; hour++) {
    timeSlots.push(hour);
  }

  // 新規スロット作成ハンドラー
  const handleCreateSlot = () => {
    console.log('🔧 handleCreateSlot called');
    console.log('Setting modal state:', { 
      selectedSlot: null, 
      modalMode: 'create', 
      isModalOpen: true,
      hasCallbacks: !!(onSlotUpdate && onSlotDelete)
    });
    setSelectedSlot(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // スロット編集ハンドラー
  const handleEditSlot = (slot: MentorLessonSlot) => {
    setSelectedSlot(slot);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // モーダルを閉じる処理
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  if (daySlots.length === 0) {
    console.log('📅 MentorDayView: No slots for this day, rendering empty state');
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
          <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
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
          <p className="text-gray-500 font-medium">この日にはスロットがありません</p>
          {userRole === 'mentor' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateSlot}
              className="mt-4 flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              新規スロット作成
            </Button>
          ) : (
            <p className="text-xs text-gray-400 mt-1">別の日を選択してください</p>
          )}
        </div>
        
        {/* スロット詳細/編集モーダル */}
        {(() => {
          console.log('🎯 Modal section render (empty state):', {
            isModalOpen,
            modalMode,
            selectedSlot,
            selectedDate,
            hasOnSlotUpdate: !!onSlotUpdate,
            hasOnSlotDelete: !!onSlotDelete
          });
          return null;
        })()}
        {isModalOpen ? (
          <>
            {console.log('✅ Rendering SlotModal because isModalOpen is true (empty state)')}
            <SlotModal
              isOpen={isModalOpen}
              onClose={handleModalClose}
              slot={selectedSlot}
              selectedDate={selectedDate}
              mode={modalMode}
              onSlotUpdate={onSlotUpdate || (() => { console.log('Empty onSlotUpdate called'); })}
              onSlotDelete={onSlotDelete || (() => { console.log('Empty onSlotDelete called'); })}
            />
          </>
        ) : (
          console.log('❌ Not rendering SlotModal because isModalOpen is false (empty state)') || null
        )}
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
        <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
          {format(selectedDate, 'yyyy年M月d日 (EEEE)', { locale: ja })}
          {isLoading && (
            <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
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
      
      {/* タイムライン表示 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">
              {daySlots.length}件のレッスンスロット
            </div>
            {userRole === 'mentor' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateSlot}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                新規スロット作成
              </Button>
            )}
          </div>
        </div>

        {/* タイムライングリッド */}
        <div className="relative">
          {/* 時間軸 */}
          <div className="divide-y divide-gray-200">
            {timeSlots.map((hour) => (
              <div 
                key={hour}
                className="grid grid-cols-[80px_1fr] min-h-[60px] relative"
              >
                {/* 時間ラベル */}
                <div className="p-3 border-r border-gray-200 flex items-center justify-center bg-gray-50">
                  <div className="text-sm font-medium text-gray-600">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                </div>
                
                {/* スロット表示エリア */}
                <div className="relative p-2">
                  {/* この時間帯のスロットを表示 */}
                  {daySlots.map((slot, slotIndex) => {
                    const slotStart = new Date(slot.startTime);
                    const slotEnd = new Date(slot.endTime);
                    const slotStartHour = slotStart.getHours();
                    const slotEndHour = slotEnd.getHours();
                    
                    // この時間帯にスロットが重なっているかチェック
                    if (slotStartHour <= hour && hour < slotEndHour) {
                      // スロット内の位置計算
                      const startPosition = slotStartHour === hour ? 
                        (slotStart.getMinutes() / 60) * 60 : 0;
                      const endPosition = slotEndHour === hour + 1 ? 
                        (slotEnd.getMinutes() / 60) * 60 : 60;
                      const duration = endPosition - startPosition;
                      
                      // このスロットが最初に表示される時間帯かどうか
                      const isFirstDisplay = slotStartHour === hour;
                      
                      if (!isFirstDisplay) return null; // 最初の時間帯でのみ表示
                      
                      // スロット全体の高さを計算
                      const totalDuration = (slotEnd.getTime() - slotStart.getTime()) / (1000 * 60);
                      const totalHeight = totalDuration;
                      
                      return (
                        <div
                          key={slot.id}
                          className="absolute left-2 right-2 bg-blue-100 border border-blue-300 rounded-lg overflow-hidden"
                          style={{
                            top: `${startPosition}px`,
                            height: `${totalHeight}px`,
                            zIndex: 10
                          }}
                        >
                          {/* スロット基本情報 */}
                          <div className="p-2 bg-blue-50 border-b border-blue-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-semibold text-blue-900 text-sm">
                                  {format(slotStart, 'HH:mm')}-{format(slotEnd, 'HH:mm')}
                                </div>
                                <div className="text-blue-700 text-xs">
                                  {formatPrice(slot.hourlyRate || 5000)}
                                </div>
                              </div>
                              <div className="text-xs text-blue-600">
                                {slot.reservations?.length || 0}件予約
                                {console.log('🔍 スロット内の予約数:', slot.reservations?.length, 'データ:', slot.reservations)}
                              </div>
                            </div>
                          </div>
                          
                          {/* 予約一覧 */}
                          <div className="p-1 space-y-1">
                            {slot.reservations?.map((reservation, resIndex) => {
                              // デバッグ: 予約データの構造を確認
                              console.log('🔍 予約データ:', {
                                id: reservation.id,
                                status: reservation.status,
                                bookedStartTime: reservation.bookedStartTime,
                                bookedEndTime: reservation.bookedEndTime,
                                student: reservation.student,
                                全データ: reservation
                              });
                              
                              const resStart = new Date(reservation.bookedStartTime || '');
                              const resEnd = new Date(reservation.bookedEndTime || '');
                              
                              // ステータス別の色分け
                              const statusColors = {
                                PENDING_APPROVAL: 'bg-orange-100 border-orange-300 text-orange-800',
                                APPROVED: 'bg-green-100 border-green-300 text-green-800',
                                CONFIRMED: 'bg-blue-100 border-blue-300 text-blue-800',
                                REJECTED: 'bg-red-100 border-red-300 text-red-800',
                                CANCELED: 'bg-gray-100 border-gray-300 text-gray-600',
                              };
                              
                              return (
                                <div
                                  key={reservation.id}
                                  className={`
                                    p-3 rounded border transition-opacity min-h-[80px] flex flex-col gap-2
                                    ${statusColors[reservation.status as keyof typeof statusColors] || 'bg-gray-100 border-gray-300 text-gray-800'}
                                  `}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <User className="h-4 w-4 flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="text-sm font-medium">
                                          {reservation.student?.name || 'ユーザー'}
                                        </div>
                                        <div className="text-xs opacity-75">
                                          {format(resStart, 'HH:mm')}-{format(resEnd, 'HH:mm')}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {/* ステータス別の操作ボタン - PC対応の大きさに修正 */}
                                      {reservation.status === 'PENDING_APPROVAL' && userRole === 'mentor' && onApprove && (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log(`✅ 承認: ${reservation.id}`);
                                              onApprove(reservation.id);
                                            }}
                                            className="px-2 py-1 rounded text-xs font-medium bg-green-100 hover:bg-green-200 text-green-700 border border-green-300 transition-colors flex items-center gap-1"
                                            title="承認"
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                            承認
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              console.log(`❌ 拒否詳細: ${reservation.id}`);
                                              onReservationClick(reservation);
                                            }}
                                            className="px-2 py-1 rounded text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition-colors flex items-center gap-1"
                                            title="拒否"
                                          >
                                            <XCircle className="h-4 w-4" />
                                            拒否
                                          </button>
                                        </>
                                      )}
                                      {(reservation.status === 'APPROVED' || reservation.status === 'CONFIRMED') && userRole === 'mentor' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            console.log(`🗑️ キャンセル詳細: ${reservation.id}`);
                                            onReservationClick(reservation);
                                          }}
                                          className="px-2 py-1 rounded text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 transition-colors flex items-center gap-1"
                                          title="キャンセル"
                                        >
                                          <XCircle className="h-4 w-4" />
                                          キャンセル
                                        </button>
                                      )}
                                      {/* 詳細表示ボタン（他のステータスや情報確認用） */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          console.log(`👤 詳細: ${reservation.id}`);
                                          onReservationClick(reservation);
                                        }}
                                        className="px-2 py-1 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors flex items-center gap-1"
                                        title="詳細"
                                      >
                                        <User className="h-4 w-4" />
                                        詳細
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 日表示の凡例 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-medium text-gray-700 mb-3">タイムライン表示の見方</h5>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <h6 className="text-xs font-medium text-gray-600 mb-2">予約ステータス</h6>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                <span>承認待ち</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>承認済み</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>確定済み</span>
              </div>
            </div>
          </div>
          
          <div>
            <h6 className="text-xs font-medium text-gray-600 mb-2">操作</h6>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>承認（承認待ちの予約）</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>拒否・キャンセル</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600" />
                <span>詳細表示</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 border-t pt-2 mt-3">
          💡 <strong>操作方法:</strong> 予約カード内のボタンで直接操作、グレーボタンで詳細表示
        </div>
      </div>

      {/* スロット詳細/編集モーダル */}
      {(() => {
        console.log('🎯 Modal section render:', {
          isModalOpen,
          modalMode,
          selectedSlot,
          selectedDate,
          hasOnSlotUpdate: !!onSlotUpdate,
          hasOnSlotDelete: !!onSlotDelete
        });
        return null;
      })()}
      {isModalOpen ? (
        <>
          {console.log('✅ Rendering SlotModal because isModalOpen is true')}
          <SlotModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            slot={selectedSlot}
            selectedDate={selectedDate}
            mode={modalMode}
            onSlotUpdate={onSlotUpdate || (() => { console.log('Empty onSlotUpdate called'); })}
            onSlotDelete={onSlotDelete || (() => { console.log('Empty onSlotDelete called'); })}
          />
        </>
      ) : (
        console.log('❌ Not rendering SlotModal because isModalOpen is false') || null
      )}
    </div>
  );
}; 