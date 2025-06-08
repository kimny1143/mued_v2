import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ReservationCard } from '../components/ReservationCard';
import { apiClient } from '../services/api';
import { Reservation } from '../types';

export const Reservations: React.FC = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getMyReservations();
      
      // APIレスポンスをフロントエンドの型に変換
      const transformedData = data.map((item: any) => {
        // 価格計算
        const price = item.payment?.amount || 
                     (item.bookedEndTime && item.bookedStartTime ? 
                      Math.round((new Date(item.bookedEndTime).getTime() - new Date(item.bookedStartTime).getTime()) / (1000 * 60 * 60)) * 6000 : 
                      0);
        
        return {
          id: item.id,
          studentId: '', // APIレスポンスに含まれない
          mentorId: item.lessonSlot?.teacher?.id || '',
          lessonSlotId: item.lessonSlot?.id || '',
          status: item.status as 'PENDING_APPROVAL' | 'APPROVED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
          paymentStatus: (item.payment?.status === 'SUCCEEDED' ? 'PAID' : 
                        item.payment?.status === 'SETUP_COMPLETED' ? 'SETUP_COMPLETED' : 
                        item.payment?.status === 'CANCELED' ? 'REFUNDED' : 'PENDING') as 'PENDING' | 'SETUP_COMPLETED' | 'PAID' | 'REFUNDED',
          studentMessage: item.studentMessage || undefined,
          mentorMessage: item.mentorMessage || undefined,
          cancelReason: item.cancelReason || undefined,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          bookedStartTime: item.bookedStartTime,
          bookedEndTime: item.bookedEndTime,
          lessonSlot: item.lessonSlot ? {
            id: item.lessonSlot.id,
            mentorId: item.lessonSlot.teacher?.id || '',
            startTime: item.lessonSlot.start_time || item.lessonSlot.startTime,
            endTime: item.lessonSlot.end_time || item.lessonSlot.endTime,
            isAvailable: true,
            price: price,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            mentor: item.lessonSlot.teacher ? {
              id: item.lessonSlot.teacher.id,
              email: item.lessonSlot.teacher.email || '',
              fullName: item.lessonSlot.teacher.name,
              role: 'MENTOR' as const,
            } : undefined,
          } : undefined,
          mentor: item.lessonSlot?.teacher ? {
            id: item.lessonSlot.teacher.id,
            email: item.lessonSlot.teacher.email || '',
            fullName: item.lessonSlot.teacher.name,
            role: 'MENTOR' as const,
          } : undefined,
        };
      });
      
      console.log('Transformed reservations:', transformedData);
      setReservations(transformedData);
    } catch (err) {
      setError('予約情報の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const filterReservations = (reservations: Reservation[]) => {
    const now = new Date();
    if (activeTab === 'upcoming') {
      return reservations.filter(r => {
        if (r.status === 'CANCELLED' || r.status === 'CANCELED' || r.status === 'COMPLETED') return false;
        const startTime = r.lessonSlot ? new Date(r.lessonSlot.startTime) : null;
        return startTime && startTime > now;
      });
    } else {
      return reservations.filter(r => {
        if (r.status === 'CANCELLED' || r.status === 'CANCELED') return true;
        if (r.status === 'COMPLETED') return true;
        const startTime = r.lessonSlot ? new Date(r.lessonSlot.startTime) : null;
        return startTime && startTime <= now;
      });
    }
  };

  const filteredReservations = filterReservations(reservations);

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

  if (error) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ paddingTop: '100px' }}>
          <ErrorMessage message={error} onRetry={fetchReservations} />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* ヘッダー */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        zIndex: 50,
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          予約一覧
        </h1>
      </header>

      {/* タブ */}
      <div style={{
        display: 'flex',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: '57px',
        zIndex: 40,
      }}>
        <button
          onClick={() => setActiveTab('upcoming')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            backgroundColor: 'white',
            color: activeTab === 'upcoming' ? '#1e40af' : '#6b7280',
            fontWeight: activeTab === 'upcoming' ? 'bold' : 'normal',
            borderBottom: activeTab === 'upcoming' ? '2px solid #1e40af' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          今後の予約
        </button>
        <button
          onClick={() => setActiveTab('past')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            backgroundColor: 'white',
            color: activeTab === 'past' ? '#1e40af' : '#6b7280',
            fontWeight: activeTab === 'past' ? 'bold' : 'normal',
            borderBottom: activeTab === 'past' ? '2px solid #1e40af' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          過去の予約
        </button>
      </div>

      {/* 予約リスト */}
      <div style={{ padding: '16px' }}>
        {filteredReservations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#6b7280',
          }}>
            <p>予約がありません</p>
            <button
              onClick={() => navigate('/booking')}
              style={{
                marginTop: '16px',
                padding: '12px 24px',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              レッスンを予約する
            </button>
          </div>
        ) : (
          filteredReservations.map(reservation => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onClick={() => navigate(`/reservations/${reservation.id}`)}
            />
          ))
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};