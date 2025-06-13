"use client";

import { format } from "date-fns";
import { useState } from "react";
import { toast } from "@/app/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: {
    id: string;
    message: string;
    timestamp: string;
    reservationId?: string;
    studentName?: string;
    lessonDate?: string;
    startTime?: string;
    endTime?: string;
  } | null;
  onApprove: () => void;
}

export function ApprovalModal({ isOpen, onClose, activity, onApprove }: ApprovalModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!activity) return null;

  const handleApprove = async () => {
    if (!activity.reservationId) {
      toast({
        title: "エラー",
        description: "予約情報が見つかりません",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/reservations/${activity.reservationId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('承認処理に失敗しました');
      }

      toast({
        title: "成功",
        description: "レッスンを承認しました",
      });
      
      onApprove();
      onClose();
    } catch (error) {
      console.error('承認エラー:', error);
      toast({
        title: "エラー",
        description: "承認処理中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 日付と時刻の表示フォーマット
  const lessonDateTime = activity.lessonDate && activity.startTime ? 
    `${format(new Date(activity.lessonDate), 'yyyy年MM月dd日')} ${activity.startTime}〜${activity.endTime}` : 
    format(new Date(activity.timestamp), 'yyyy年MM月dd日 HH:mm');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>レッスンの承認確認</DialogTitle>
          <DialogDescription>
            以下のレッスンを承認しますか？
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div>
            <p className="text-sm text-gray-500">生徒名</p>
            <p className="font-medium">{activity.studentName || '情報なし'}さん</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">レッスン日時</p>
            <p className="font-medium">{lessonDateTime}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">詳細</p>
            <p className="text-sm">{activity.message}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            キャンセル
          </Button>
          <Button onClick={handleApprove} disabled={isLoading}>
            {isLoading ? "処理中..." : "承認する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}