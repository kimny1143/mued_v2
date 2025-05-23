'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { X, Clock, Edit, Trash2, Users, DollarSign, Save, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { supabaseBrowser } from '@/lib/supabase-browser';

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

interface SlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: MentorLessonSlot | null;
  selectedDate: Date | null;
  mode: 'view' | 'edit' | 'create';
  onSlotUpdate: (updatedSlot: MentorLessonSlot) => void;
  onSlotDelete: (deletedSlotId: string) => void;
}

export const SlotModal: React.FC<SlotModalProps> = ({
  isOpen,
  onClose,
  slot,
  selectedDate,
  mode,
  onSlotUpdate,
  onSlotDelete,
}) => {
  const [currentMode, setCurrentMode] = useState<'view' | 'edit' | 'create'>(mode);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    hourlyRate: 5000,
    description: '',
    isAvailable: true,
    minDuration: 30,
    maxDuration: 120,
  });

  // モードが変更されたときに currentMode を更新
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // スロットデータをフォームに設定
  useEffect(() => {
    if (slot) {
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);
      
      setFormData({
        startTime: format(startTime, 'HH:mm'),
        endTime: format(endTime, 'HH:mm'),
        hourlyRate: slot.hourlyRate || 5000,
        description: slot.description || '',
        isAvailable: slot.isAvailable,
        minDuration: slot.minDuration || 30,
        maxDuration: slot.maxDuration || 120,
      });
    } else if (selectedDate && currentMode === 'create') {
      // 新規作成時のデフォルト値
      setFormData({
        startTime: '10:00',
        endTime: '11:00',
        hourlyRate: 5000,
        description: '',
        isAvailable: true,
        minDuration: 30,
        maxDuration: 120,
      });
    }
  }, [slot, selectedDate, currentMode]);

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.startTime || !formData.endTime) {
      setError('開始時間と終了時間を入力してください。');
      return false;
    }
    
    const startTime = new Date(`2024-01-01T${formData.startTime}`);
    const endTime = new Date(`2024-01-01T${formData.endTime}`);
    
    if (endTime <= startTime) {
      setError('終了時間は開始時間より後にしてください。');
      return false;
    }
    
    if (formData.hourlyRate <= 0) {
      setError('料金は0円より大きい金額を入力してください。');
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // 認証トークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const targetDate = selectedDate || new Date(slot!.startTime);
      const startDateTime = new Date(targetDate);
      const endDateTime = new Date(targetDate);
      
      // 時間を設定
      const [startHour, startMin] = formData.startTime.split(':').map(Number);
      const [endHour, endMin] = formData.endTime.split(':').map(Number);
      
      startDateTime.setHours(startHour, startMin, 0, 0);
      endDateTime.setHours(endHour, endMin, 0, 0);

      const slotData = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        hourlyRate: formData.hourlyRate,
        description: formData.description,
        isAvailable: formData.isAvailable,
        minDuration: formData.minDuration,
        maxDuration: formData.maxDuration,
        currency: 'JPY',
      };

      let response;
      
      if (currentMode === 'create') {
        // 新規作成
        response = await fetch('/api/lesson-slots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(slotData),
          credentials: 'include',
        });
      } else if (currentMode === 'edit' && slot) {
        // 編集
        response = await fetch(`/api/lesson-slots/${slot.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(slotData),
          credentials: 'include',
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.error || 'スロットの保存に失敗しました');
      }

      const savedSlot = await response.json();
      
      // 親コンポーネントに更新を通知
      if (currentMode === 'create') {
        // 新規作成の場合は画面をリロードする必要があるかも
        window.location.reload();
      } else {
        onSlotUpdate(savedSlot);
      }
      
      onClose();
      
    } catch (error) {
      console.error('スロット保存エラー:', error);
      setError(error instanceof Error ? error.message : 'スロットの保存中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!slot || !confirm('このスロットを削除しますか？')) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // 認証トークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) {
        throw new Error('認証が必要です。ログインしてください。');
      }

      const response = await fetch(`/api/lesson-slots/${slot.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || 'スロットの削除に失敗しました');
      }

      onSlotDelete(slot.id);
      onClose();
      
    } catch (error) {
      console.error('スロット削除エラー:', error);
      setError(error instanceof Error ? error.message : 'スロットの削除中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSlotStatus = (slot: MentorLessonSlot) => {
    if (!slot.isAvailable) return { text: '無効', color: 'text-gray-500' };
    if (slot.reservations?.some(r => r.status === 'CONFIRMED')) return { text: '予約済み', color: 'text-orange-600' };
    if (slot.reservations?.some(r => r.status === 'PENDING')) return { text: '保留中', color: 'text-yellow-600' };
    return { text: '利用可能', color: 'text-green-600' };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(price);
  };

  if (!isOpen) return null;

  const displayDate = selectedDate || (slot ? new Date(slot.startTime) : new Date());
  const status = slot ? getSlotStatus(slot) : null;

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* モーダル */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  {currentMode === 'create' ? (
                    <Plus className="h-5 w-5 text-primary" />
                  ) : (
                    <Clock className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentMode === 'create' ? 'スロット作成' : 
                     currentMode === 'edit' ? 'スロット編集' : 'スロット詳細'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {format(displayDate, 'yyyy年M月d日 (EEEE)', { locale: ja })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentMode === 'view' && slot && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMode('edit')}
                      disabled={isProcessing}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isProcessing}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      削除
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="w-8 h-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* コンテンツ */}
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* エラー表示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {currentMode === 'view' && slot ? (
                /* 詳細表示モード */
                <div className="space-y-6">
                  {/* ステータス */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">ステータス</span>
                      <span className={`text-sm font-medium ${status?.color}`}>
                        {status?.text}
                      </span>
                    </div>
                  </div>

                  {/* 時間と料金 */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">時間</h4>
                      <p className="text-lg">
                        {format(new Date(slot.startTime), 'HH:mm')} - 
                        {format(new Date(slot.endTime), 'HH:mm')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / (1000 * 60))}分
                      </p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">料金</h4>
                      <p className="text-lg font-medium text-primary">
                        {formatPrice(slot.hourlyRate || 0)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {slot.minDuration}-{slot.maxDuration}分対応
                      </p>
                    </div>
                  </div>

                  {/* 説明 */}
                  {slot.description && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">説明</h4>
                      <p className="text-gray-700">{slot.description}</p>
                    </div>
                  )}

                  {/* 予約情報 */}
                  {slot.reservations && slot.reservations.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">予約情報</h4>
                      <div className="space-y-2">
                        {slot.reservations.map((reservation) => (
                          <div key={reservation.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <p className="font-medium">{reservation.student?.name || '学生'}</p>
                              <p className="text-sm text-gray-600">
                                {reservation.bookedStartTime && reservation.bookedEndTime && (
                                  <>
                                    {format(new Date(reservation.bookedStartTime), 'HH:mm')} - 
                                    {format(new Date(reservation.bookedEndTime), 'HH:mm')}
                                  </>
                                )}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              reservation.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                              reservation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {reservation.status === 'CONFIRMED' ? '確定' :
                               reservation.status === 'PENDING' ? '保留' : reservation.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 編集・作成モード */
                <div className="space-y-6">
                  {/* 時間設定 */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        開始時間
                      </label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleInputChange('startTime', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        終了時間
                      </label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => handleInputChange('endTime', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 料金設定 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      時間料金（円）
                    </label>
                    <Input
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => handleInputChange('hourlyRate', parseInt(e.target.value) || 0)}
                      min="0"
                      step="100"
                    />
                  </div>

                  {/* 予約可能時間の設定 */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最小予約時間（分）
                      </label>
                      <Input
                        type="number"
                        value={formData.minDuration}
                        onChange={(e) => handleInputChange('minDuration', parseInt(e.target.value) || 30)}
                        min="15"
                        step="15"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大予約時間（分）
                      </label>
                      <Input
                        type="number"
                        value={formData.maxDuration}
                        onChange={(e) => handleInputChange('maxDuration', parseInt(e.target.value) || 120)}
                        min="15"
                        step="15"
                      />
                    </div>
                  </div>

                  {/* 説明 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明（任意）
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="レッスンの詳細や注意事項があれば入力してください"
                      rows={3}
                    />
                  </div>

                  {/* 利用可能フラグ */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isAvailable"
                      checked={formData.isAvailable}
                      onChange={(e) => handleInputChange('isAvailable', e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="isAvailable" className="ml-2 text-sm text-gray-700">
                      このスロットを予約可能にする
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isProcessing}
                >
                  {currentMode === 'view' ? '閉じる' : 'キャンセル'}
                </Button>
                
                {(currentMode === 'edit' || currentMode === 'create') && (
                  <Button
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {currentMode === 'create' ? '作成' : '保存'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 