// ダッシュボード用の型定義
export interface TodayScheduleData {
  upcomingReservations?: Array<{
    id: string;
    startTime: string;
    endTime: string;
    actorName?: string;
    status: string;
  }>;
}

export interface ReservationStatusData {
  pendingApproval?: number;
  approved?: number;
  confirmed?: number;
  available?: number;
}

export interface DashboardCardProps {
  userRole: string;
  userId?: string;
} 