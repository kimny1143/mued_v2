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
      setReservations(data);
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
        if (r.status === 'CANCELLED' || r.status === 'COMPLETED') return false;
        const startTime = r.lessonSlot ? new Date(r.lessonSlot.startTime) : null;
        return startTime && startTime > now;
      });
    } else {
      return reservations.filter(r => {
        if (r.status === 'CANCELLED') return true;
        if (r.status === 'COMPLETED') return true;
        const startTime = r.lessonSlot ? new Date(r.lessonSlot.startTime) : null;
        return startTime && startTime <= now;
      });
    }
  };

  const filteredReservations = filterReservations(reservations);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', paddingTop: '100px' }}>
        <ErrorMessage message={error} onRetry={fetchReservations} />
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