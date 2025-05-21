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
          const role = userData?.roleId || 'student';
          setUserRole(role);
          
          // メンターまたは管理者でない場合はダッシュボードにリダイレクト
          if (role !== 'mentor' && role !== 'admin') {
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
      
      const response = await fetch('/api/lesson-slots', {
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
      // バリデーション
      if (!selectedDate || !formData.startTime || !formData.endTime) {
        setError('すべての項目を入力してください');
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
                <Calendar 
                  mode="single"
                  selected={selectedDate} 
                  onSelect={(date: Date | undefined) => setSelectedDate(date)} 
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
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
            <div className="space-y-8">
              {Object.entries(groupedSlots).map(([date, dateSlots]) => (
                <div key={date}>
                  <h3 className="text-lg font-medium mb-3">{date}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dateSlots.map((slot) => (
                      <Card key={slot.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center text-sm text-gray-500 mb-2">
                                <Clock className="h-4 w-4 mr-1" />
                                {format(new Date(slot.startTime), 'HH:mm')} - {format(new Date(slot.endTime), 'HH:mm')}
                              </div>
                              <div className="flex items-center gap-2 mb-3">
                                {slot.reservations && slot.reservations.length > 0 ? (
                                  // 予約がある場合
                                  <Badge variant="secondary">
                                    予約済み
                                  </Badge>
                                ) : (
                                  // 予約がない場合
                                  <Badge variant={slot.isAvailable ? "outline" : "secondary"}>
                                    {slot.isAvailable ? '予約可能' : '非公開'}
                                  </Badge>
                                )}
                                {slot.reservations && slot.reservations.length > 0 && (
                                  <Badge variant="default">
                                    予約数: {slot.reservations.length}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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