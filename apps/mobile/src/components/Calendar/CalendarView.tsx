import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarEvent } from '../../types';

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  view: 'month' | 'week';
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  events, 
  onEventClick,
  view 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + (direction * 7));
    }
    setCurrentDate(newDate);
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getDayEvents = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const days = view === 'month' ? getMonthDays() : getWeekDays();
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div style={{ backgroundColor: 'white' }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <button
          onClick={() => navigateMonth(-1)}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 style={{ 
          margin: 0, 
          fontSize: '16px', 
          fontWeight: 'bold' 
        }}>
          {currentDate.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            ...(view === 'week' && { day: 'numeric' })
          })}
        </h2>
        <button
          onClick={() => navigateMonth(1)}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid #e5e7eb',
      }}>
        {weekDays.map(day => (
          <div
            key={day}
            style={{
              padding: '8px 4px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#6b7280',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
      }}>
        {days.map((date, index) => {
          const dayEvents = getDayEvents(date);
          const isToday = date.toDateString() === new Date().toDateString();
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();

          return (
            <div
              key={index}
              style={{
                minHeight: view === 'month' ? '80px' : '120px',
                padding: '4px',
                borderRight: index % 7 !== 6 ? '1px solid #e5e7eb' : 'none',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: isToday ? '#f3f4f6' : 'white',
                opacity: isCurrentMonth ? 1 : 0.5,
              }}
            >
              <div style={{
                fontSize: '12px',
                fontWeight: isToday ? 'bold' : 'normal',
                color: isToday ? '#1e40af' : '#374151',
                marginBottom: '4px',
              }}>
                {date.getDate()}
              </div>
              
              {/* イベント */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {dayEvents.slice(0, view === 'month' ? 2 : 3).map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    style={{
                      padding: '2px 4px',
                      fontSize: '10px',
                      borderRadius: '4px',
                      backgroundColor: event.type === 'lesson' ? '#dbeafe' : '#d1fae5',
                      color: event.type === 'lesson' ? '#1e40af' : '#065f46',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {event.start.toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                ))}
                {dayEvents.length > (view === 'month' ? 2 : 3) && (
                  <div style={{
                    fontSize: '10px',
                    color: '#6b7280',
                    textAlign: 'center',
                  }}>
                    +{dayEvents.length - (view === 'month' ? 2 : 3)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};