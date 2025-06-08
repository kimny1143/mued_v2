import React from 'react';
import { Clock, Calendar, User, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Reservation } from '../types';

interface ReservationCardProps {
  reservation: Reservation;
  onClick: () => void;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e', label: '保留中' },
  PENDING_APPROVAL: { bg: '#fef3c7', text: '#92400e', label: '承認待ち' },
  APPROVED: { bg: '#dbeafe', text: '#1e40af', label: '承認済み' },
  CONFIRMED: { bg: '#d1fae5', text: '#065f46', label: '確定' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b', label: '却下' },
  CANCELED: { bg: '#fee2e2', text: '#991b1b', label: 'キャンセル' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b', label: 'キャンセル' }, // 後方互換性のため
  COMPLETED: { bg: '#e5e7eb', text: '#374151', label: '完了' },
};

const paymentStatusLabels = {
  PENDING: '支払い待ち',
  SETUP_COMPLETED: '支払い設定済み',
  PAID: '支払い完了',
  REFUNDED: '返金済み',
};

export const ReservationCard: React.FC<ReservationCardProps> = ({ 
  reservation, 
  onClick 
}) => {
  const statusInfo = statusColors[reservation.status] || { 
    bg: '#e5e7eb', 
    text: '#374151', 
    label: reservation.status 
  };
  const lessonDate = reservation.lessonSlot ? new Date(reservation.lessonSlot.startTime) : null;
  const lessonEndTime = reservation.lessonSlot ? new Date(reservation.lessonSlot.endTime) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (startDate: Date, endDate: Date) => {
    const startTime = startDate.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const endTime = endDate.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${startTime} - ${endTime}`;
  };

  return (
    <Card onClick={onClick} style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* ステータスバッジ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            backgroundColor: statusInfo.bg,
            color: statusInfo.text,
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}>
            {statusInfo.label}
          </span>
          {reservation.status === 'APPROVED' && reservation.paymentStatus === 'PENDING' && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#dc2626',
              fontSize: '12px',
            }}>
              <AlertCircle size={14} />
              {paymentStatusLabels[reservation.paymentStatus]}
            </span>
          )}
        </div>

        {/* メンター情報 */}
        {reservation.mentor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} color="#6b7280" />
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {reservation.mentor.fullName || reservation.mentor.email}
            </span>
          </div>
        )}

        {/* 日時情報 */}
        {lessonDate && lessonEndTime && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#6b7280" />
              <span style={{ fontSize: '14px' }}>
                {formatDate(lessonDate)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#6b7280" />
              <span style={{ fontSize: '14px' }}>
                {formatTime(lessonDate, lessonEndTime)}
              </span>
            </div>
          </>
        )}

        {/* 価格 */}
        {reservation.lessonSlot && (
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#1e40af',
            textAlign: 'right',
          }}>
            ¥{reservation.lessonSlot.price.toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
};