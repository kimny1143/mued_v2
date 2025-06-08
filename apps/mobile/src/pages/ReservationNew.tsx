import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { Card } from '../components/ui/Card';
import { ChevronLeft, Calendar, Clock, User, MessageSquare } from 'lucide-react';

const ReservationNew: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { slotId, mentor, slotTime, duration, price } = location.state || {};
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!slotId) {
    navigate('/calendar');
    return null;
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError('');
      
      // 予約を作成
      const reservation = await apiClient.createReservation({
        lessonSlotId: slotId,
        studentMessage: message,
      });
      
      console.log('Reservation created:', reservation);
      
      // 予約詳細ページへ遷移
      if (reservation && typeof reservation === 'object' && 'id' in reservation) {
        navigate(`/reservations/${reservation.id}`);
      } else {
        throw new Error('予約の作成に失敗しました');
      }
    } catch (err: any) {
      console.error('Failed to create reservation:', err);
      setError(err.message || '予約の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: '#1e40af',
        color: 'white',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          予約確認
        </h1>
      </header>

      <div style={{ padding: '16px' }}>
        {/* メンター情報 */}
        <Card style={{ marginBottom: '16px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#374151',
          }}>
            メンター情報
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {mentor?.image ? (
              <img
                src={mentor.image}
                alt={mentor.name}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
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
            )}
            <div>
              <p style={{ 
                margin: '0 0 4px 0', 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: '#111827',
              }}>
                {mentor?.name}
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#6b7280',
              }}>
                {mentor?.email}
              </p>
            </div>
          </div>
        </Card>

        {/* レッスン詳細 */}
        <Card style={{ marginBottom: '16px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#374151',
          }}>
            レッスン詳細
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} color="#6b7280" />
              <span style={{ fontSize: '14px' }}>
                {formatDateTime(slotTime)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#6b7280" />
              <span style={{ fontSize: '14px' }}>
                {duration}分
              </span>
            </div>
          </div>
          <div style={{ 
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>料金</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>
              ¥{price?.toLocaleString()}
            </span>
          </div>
        </Card>

        {/* メッセージ入力 */}
        <Card style={{ marginBottom: '16px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: 'bold',
            color: '#374151',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <MessageSquare size={18} />
            メンターへのメッセージ（任意）
          </h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="学習の目標や質問事項などを記入してください"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </Card>

        {/* エラーメッセージ */}
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        {/* 注意事項 */}
        <Card style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '14px', 
            fontWeight: 'bold',
            color: '#374151',
          }}>
            予約の流れ
          </h3>
          <ol style={{ 
            margin: 0, 
            paddingLeft: '20px',
            fontSize: '14px',
            color: '#6b7280',
            lineHeight: '1.6',
          }}>
            <li>予約リクエストを送信</li>
            <li>メンターが予約を承認</li>
            <li>承認後、支払い手続きを完了</li>
            <li>レッスン当日を迎える</li>
          </ol>
        </Card>

        {/* 予約ボタン */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: loading ? '#9ca3af' : '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? '送信中...' : '予約リクエストを送信'}
        </button>
      </div>
    </div>
  );
};

export default ReservationNew;