'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Toaster } from 'sonner';
import { Calendar } from '@/app/components/ui/calendar';
import { TimeSelect } from '@/app/components/ui/time-select';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XIcon,
  FilterIcon,
  PlusCircleIcon,
  Loader2Icon,
  Plus,
  AlertCircle,
  Clock,
  Edit,
  Trash2
} from 'lucide-react';

// シンプルなアラートコンポーネント
const Alert: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={`p-4 border rounded-md bg-yellow-50 border-yellow-200 text-yellow-800 ${className || ''}`}>
    {children}
  </div>
);

const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm">{children}</div>
);

const AlertTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h5 className="font-medium mb-1">{children}</h5>
);

// レッスンスロットデータの型定義
interface LessonSlot {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  teacherId: string;
  isAvailable: boolean;
  teacher?: {
    id: string;
    name: string;
    email?: string;
    image?: string;
  };
  reservations?: Array<{
    id: string;
    status: string;
    studentId: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export default function LessonSlotsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [slotLoading, setSlotLoading] = useState<boolean>(false);
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState<{
    startTime: string;
    endTime: string;
    hourlyRate: string;
    minHours: string;
    maxHours: string;
  }>({
    startTime: '',
    endTime: '',
    hourlyRate: '5000', // デフォルト5000円
    minHours: '1',      // デフォルト1時間
    maxHours: '',       // 空白は制限なし
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [groupedSlots, setGroupedSlots] = useState<Record<string, LessonSlot[]>>({});

  // 編集モード用の状態を追加
  const [editingSlot, setEditingSlot] = useState<LessonSlot | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    startTime: string;
    endTime: string;
    hourlyRate: string;
    minHours: string;
    maxHours: string;
  }>({
    startTime: '',
    endTime: '',
    hourlyRate: '5000',
    minHours: '1',
    maxHours: '',
  });

  // ユーザー情報とロールの取得
  useEffect(() => {
    async function getUserInfo() {
      try {
        setLoading(true);
        
        // 認証セッションの取得
        const { data, error } = await supabaseBrowser.auth.getSession();
        
        if (error) {
          console.error('セッション取得エラー:', error);
          router.push('/login');
          return;
        }
        
        if (!data.session) {
          console.log('未認証状態');
          router.push('/login');
          return;
        }
        
        // ユーザーロールをAPI経由で取得
        try {
          const response = await fetch(`/api/user?userId=${data.session.user.id}`);
          
          if (!response.ok) {
            throw new Error('ユーザー情報の取得に失敗しました');
          }
          
          const userData = await response.json();
          console.log('API応答からのユーザーデータ:', userData);
          
          // ロール判定用の変数 - 新しいroleName属性を優先的に使用
          const roleName = userData.roleName?.toLowerCase() || '';
          const roleId = userData.roleId || '';
          
          console.log('取得したロール情報:', { roleName, roleId });
          
          // ユーザーロールを判定する
          let determinedRole = 'student'; // デフォルトは学生
          
          // 1. roleName（文字列名）でロール判定
          if (roleName === 'mentor') {
            determinedRole = 'mentor';
          } else if (roleName === 'administrator' || roleName === 'admin') {
            determinedRole = 'admin';
          } 
          // 2. roleNameがない場合はroleIdで判定（旧式）
          else if (roleId === 'mentor') {
            determinedRole = 'mentor';
          } else if (roleId === 'admin') {
            determinedRole = 'admin';
          }
          
          console.log('判定されたユーザーロール:', determinedRole);
          
          // 状態に保存
          setUserRole(determinedRole);
          
          // メンターまたは管理者でない場合はダッシュボードにリダイレクト
          if (determinedRole !== 'mentor' && determinedRole !== 'admin') {
            toast.error('メンター専用のページです');
            router.push('/dashboard');
            return;
          }
        } catch (err) {
          console.error('ユーザーAPIエラー:', err);
          toast.error('ユーザー情報の取得に失敗しました');
          router.push('/dashboard');
          return;
        }
        
        // レッスンスロットの取得
        await fetchLessonSlots();
      } catch (err) {
        console.error('ユーザー情報取得エラー:', err);
        toast.error('エラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    
    getUserInfo();
  }, [router]);

  // レッスンスロット取得
  const fetchLessonSlots = async () => {
    try {
      setSlotLoading(true);
      
      // Supabaseから認証トークンを取得して、APIリクエストに含める
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('認証トークンが取得できません');
      }
      
      const response = await fetch('/api/lesson-slots?viewMode=own', {
        headers: {
          'Authorization': `Bearer ${token}` // 認証トークンをヘッダーに追加
        }
      });
      
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status}`);
      }
      
      const data = await response.json();
      setSlots(data as LessonSlot[]);
      
      // 日付ごとにグループ化
      const grouped = (data as LessonSlot[]).reduce((acc: Record<string, LessonSlot[]>, slot: LessonSlot) => {
        const date = new Date(slot.startTime).toLocaleDateString('ja-JP');
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(slot);
        return acc;
      }, {});
      
      // 日付でソート
      const sortedGrouped = Object.entries(grouped)
        .sort(([dateA], [dateB]) => {
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        })
        .reduce((obj: Record<string, LessonSlot[]>, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
      
      setGroupedSlots(sortedGrouped);
    } catch (err) {
      console.error('レッスンスロット取得エラー:', err);
      setError('レッスンスロットの取得に失敗しました');
    } finally {
      setSlotLoading(false);
    }
  };

  // レッスンスロット作成の処理
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // バリデーション - 必須項目のみチェックするよう修正（maxHoursは任意項目）
      if (!selectedDate) {
        setError('日付を選択してください');
        return;
      }
      
      if (!formData.startTime || !formData.endTime) {
        setError('開始時間と終了時間を入力してください');
        return;
      }

      // hourlyRateは必須（デフォルト値があるが念のためチェック）
      if (!formData.hourlyRate) {
        setError('時間単価を入力してください');
        return;
      }
      
      // minHoursは必須（デフォルト値があるが念のためチェック）
      if (!formData.minHours) {
        setError('最小予約時間を入力してください');
        return;
      }
      
      // 選択された日付とフォームの時間を組み合わせて日時を作成
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startTime = new Date(`${dateStr}T${formData.startTime}:00`);
      const endTime = new Date(`${dateStr}T${formData.endTime}:00`);
      
      // 開始時間が終了時間より前であることを確認
      if (startTime >= endTime) {
        setError('開始時間は終了時間より前である必要があります');
        return;
      }
      
      // 過去の時間でないことを確認
      const now = new Date();
      if (startTime <= now) {
        setError('開始時間は現在より後である必要があります');
        return;
      }
      
      setError(null);
      setSlotLoading(true);
      
      // 認証トークンを取得
      const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
      
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error('認証情報の取得に失敗しました。もう一度ログインしてください。');
      }
      
      const token = sessionData.session.access_token;
      console.log('認証トークン取得成功:', token.substring(0, 10) + '...');
      
      // APIリクエスト
      const response = await fetch('/api/lesson-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hourlyRate: formData.hourlyRate,
          minHours: formData.minHours,
          // maxHoursは空でもOK、その場合はnullを送信
          maxHours: formData.maxHours || null,
          isAvailable: true,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('APIエラーレスポンス:', response.status, errorData);
        throw new Error(errorData.error || `Error ${response.status}: レッスンスロットの作成に失敗しました`);
      }
      
      const newSlot = await response.json();
      
      // 成功メッセージ
      toast.success('レッスンスロットを作成しました');
      
      // フォームリセット
      setFormData({
        startTime: '',
        endTime: '',
        hourlyRate: '5000',
        minHours: '1',
        maxHours: '',
      });
      setSelectedDate(undefined);
      
      // ダイアログを閉じる
      setIsDialogOpen(false);
      
      // レッスンスロット再取得
      await fetchLessonSlots();
    } catch (err) {
      console.error('レッスンスロット作成エラー:', err);
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setSlotLoading(false);
    }
  };

  // フォームで時間を扱う
  const handleTimeChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 編集フォーム用のハンドラー
  const handleEditTimeChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // スロット編集の開始
  const handleEditSlot = (slot: LessonSlot, e: React.MouseEvent) => {
    e.stopPropagation(); // 親要素のクリックイベントを停止
    
    // 編集フォームにデータを設定
    const startTime = format(new Date(slot.startTime), 'HH:mm');
    const endTime = format(new Date(slot.endTime), 'HH:mm');
    
    setEditingSlot(slot);
    setEditFormData({
      startTime,
      endTime,
      hourlyRate: '5000', // API से लौटाया गया डेटा में hourlyRate नहीं है, डिफ़ॉल्ट वैल्यू का उपयोग
      minHours: '1',     // डिफ़ॉल्ट वैल्यू
      maxHours: '',      // डिफ़ॉल्ट वैल्यू
    });
    setEditError(null); // エラーをクリア
    setIsEditDialogOpen(true);
  };

  // 特定日付での新規スロット作成
  const handleCreateSlotForDate = (dateStr: string) => {
    // 日付文字列をDateオブジェクトに変換
    const date = new Date(dateStr);
    setSelectedDate(date);
    setIsDialogOpen(true);
  };

  // スロット編集の処理
  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSlot) return;
    
    try {
      // バリデーション
      if (!editFormData.startTime || !editFormData.endTime) {
        setEditError('開始時間と終了時間を入力してください');
        return;
      }

      // 編集中のスロットの日付を取得
      const slotDate = new Date(editingSlot.startTime);
      const dateStr = format(slotDate, 'yyyy-MM-dd');
      const startTime = new Date(`${dateStr}T${editFormData.startTime}:00`);
      const endTime = new Date(`${dateStr}T${editFormData.endTime}:00`);
      
      // 開始時間が終了時間より前であることを確認
      if (startTime >= endTime) {
        setEditError('開始時間は終了時間より前である必要があります');
        return;
      }
      
      setEditError(null);
      setSlotLoading(true);
      
      // 認証トークンを取得
      const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();
      
      if (sessionError || !sessionData.session?.access_token) {
        throw new Error('認証情報の取得に失敗しました。');
      }
      
      const token = sessionData.session.access_token;
      
      // APIリクエスト (PUTメソッドで更新)
      const response = await fetch(`/api/lesson-slots/${editingSlot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          hourlyRate: editFormData.hourlyRate,
          minHours: editFormData.minHours,
          maxHours: editFormData.maxHours || null,
          isAvailable: editingSlot.isAvailable, // 既存の状態を保持
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `レッスンスロットの更新に失敗しました`);
      }
      
      // 成功メッセージ
      toast.success('レッスンスロットを更新しました');
      
      // ダイアログを閉じる
      setIsEditDialogOpen(false);
      setEditingSlot(null);
      
      // レッスンスロット再取得
      await fetchLessonSlots();
    } catch (err) {
      console.error('レッスンスロット更新エラー:', err);
      setEditError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setSlotLoading(false);
    }
  };

  async function book(slotId: string) {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.access_token) throw new Error('not authed');

      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slotId }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'failed');

      // Stripe の hosted URL へ遷移
      window.location.href = json.checkoutUrl ?? json.url;
    } catch (e) {
      console.error(e);
      toast.error('予約に失敗しました');
    }
  }

  // ローディング中表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>読み込み中...</p>
      </div>
    );
  }
  
  // メンター・管理者以外の場合
  if (userRole !== 'mentor' && userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-center">このページにアクセスする権限がありません。</p>
      </div>
    );
  }

  return (
    <>
      {/* ページタイトル */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Lesson Slots Management</h1>
        
        {/* スロット作成ボタン - ダイアログの外に配置 */}
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Create New Slot
        </Button>
      </div>

      {/* エラー表示エリア - ページ全体に対するエラー */}
      {error && (
        <div className="p-4 mb-6 border rounded-md bg-red-50 border-red-200 text-red-800">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="font-medium">エラーが発生しました</span>
          </div>
          <div className="text-sm mt-1">
            {error}
            {error.includes('講師または管理者のみ') && (
              <div className="mt-2 text-xs bg-yellow-50 p-2 rounded border border-yellow-100">
                <strong>トラブルシューティング:</strong> ログアウトして再度ログインすると解決することがあります
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>レッスンスロットの作成</DialogTitle>
            <DialogDescription>
              レッスン可能な日時を設定してください。
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateSlot} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="date-picker" className="mb-2 block">日付を選択</Label>
                <div className="border rounded-md p-2 bg-white">
                  <Calendar 
                    mode="single"
                    selected={selectedDate} 
                    onSelect={(date: Date | undefined) => {
                      setSelectedDate(date);
                      console.log('日付選択:', date); // 選択時のログ追加
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="[&_.rdp-day_button:hover]:bg-blue-100 [&_.rdp-day_focus]:bg-blue-200 [&_.rdp-day_selected]:bg-blue-600"
                  />
                  {selectedDate && (
                    <p className="mt-2 text-sm text-green-600 font-medium">
                      選択日: {format(selectedDate, 'yyyy年MM月dd日')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-time" className="mb-2 block">開始時間</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end-time" className="mb-2 block">終了時間</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="hourly-rate" className="mb-2 block">時間単価（円）</Label>
                <Input
                  id="hourly-rate"
                  type="number"
                  min="3000"
                  max="10000"
                  step="500"
                  value={formData.hourlyRate}
                  onChange={(e) => handleTimeChange('hourlyRate', e.target.value)}
                  placeholder="5000"
                />
                <p className="text-sm text-gray-500 mt-1">推奨：6,000円・最小：3,000円・最大：10,000円</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min-hours" className="mb-2 block">最小予約時間</Label>
                  <Input
                    id="min-hours"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={formData.minHours}
                    onChange={(e) => handleTimeChange('minHours', e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="max-hours" className="mb-2 block">最大予約時間（空白=制限なし）</Label>
                  <Input
                    id="max-hours"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={formData.maxHours}
                    onChange={(e) => handleTimeChange('maxHours', e.target.value)}
                    placeholder="制限なし"
                  />
                </div>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 p-3 rounded-md text-red-900 text-sm">
                {error}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={slotLoading}>
                {slotLoading ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    作成中...
                  </>
                ) : '作成する'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 編集用ダイアログ */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingSlot(null);
          setEditError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>レッスンスロットの編集</DialogTitle>
            <DialogDescription>
              {editingSlot && `${format(new Date(editingSlot.startTime), 'yyyy年MM月dd日')}のレッスンスロットを編集します。`}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateSlot} className="space-y-4">
            <div className="space-y-4">
              {/* 日付表示（編集不可） */}
              {editingSlot && (
                <div>
                  <Label className="mb-2 block">日付</Label>
                  <div className="p-3 bg-gray-50 rounded-md border">
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(editingSlot.startTime), 'yyyy年MM月dd日 (EEEE)', { locale: ja })}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start-time" className="mb-2 block">開始時間</Label>
                  <Input
                    id="edit-start-time"
                    type="time"
                    value={editFormData.startTime}
                    onChange={(e) => handleEditTimeChange('startTime', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end-time" className="mb-2 block">終了時間</Label>
                  <Input
                    id="edit-end-time"
                    type="time"
                    value={editFormData.endTime}
                    onChange={(e) => handleEditTimeChange('endTime', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-hourly-rate" className="mb-2 block">時間単価（円）</Label>
                <Input
                  id="edit-hourly-rate"
                  type="number"
                  min="3000"
                  max="10000"
                  step="500"
                  value={editFormData.hourlyRate}
                  onChange={(e) => handleEditTimeChange('hourlyRate', e.target.value)}
                  placeholder="5000"
                />
                <p className="text-sm text-gray-500 mt-1">推奨：6,000円・最小：3,000円・最大：10,000円</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-min-hours" className="mb-2 block">最小予約時間</Label>
                  <Input
                    id="edit-min-hours"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={editFormData.minHours}
                    onChange={(e) => handleEditTimeChange('minHours', e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-max-hours" className="mb-2 block">最大予約時間（空白=制限なし）</Label>
                  <Input
                    id="edit-max-hours"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={editFormData.maxHours}
                    onChange={(e) => handleEditTimeChange('maxHours', e.target.value)}
                    placeholder="制限なし"
                  />
                </div>
              </div>

              {/* 予約情報の表示 */}
              {editingSlot?.reservations && editingSlot.reservations.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">予約情報</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        このスロットには{editingSlot.reservations.length}件の予約があります。時間を変更する際はご注意ください。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {editError && (
              <div className="bg-red-50 p-3 rounded-md text-red-900 text-sm">
                {editError}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={slotLoading}>
                {slotLoading ? (
                  <>
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                    更新中...
                  </>
                ) : '更新する'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* タブコンテンツ */}
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">All Slots</TabsTrigger>
          <TabsTrigger value="reserved">Reserved</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          {slotLoading ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading slots...</p>
            </div>
          ) : Object.keys(groupedSlots).length === 0 ? (
            <Alert>
              <AlertDescription>
                No lesson slots have been registered yet. Click the "Create New Slot" button to add one.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(groupedSlots).map(([date, dateSlots]) => (
                <div 
                  key={date}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer bg-white"
                  onClick={() => handleCreateSlotForDate(date)}
                >
                  {/* 日付ヘッダー */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <h3 className="font-medium text-gray-900">
                      {format(new Date(date), 'MM月dd日 (EEE)', { locale: ja })}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {dateSlots.length}件
                    </Badge>
                  </div>
                  
                  {/* 既存スロットを小さなタグ表示 */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {dateSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded-md cursor-pointer transition-colors border border-blue-200 group"
                        onClick={(e) => handleEditSlot(slot, e)}
                      >
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-800">
                          {format(new Date(slot.startTime), 'HH:mm')}-{format(new Date(slot.endTime), 'HH:mm')}
                        </span>
                        
                        {/* 予約状況インジケーター */}
                        {slot.reservations && slot.reservations.length > 0 ? (
                          <div className="w-2 h-2 bg-orange-500 rounded-full" title={`${slot.reservations.length}件の予約`} />
                        ) : slot.isAvailable ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="予約可能" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" title="非公開" />
                        )}
                        
                        {/* 編集アイコン（ホバー時のみ表示） */}
                        <Edit className="h-3 w-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                  
                  {/* 新規追加エリア */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-center p-2 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors border border-dashed border-gray-300">
                      <Plus className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-sm text-gray-600">スロットを追加</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="reserved">
          <div className="space-y-8">
            {Object.entries(groupedSlots).map(([date, dateSlots]) => {
              // 予約があるスロットだけをフィルタリング
              const reservedSlots = dateSlots.filter(
                (slot) => slot.reservations && slot.reservations.length > 0
              );
              
              if (reservedSlots.length === 0) return null;
              
              return (
                <div key={date}>
                  <h3 className="text-lg font-medium mb-3">{date}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reservedSlots.map((slot) => (
                      <Card key={slot.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center text-sm text-gray-500 mb-2">
                                <Clock className="h-4 w-4 mr-1" />
                                {format(new Date(slot.startTime), 'HH:mm')} - {format(new Date(slot.endTime), 'HH:mm')}
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                <Badge variant="secondary">
                                  予約済み
                                </Badge>
                                <Badge variant={slot.isAvailable ? "outline" : "destructive"}>
                                  {slot.isAvailable ? '公開中' : '非公開'}
                                </Badge>
                              </div>
                              {/* 予約者情報 */}
                              <div className="text-sm mt-2 border-t pt-2">
                                予約数: {slot.reservations?.length || 0}
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              詳細
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {Object.values(groupedSlots).flat().filter(
              slot => slot.reservations && slot.reservations.length > 0
            ).length === 0 && (
              <Alert>
                <AlertDescription>
                  No reserved lesson slots.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <Toaster />
    </>
  );
} 