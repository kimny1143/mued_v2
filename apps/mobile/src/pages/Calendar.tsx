import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { CalendarView } from '../components/Calendar/CalendarView';
import { apiClient } from '../services/api';
import { Reservation, LessonSlot, CalendarEvent } from '../types';

export const Calendar: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 予約とレッスンスロットを同時に取得
      const [reservations, sessions] = await Promise.all([
        apiClient.getMyReservations(),
        apiClient.getSessions(),
      ]);

      // カレンダーイベントに変換
      const calendarEvents: CalendarEvent[] = [];

      // 予約をイベントに変換
      reservations.forEach((reservation: Reservation) => {
        if (reservation.lessonSlot && reservation.status !== 'CANCELLED') {
          calendarEvents.push({
            id: reservation.id,
            title: `レッスン - ${reservation.mentor?.fullName || 'メンター'}`,
            start: new Date(reservation.lessonSlot.startTime),
            end: new Date(reservation.lessonSlot.endTime),
            type: 'lesson',
            status: reservation.status,
            metadata: reservation,
          });
        }
      });

      setEvents(calendarEvents);
    } catch (err) {
      setError('カレンダー情報の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'lesson' && event.metadata) {
      navigate(`/reservations/${event.metadata.id}`);
    }
  };

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
        <ErrorMessage message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        zIndex: 50,
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
            カレンダー
          </h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setView('month')}
              style={{
                padding: '6px 12px',
                backgroundColor: view === 'month' ? '#1e40af' : 'white',
                color: view === 'month' ? 'white' : '#6b7280',
                border: `1px solid ${view === 'month' ? '#1e40af' : '#e5e7eb'}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              月
            </button>
            <button
              onClick={() => setView('week')}
              style={{
                padding: '6px 12px',
                backgroundColor: view === 'week' ? '#1e40af' : 'white',
                color: view === 'week' ? 'white' : '#6b7280',
                border: `1px solid ${view === 'week' ? '#1e40af' : '#e5e7eb'}`,
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              週
            </button>
          </div>
        </div>
      </header>

      {/* カレンダー */}
      <div style={{ margin: '16px' }}>
        <CalendarView
          events={events}
          onEventClick={handleEventClick}
          view={view}
        />
      </div>

      {/* 凡例 */}
      <div style={{
        margin: '16px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: '8px',
      }}>
        <h3 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '14px', 
          fontWeight: 'bold',
          color: '#374151',
        }}>
          凡例
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: '#dbeafe',
              borderRadius: '4px',
            }} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              予約済みレッスン
            </span>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};