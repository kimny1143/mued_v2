import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { BottomNavigation } from '../components/ui/BottomNavigation';
import { Card } from '../components/ui/Card';
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Plus, Edit2, Trash2 } from 'lucide-react';

interface Teacher {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface HourlySlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price: number;
}

interface LessonSlot {
  id: string;
  teacherId: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  hourlyRate: number;
  currency: string;
  teacher?: Teacher;
  hourlySlots?: HourlySlot[];
}

interface TimeSlot {
  time: string;
  slots: Array<{
    slot: LessonSlot;
    hourlySlot: HourlySlot;
  }>;
}

const BookingCalendar: React.FC = () => {
  const { user, isMentor } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [mentorSlots, setMentorSlots] = useState<LessonSlot[]>([]);

  useEffect(() => {
    fetchSlots();
  }, [isMentor, user]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      
      if (isMentor) {
        // メンターの場合: 自分のスロットを取得
        const mentorSlotsData = await apiClient.getMyLessonSlots();
        console.log('Fetched mentor slots:', mentorSlotsData);
        setMentorSlots(mentorSlotsData);
      } else {
        // 生徒の場合: 全メンターのスロットを取得
        const slotsData = await apiClient.getLessonSlots();
        console.log('Fetched all slots:', slotsData);
        setSlots(slotsData);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  // 時間帯を生成（8:00 - 22:00）
  const generateTimeSlots = (): string[] => {
    const times = [];
    for (let hour = 8; hour < 22; hour++) {
      times.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return times;
  };

  // 指定日時のスロットを取得
  const getSlotsByDateTime = (date: Date, timeString: string): Array<{ slot: LessonSlot; hourlySlot: HourlySlot }> => {
    const targetDateTime = new Date(date);
    const [hours, minutes] = timeString.split(':').map(Number);
    targetDateTime.setHours(hours, minutes, 0, 0);

    const matchingSlots: Array<{ slot: LessonSlot; hourlySlot: HourlySlot }> = [];

    slots.forEach(slot => {
      if (slot.hourlySlots) {
        slot.hourlySlots.forEach(hourlySlot => {
          const slotStart = new Date(hourlySlot.startTime);
          if (
            slotStart.toDateString() === targetDateTime.toDateString() &&
            slotStart.getHours() === targetDateTime.getHours()
          ) {
            matchingSlots.push({ slot, hourlySlot });
          }
        });
      }
    });

    return matchingSlots;
  };

  const handleSlotSelect = (slot: LessonSlot, hourlySlot: HourlySlot) => {
    if (!hourlySlot.isAvailable) return;

    navigate('/reservations/new', {
      state: {
        slotId: slot.id,
        mentor: slot.teacher,
        slotTime: hourlySlot.startTime,
        duration: 60,
        price: hourlySlot.price
      }
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (timeString: string): string => {
    return timeString;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  const timeSlots = generateTimeSlots();

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: '#f3f4f6' }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: '#1e40af',
        color: 'white',
        padding: '16px',
      }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', textAlign: 'center' }}>
          {isMentor ? 'スロット管理' : 'レッスン予約'}
        </h1>
      </header>

      {/* 日付ナビゲーション */}
      <div style={{
        backgroundColor: 'white',
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => changeDate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
            {formatDate(selectedDate)}
          </p>
        </div>

        <button
          onClick={() => changeDate(1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* タイムスロット表示 */}
      <div style={{ padding: '16px' }}>
        {isMentor ? (
          // メンター用表示
          <>
            {/* スロット作成ボタン */}
            <button
              onClick={() => navigate('/slots/new')}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '24px',
                cursor: 'pointer',
              }}
            >
              <Plus size={20} />
              新しいスロットを作成
            </button>

            {/* メンターの自分のスロット表示 */}
            {mentorSlots.length > 0 ? (
              mentorSlots
                .filter(slot => {
                  const slotDate = new Date(slot.startTime);
                  return slotDate.toDateString() === selectedDate.toDateString();
                })
                .map(slot => (
                  <Card key={slot.id} style={{ marginBottom: '12px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <p style={{
                          margin: '0 0 4px 0',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: '#111827',
                        }}>
                          {new Date(slot.startTime).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} - {new Date(slot.endTime).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p style={{
                          margin: 0,
                          fontSize: '14px',
                          color: '#6b7280',
                        }}>
                          ¥{slot.hourlyRate.toLocaleString()}/時間
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => console.log('Edit slot:', slot.id)}
                          style={{
                            padding: '8px',
                            backgroundColor: '#f3f4f6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit2 size={16} color="#6b7280" />
                        </button>
                        <button
                          onClick={() => console.log('Delete slot:', slot.id)}
                          style={{
                            padding: '8px',
                            backgroundColor: '#fee2e2',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
            ) : (
              <div style={{
                padding: '32px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#6b7280',
              }}>
                <p style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                  スロットがまだ作成されていません
                </p>
                <button
                  onClick={() => navigate('/slots/new')}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1e40af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  最初のスロットを作成
                </button>
              </div>
            )}
          </>
        ) : (
          // 生徒用表示（既存のコード）
          timeSlots.map(timeSlot => {
            const slotsAtTime = getSlotsByDateTime(selectedDate, timeSlot);
            
            return (
              <div key={timeSlot} style={{ marginBottom: '16px' }}>
                {/* 時間ラベル */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}>
                  <Clock size={16} color="#6b7280" />
                  <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'bold' }}>
                    {timeSlot}
                  </span>
                </div>

                {/* その時間のスロット */}
                {slotsAtTime.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {slotsAtTime.map(({ slot, hourlySlot }, index) => (
                      <Card
                        key={`${slot.id}-${index}`}
                        onClick={() => handleSlotSelect(slot, hourlySlot)}
                        style={{
                          cursor: hourlySlot.isAvailable ? 'pointer' : 'default',
                          opacity: hourlySlot.isAvailable ? 1 : 0.6,
                          borderLeft: `4px solid ${hourlySlot.isAvailable ? '#10b981' : '#ef4444'}`,
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* メンター情報 */}
                            {slot.teacher?.image ? (
                              <img
                                src={slot.teacher.image}
                                alt={slot.teacher.name}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                <User size={20} color="#6b7280" />
                              </div>
                            )}
                            <div>
                              <p style={{
                                margin: '0 0 4px 0',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: '#111827',
                              }}>
                                {slot.teacher?.name || 'メンター'}
                              </p>
                              <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#6b7280',
                              }}>
                                60分レッスン
                              </p>
                            </div>
                          </div>
                          
                          {/* 価格と状態 */}
                          <div style={{ textAlign: 'right' }}>
                            <p style={{
                              margin: '0 0 4px 0',
                              fontSize: '16px',
                              fontWeight: 'bold',
                              color: '#1e40af',
                            }}>
                              ¥{hourlySlot.price.toLocaleString()}
                            </p>
                            <p style={{
                              margin: 0,
                              fontSize: '12px',
                              color: hourlySlot.isAvailable ? '#10b981' : '#ef4444',
                              fontWeight: 'bold',
                            }}>
                              {hourlySlot.isAvailable ? '予約可能' : '予約済み'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '14px',
                  }}>
                    この時間帯に利用可能なメンターはいません
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default BookingCalendar;