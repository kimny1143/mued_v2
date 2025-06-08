import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, MapPin, MessageCircle, CreditCard } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Card } from '../components/ui/Card';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { apiClient } from '../services/api';
import { Reservation } from '../types';

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

export const ReservationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservation = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getReservation(id);
      
      // APIレスポンスをフロントエンドの型に変換
      const transformedData: Reservation = {
        id: data.id,
        studentId: data.studentId,
        mentorId: data.lessonSlots?.teacher?.id || data.lessonSlots?.teacherId || '',
        lessonSlotId: data.slotId || data.lessonSlotId || '',
        status: data.status as 'PENDING_APPROVAL' | 'APPROVED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
        paymentStatus: (data.paymentId ? 'SETUP_COMPLETED' : 'PENDING') as 'PENDING' | 'SETUP_COMPLETED' | 'PAID' | 'REFUNDED',
        studentMessage: data.notes || data.studentMessage,
        mentorMessage: data.mentorMessage,
        cancelReason: data.cancelReason,
        bookedStartTime: data.bookedStartTime,
        bookedEndTime: data.bookedEndTime,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        lessonSlot: data.lessonSlots ? {
          id: data.lessonSlots.id,
          mentorId: data.lessonSlots.teacher_id || data.lessonSlots.teacherId || '',
          startTime: data.lessonSlots.start_time || data.lessonSlots.startTime,
          endTime: data.lessonSlots.end_time || data.lessonSlots.endTime,
          isAvailable: data.lessonSlots.is_available !== undefined ? data.lessonSlots.is_available : true,
          price: data.totalAmount || data.lessonSlots.hourly_rate || 0,
          createdAt: data.lessonSlots.created_at || data.lessonSlots.createdAt,
          updatedAt: data.lessonSlots.updated_at || data.lessonSlots.updatedAt,
          mentor: data.lessonSlots.users ? {
            id: data.lessonSlots.users.id,
            email: data.lessonSlots.users.email || '',
            fullName: data.lessonSlots.users.name,
            role: 'MENTOR' as const,
          } : undefined,
        } : undefined,
        student: data.users ? {
          id: data.users.id,
          email: data.users.email || '',
          fullName: data.users.name,
          role: 'STUDENT' as const,
        } : undefined,
        mentor: data.lessonSlots?.users ? {
          id: data.lessonSlots.users.id,
          email: data.lessonSlots.users.email || '',
          fullName: data.lessonSlots.users.name,
          role: 'MENTOR' as const,
        } : undefined,
      };
      
      console.log('Transformed reservation:', transformedData);
      setReservation(transformedData);
    } catch (err) {
      setError('予約情報の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservation();
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('予約をキャンセルしますか？')) return;
    
    try {
      await apiClient.cancelReservation(id!, 'ユーザーによるキャンセル');
      alert('予約をキャンセルしました');
      navigate('/reservations');
    } catch (err) {
      alert('キャンセルに失敗しました');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ paddingTop: '100px' }}>
          <LoadingSpinner />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ paddingTop: '100px' }}>
          <ErrorMessage 
            message={error || '予約が見つかりません'} 
            onRetry={fetchReservation} 
          />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const statusInfo = statusColors[reservation.status];
  const lessonDate = reservation.lessonSlot ? new Date(reservation.lessonSlot.startTime) : null;
  const lessonEndTime = reservation.lessonSlot ? new Date(reservation.lessonSlot.endTime) : null;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 50,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            padding: '4px',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          予約詳細
        </h1>
      </header>

      <div style={{ padding: '16px' }}>
        {/* ステータス */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              backgroundColor: statusInfo.bg,
              color: statusInfo.text,
              padding: '8px 24px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'inline-block',
            }}>
              {statusInfo.label}
            </span>
            {reservation.status === 'APPROVED' && reservation.paymentStatus === 'PENDING' && (
              <p style={{
                marginTop: '12px',
                color: '#dc2626',
                fontSize: '14px',
              }}>
                支払いを完了してください
              </p>
            )}
          </div>
        </Card>

        {/* メンター情報 */}
        {reservation.mentor && (
          <Card style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <User size={24} color="#6b7280" />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>
                  {reservation.mentor.fullName || reservation.mentor.email}
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                  メンター
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* レッスン情報 */}
        {lessonDate && lessonEndTime && (
          <Card style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Calendar size={20} color="#6b7280" />
                <span style={{ fontSize: '16px' }}>
                  {lessonDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock size={20} color="#6b7280" />
                <span style={{ fontSize: '16px' }}>
                  {lessonDate.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' - '}
                  {lessonEndTime.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {reservation.lessonSlot && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid #e5e7eb',
                }}>
                  <span style={{ color: '#6b7280' }}>レッスン料金</span>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>
                    ¥{reservation.lessonSlot.price.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* メッセージ */}
        {(reservation.studentMessage || reservation.mentorMessage) && (
          <Card style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <MessageCircle size={20} color="#6b7280" />
              <div style={{ flex: 1 }}>
                {reservation.studentMessage && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>
                      あなたのメッセージ
                    </p>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      {reservation.studentMessage}
                    </p>
                  </div>
                )}
                {reservation.mentorMessage && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280' }}>
                      メンターからのメッセージ
                    </p>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      {reservation.mentorMessage}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* アクションボタン */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {reservation.status === 'APPROVED' && reservation.paymentStatus === 'PENDING' && (
            <button
              style={{
                padding: '16px',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <CreditCard size={20} />
              支払いを完了する
            </button>
          )}
          
          {(reservation.status === 'PENDING_APPROVAL' || reservation.status === 'APPROVED') && (
            <button
              onClick={handleCancel}
              style={{
                padding: '16px',
                backgroundColor: 'white',
                color: '#dc2626',
                border: '1px solid #dc2626',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              予約をキャンセル
            </button>
          )}
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};