'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight, Video, User } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

interface Reservation {
  id: string;
  status: string;
  paymentStatus: string;
  notes?: string;
  startTime: string;
  endTime: string;
  mentor: {
    id: string;
    name: string;
    email: string;
  };
}

export function UpcomingLessons() {
  const { t } = useLocale();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setReservations(data.upcomingReservations);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    completed: 'bg-gray-100 text-gray-700',
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  if (loading) {
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t.dashboard.upcomingLessons.title}</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          {t.dashboard.upcomingLessons.title}
        </h2>
        <Link
          href="/dashboard/lessons"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          {t.dashboard.upcomingLessons.viewAll}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-8">
          <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">{t.dashboard.upcomingLessons.noLessons}</p>
          <Link
            href="/dashboard/lessons"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            {t.dashboard.upcomingLessons.bookFirst}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => {
            const { date, time, dayOfWeek } = formatDateTime(reservation.startTime);
            return (
              <Link
                key={reservation.id}
                href={`/dashboard/lessons/${reservation.id}`}
                className="flex items-start gap-3 p-3 border border-gray-200 rounded hover:border-blue-500 hover:shadow-sm transition-all group"
              >
                {/* Date Badge */}
                <div className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-medium text-blue-600">{dayOfWeek}</div>
                  <div className="text-lg font-bold text-gray-900">{date.split(' ')[1]}</div>
                  <div className="text-xs text-gray-600">{date.split(' ')[0]}</div>
                </div>

                {/* Lesson Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {t.dashboard.upcomingLessons.lessonWith} {reservation.mentor.name}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        statusColors[reservation.status as keyof typeof statusColors] ||
                        'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {reservation.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {time}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {reservation.mentor.name}
                    </span>
                  </div>

                  {reservation.paymentStatus && (
                    <div className="text-xs text-gray-500">
                      {t.dashboard.upcomingLessons.payment} {reservation.paymentStatus}
                    </div>
                  )}
                </div>

                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
