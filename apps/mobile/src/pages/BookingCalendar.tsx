import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { Card } from '../components/ui/Card';
import { ChevronLeft, Calendar, Clock, User } from 'lucide-react';

interface Mentor {
  id: string;
  name: string;
  email: string;
  image?: string;
  bio?: string;
}

interface LessonSlot {
  id: string;
  mentorId: string;
  slotTime: string;
  duration: number;
  isAvailable: boolean;
  price: number;
  mentor?: Mentor;
}

const BookingCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // メンター一覧を取得
  useEffect(() => {
    fetchMentorsAndSlots();
  }, []);

  const fetchMentorsAndSlots = async () => {
    try {
      setLoading(true);
      // 利用可能なスロットを取得（メンター情報含む）
      const slotsData = await apiClient.getLessonSlots();
      
      // メンター情報を抽出（重複排除）
      const uniqueMentors = Array.from(
        new Map(
          slotsData
            .filter((slot: any) => slot.mentor)
            .map((slot: any) => [slot.mentor.id, slot.mentor])
        ).values()
      );
      
      setMentors(uniqueMentors);
      setSlots(slotsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMentorSlots = async (mentorId: string) => {
    try {
      setLoading(true);
      const slotsData = await apiClient.getLessonSlots(mentorId);
      setSlots(slotsData);
    } catch (error) {
      console.error('Failed to fetch mentor slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMentorSelect = (mentorId: string) => {
    setSelectedMentor(mentorId);
    fetchMentorSlots(mentorId);
  };

  const handleSlotSelect = async (slot: LessonSlot) => {
    if (!slot.isAvailable) return;
    
    // 予約作成画面へ遷移
    navigate('/reservations/new', { 
      state: { 
        slotId: slot.id,
        mentor: slot.mentor,
        slotTime: slot.slotTime,
        duration: slot.duration,
        price: slot.price
      } 
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: '#1e40af',
        color: 'white',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {selectedMentor && (
          <button
            onClick={() => {
              setSelectedMentor(null);
              setSlots([]);
            }}
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
        )}
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
          {selectedMentor ? 'スロット選択' : 'メンター選択'}
        </h1>
      </header>

      <div style={{ padding: '16px' }}>
        {!selectedMentor ? (
          // メンター一覧
          <div>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: '#374151',
            }}>
              利用可能なメンター
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mentors.map((mentor) => (
                <Card
                  key={mentor.id}
                  onClick={() => handleMentorSelect(mentor.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {mentor.image ? (
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
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        margin: '0 0 4px 0', 
                        fontSize: '16px', 
                        fontWeight: 'bold',
                        color: '#111827',
                      }}>
                        {mentor.name}
                      </h3>
                      {mentor.bio && (
                        <p style={{ 
                          margin: 0, 
                          fontSize: '14px', 
                          color: '#6b7280',
                        }}>
                          {mentor.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          // スロット一覧
          <div>
            <h2 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '18px', 
              fontWeight: 'bold',
              color: '#374151',
            }}>
              {formatDate(selectedDate)}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {slots
                .filter(slot => {
                  const slotDate = new Date(slot.slotTime);
                  return slotDate.toDateString() === selectedDate.toDateString();
                })
                .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime())
                .map((slot) => (
                  <Card
                    key={slot.id}
                    onClick={() => handleSlotSelect(slot)}
                    style={{ 
                      cursor: slot.isAvailable ? 'pointer' : 'default',
                      opacity: slot.isAvailable ? 1 : 0.5,
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="#6b7280" />
                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {formatTime(slot.slotTime)}
                        </span>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>
                          ({slot.duration}分)
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '16px', 
                          fontWeight: 'bold',
                          color: '#1e40af',
                        }}>
                          ¥{slot.price.toLocaleString()}
                        </p>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '12px', 
                          color: slot.isAvailable ? '#10b981' : '#ef4444',
                        }}>
                          {slot.isAvailable ? '予約可能' : '予約済み'}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>

            {/* 日付選択 */}
            <div style={{ 
              marginTop: '24px',
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
            }}>
              {[-1, 0, 1, 2, 3, 4, 5].map(offset => {
                const date = new Date();
                date.setDate(date.getDate() + offset);
                const isSelected = date.toDateString() === selectedDate.toDateString();
                
                return (
                  <button
                    key={offset}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      padding: '8px 12px',
                      border: 'none',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#1e40af' : '#e5e7eb',
                      color: isSelected ? 'white' : '#374151',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default BookingCalendar;