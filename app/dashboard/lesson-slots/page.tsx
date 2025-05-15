'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, Clock, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { Toaster } from 'sonner';

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
  const [formData, setFormData] = useState({
    startDate: '',
    startTime: '',
    endTime: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [groupedSlots, setGroupedSlots] = useState<Record<string, LessonSlot[]>>({});

  // ユーザー情報とロールの取得
  useEffect(() => {
    async function getUserInfo() {
      try {
        setLoading(true);
        
        // 認証セッションの取得
        const { data, error } = await supabase.auth.getSession();
        
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
      
      const response = await fetch('/api/lesson-slots');
      
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

  // フォーム入力の処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // レッスンスロット作成の処理
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // バリデーション
      if (!formData.startDate || !formData.startTime || !formData.endTime) {
        setError('すべての項目を入力してください');
        return;
      }
      
      const startTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endTime = new Date(`${formData.startDate}T${formData.endTime}`);
      
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
      
      // APIリクエスト
      const response = await fetch('/api/lesson-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          isAvailable: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'レッスンスロットの作成に失敗しました');
      }
      
      const newSlot = await response.json();
      
      // 成功メッセージ
      toast.success('レッスンスロットを作成しました');
      
      // フォームリセット
      setFormData({
        startDate: '',
        startTime: '',
        endTime: '',
      });
      
      // ダイアログを閉じる
      setIsDialogOpen(false);
      
      // レッスンスロット再取得
      await fetchLessonSlots();
    } catch (err) {
      console.error('レッスンスロット作成エラー:', err);
      setError((err as Error).message);
    } finally {
      setSlotLoading(false);
    }
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h1 className="text-2xl font-bold">Lesson Slots Management</h1>
      </div>
      
      {/* タブとボタン */}
      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="active" className="flex-1">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">All Slots</TabsTrigger>
              <TabsTrigger value="reserved">Reserved</TabsTrigger>
            </TabsList>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Button className="bg-black text-white" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create New Slot
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Lesson Slot</DialogTitle>
                  <DialogDescription>
                    Register available time for lessons. Students can book these time slots.
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateSlot}>
                  {error && (
                    <div className="p-4 mb-4 border rounded-md bg-red-50 border-red-200 text-red-800">
                      <AlertCircle className="h-4 w-4 inline-block mr-2" />
                      <span className="font-medium">Error</span>
                      <div className="text-sm mt-1">{error}</div>
                    </div>
                  )}
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="startDate" className="text-right">
                        Date
                      </Label>
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="startTime" className="text-right">
                        Start Time
                      </Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="endTime" className="text-right">
                        End Time
                      </Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={handleInputChange}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit" disabled={slotLoading}>
                      {slotLoading ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <TabsContent value="active" className="mt-4">
            {slotLoading ? (
              <div className="flex justify-center items-center h-32">
                <p>スロットを読み込み中...</p>
              </div>
            ) : Object.keys(groupedSlots).length === 0 ? (
              <Alert>
                <AlertDescription>
                  レッスンスロットがまだ登録されていません。「新しいスロットを作成」ボタンから登録してください。
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
                                  <Badge variant={slot.isAvailable ? "outline" : "secondary"}>
                                    {slot.isAvailable ? '予約可能' : '予約済み'}
                                  </Badge>
                                  {slot.reservations && slot.reservations.length > 0 && (
                                    <Badge variant="default">
                                      予約あり
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
          
          <TabsContent value="reserved" className="mt-4">
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
                    予約済みのレッスンスロットはありません。
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </>
  );
} 