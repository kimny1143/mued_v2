ダッシュボードにロール別の予約状況を追加する実装方針を以下のように構造化します：

## 実装方針の構造化

### 1. 現在の状況分析

**既存のコードベース構造:**
- ダッシュボードページ: 静的な統計カード（Total Lessons, Hours Learned, Next Lesson）
- 予約システム: メンター用（slots-calendar）と生徒用（booking-calendar）が分離
- API: `/api/reservations`と`/api/lesson-slots`で予約・スロットデータを取得
- 通知システム: リアルタイム予約状況の監視機能あり

### 2. 実装すべき機能

**メンターロール向け:**
- 今日の予定: 今日のレッスンスロット数と予約状況
- 予約状況: 承認待ち、確定済み、利用可能スロット数

**生徒ロール向け:**
- 今日の予定: 今日の予約レッスン
- 予約状況: 承認待ち、決済待ち、確定済み予約数

### 3. 実装アプローチ

以下のコンポーネント構造で実装します：

```typescript
// app/dashboard/page.tsx の拡張
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useUser } from "@/lib/hooks/use-user";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { CalendarIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { runFullDiagnostic } from "@/lib/debug-helpers";

// 新しいコンポーネントのインポート
import { TodayScheduleCard } from "@/app/components/dashboard/TodayScheduleCard";
import { ReservationStatusCard } from "@/app/components/dashboard/ReservationStatusCard";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();
  const { user, loading: userLoading, error } = useUser();

  // 認証状態を確認（ページ保護用）
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.push('/login');
      }
      setLoading(false);
    };

    getSession();
  }, [router]);

  // ユーザーロールを取得
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/user?userId=${user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.roleName || 'student');
          }
        } catch (error) {
          console.error('ロール取得エラー:', error);
          setUserRole('student'); // デフォルト
        }
      }
    };

    fetchUserRole();
  }, [user]);

  // 開発環境でのみデバッグ診断を実行
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('🔍 ダッシュボードロード時の診断を実行');
      runFullDiagnostic().then(result => {
        console.log('診断結果:', result);
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      {/* ロール別の予約状況セクション */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TodayScheduleCard userRole={userRole} userId={user?.id} />
          <ReservationStatusCard userRole={userRole} userId={user?.id} />
        </div>
      </section>

      {/* 既存の統計セクション */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Total Lessons</h3>
            <p className="text-3xl font-bold">12</p>
          </Card>
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Hours Learned</h3>
            <p className="text-3xl font-bold">24</p>
          </Card>
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Next Lesson</h3>
            <p className="text-sm text-gray-500">No upcoming lessons</p>
          </Card>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card className="bg-white divide-y">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium">Completed Lesson {item}</h4>
                <p className="text-sm text-gray-500">2 days ago</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
              >
                View Details
              </Button>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
}
```

### 4. 新しいコンポーネントの実装

**TodayScheduleCard コンポーネント:**

```typescript
// app/components/dashboard/TodayScheduleCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { CalendarIcon, ClockIcon, UserIcon } from "lucide-react";
import { format, isToday } from "date-fns";
import { ja } from "date-fns/locale";

interface TodayScheduleCardProps {
  userRole: string;
  userId?: string;
}

interface TodayScheduleData {
  totalSlots?: number;
  bookedSlots?: number;
  availableSlots?: number;
  upcomingReservations?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    mentorName?: string;
    studentName?: string;
    status: string;
  }>;
}

export const TodayScheduleCard: React.FC<TodayScheduleCardProps> = ({ userRole, userId }) => {
  const [scheduleData, setScheduleData] = useState<TodayScheduleData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaySchedule = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        
        if (userRole === 'mentor') {
          // メンター: 今日のスロット情報を取得
          const today = format(new Date(), 'yyyy-MM-dd');
          const response = await fetch(`/api/lesson-slots?teacherId=${userId}&date=${today}`);
          
          if (response.ok) {
            const slots = await response.json();
            const totalSlots = slots.length;
            const bookedSlots = slots.filter((slot: any) => 
              slot.reservations?.some((res: any) => res.status === 'CONFIRMED')
            ).length;
            const availableSlots = totalSlots - bookedSlots;
            
            setScheduleData({
              totalSlots,
              bookedSlots,
              availableSlots
            });
          }
        } else if (userRole === 'student') {
          // 生徒: 今日の予約情報を取得
          const response = await fetch(`/api/reservations?studentId=${userId}`);
          
          if (response.ok) {
            const reservations = await response.json();
            const todayReservations = reservations.filter((res: any) => 
              isToday(new Date(res.bookedStartTime))
            );
            
            setScheduleData({
              upcomingReservations: todayReservations.map((res: any) => ({
                id: res.id,
                startTime: res.bookedStartTime,
                endTime: res.bookedEndTime,
                mentorName: res.lessonSlot?.teacher?.name,
                status: res.status
              }))
            });
          }
        }
      } catch (error) {
        console.error('今日の予定取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySchedule();
  }, [userRole, userId]);

  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="flex items-center mb-4">
          <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
          <h3 className="font-semibold">今日の予定</h3>
        </div>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center mb-4">
        <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
        <h3 className="font-semibold">今日の予定</h3>
      </div>
      
      {userRole === 'mentor' ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">総スロット数</span>
            <span className="text-2xl font-bold">{scheduleData.totalSlots || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">予約済み</span>
            <span className="text-lg font-semibold text-green-600">{scheduleData.bookedSlots || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">空きスロット</span>
            <span className="text-lg font-semibold text-blue-600">{scheduleData.availableSlots || 0}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduleData.upcomingReservations && scheduleData.upcomingReservations.length > 0 ? (
            scheduleData.upcomingReservations.map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(reservation.startTime), 'HH:mm')} - 
                      {format(new Date(reservation.endTime), 'HH:mm')}
                    </p>
                    <p className="text-xs text-gray-500">{reservation.mentorName}先生</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  reservation.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                  reservation.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {reservation.status === 'CONFIRMED' ? '確定' :
                   reservation.status === 'APPROVED' ? '決済待ち' : '承認待ち'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">今日の予定はありません</p>
          )}
        </div>
      )}
    </Card>
  );
};
```

**ReservationStatusCard コンポーネント:**

```typescript
// app/components/dashboard/ReservationStatusCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { CheckCircleIcon, AlertCircleIcon, ClockIcon } from "lucide-react";

interface ReservationStatusCardProps {
  userRole: string;
  userId?: string;
}

interface ReservationStatusData {
  pendingApproval?: number;
  approved?: number;
  confirmed?: number;
  available?: number;
}

export const ReservationStatusCard: React.FC<ReservationStatusCardProps> = ({ userRole, userId }) => {
  const [statusData, setStatusData] = useState<ReservationStatusData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReservationStatus = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        
        if (userRole === 'mentor') {
          // メンター: 予約承認状況を取得
          const response = await fetch(`/api/reservations?teacherId=${userId}`);
          
          if (response.ok) {
            const reservations = await response.json();
            const pendingApproval = reservations.filter((res: any) => res.status === 'PENDING_APPROVAL').length;
            const approved = reservations.filter((res: any) => res.status === 'APPROVED').length;
            const confirmed = reservations.filter((res: any) => res.status === 'CONFIRMED').length;
            
            setStatusData({
              pendingApproval,
              approved,
              confirmed
            });
          }
        } else if (userRole === 'student') {
          // 生徒: 自分の予約状況を取得
          const response = await fetch(`/api/reservations?studentId=${userId}`);
          
          if (response.ok) {
            const reservations = await response.json();
            const pendingApproval = reservations.filter((res: any) => res.status === 'PENDING_APPROVAL').length;
            const approved = reservations.filter((res: any) => res.status === 'APPROVED').length;
            const confirmed = reservations.filter((res: any) => res.status === 'CONFIRMED').length;
            
            setStatusData({
              pendingApproval,
              approved,
              confirmed
            });
          }
        }
      } catch (error) {
        console.error('予約状況取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservationStatus();
  }, [userRole, userId]);

  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="flex items-center mb-4">
          <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
          <h3 className="font-semibold">予約状況</h3>
        </div>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center mb-4">
        <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
        <h3 className="font-semibold">予約状況</h3>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircleIcon className="h-4 w-4 mr-2 text-yellow-500" />
            <span className="text-sm text-gray-600">
              {userRole === 'mentor' ? '承認待ち' : '承認待ち'}
            </span>
          </div>
          <span className="text-lg font-semibold text-yellow-600">{statusData.pendingApproval || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
            <span className="text-sm text-gray-600">
              {userRole === 'mentor' ? '承認済み' : '決済待ち'}
            </span>
          </div>
          <span className="text-lg font-semibold text-blue-600">{statusData.approved || 0}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
            <span className="text-sm text-gray-600">確定済み</span>
          </div>
          <span className="text-lg font-semibold text-green-600">{statusData.confirmed || 0}</span>
        </div>
      </div>
    </Card>
  );
};
```

### 5. API拡張

既存のAPIエンドポイントを活用し、必要に応じて以下のクエリパラメータを追加：

- `/api/reservations?teacherId=${userId}&date=${today}` - メンター用今日の予約
- `/api/lesson-slots?teacherId=${userId}&date=${today}` - メンター用今日のスロット
- `/api/reservations?studentId=${userId}` - 生徒用予約状況

### 6. 実装の優先順位

1. **Phase 1**: TodayScheduleCard の基本実装
2. **Phase 2**: ReservationStatusCard の基本実装  
3. **Phase 3**: リアルタイム更新の統合
4. **Phase 4**: エラーハンドリングとローディング状態の改善

この構造化されたアプローチにより、既存のコードベースを活用しながら、ロール別の予約状況を効率的にダッシュボードに統合できます。
