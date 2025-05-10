'use client';

import React, { useEffect, useState } from 'react';
import { useMediaQuery } from 'react-responsive';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Clock, ChevronRight } from 'lucide-react';
import { Button } from '@ui/button';
import { Card } from '@ui/card';
import { ReservationModal } from './_components/ReservationModal';
import { LessonSlot } from './_components/ReservationTable';

// モックデータの定義
const mockLessonSlots: LessonSlot[] = [
  {
    id: '1',
    startTime: new Date('2024-06-01T10:00:00'),
    endTime: new Date('2024-06-01T11:00:00'),
    mentorId: 'mentor-1',
    mentorName: '山田先生',
    available: true,
    price: 5000,
  },
  {
    id: '2',
    startTime: new Date('2024-06-01T14:00:00'),
    endTime: new Date('2024-06-01T15:00:00'),
    mentorId: 'mentor-2',
    mentorName: '佐藤先生',
    available: true,
    price: 5500,
  },
  {
    id: '3',
    startTime: new Date('2024-06-02T11:00:00'),
    endTime: new Date('2024-06-02T12:00:00'),
    mentorId: 'mentor-1',
    mentorName: '山田先生',
    available: false,
    price: 5000,
  },
  {
    id: '4',
    startTime: new Date('2024-06-02T16:00:00'),
    endTime: new Date('2024-06-02T17:00:00'),
    mentorId: 'mentor-3',
    mentorName: '鈴木先生',
    available: true,
    price: 6000,
  },
  {
    id: '5',
    startTime: new Date('2024-06-03T09:00:00'),
    endTime: new Date('2024-06-03T10:00:00'),
    mentorId: 'mentor-2',
    mentorName: '佐藤先生',
    available: true,
    price: 5500,
  }
];

export const ReservationPage: React.FC = () => {
  const [lessonSlots, setLessonSlots] = useState<LessonSlot[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonSlot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // レスポンシブ対応のための画面幅チェック
  const isMobile = useMediaQuery({ maxWidth: 768 });

  useEffect(() => {
    // 実際の実装では、APIからデータを取得する
    const fetchLessonSlots = async () => {
      try {
        // API呼び出しの代わりにモックデータを使用
        setTimeout(() => {
          setLessonSlots(mockLessonSlots);
          setIsLoading(false);
        }, 500);
      } catch (err) {
        setError('レッスン枠の取得に失敗しました。');
        setIsLoading(false);
      }
    };

    fetchLessonSlots();
  }, []);

  const handleBooking = (lesson: LessonSlot) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">レッスン予約</h1>
      
      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  講師
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  料金
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  予約
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lessonSlots.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      {format(lesson.startTime, 'yyyy年MM月dd日', { locale: ja })}
                    </div>
                    <div className="text-gray-500">
                      {format(lesson.startTime, 'HH:mm')} - {format(lesson.endTime, 'HH:mm')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lesson.mentorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lesson.available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {lesson.available ? '予約可能' : '予約済み'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ¥{lesson.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      onClick={() => handleBooking(lesson)}
                      disabled={!lesson.available}
                    >
                      予約する
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden space-y-4">
        {lessonSlots.map((lesson) => (
          <Card key={lesson.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-900">
                {format(lesson.startTime, 'yyyy年MM月dd日', { locale: ja })}
              </div>
              <span
                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  lesson.available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {lesson.available ? '予約可能' : '予約済み'}
              </span>
            </div>
            <div className="flex items-center text-gray-500 text-sm mb-2">
              <Clock className="w-4 h-4 mr-1" />
              {format(lesson.startTime, 'HH:mm')} - {format(lesson.endTime, 'HH:mm')}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{lesson.mentorName}</div>
                <div className="text-sm text-gray-500">
                  ¥{lesson.price.toLocaleString()}
                </div>
              </div>
              <Button
                onClick={() => handleBooking(lesson)}
                disabled={!lesson.available}
                className="flex items-center"
              >
                予約する
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        slot={selectedLesson}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={async () => {
          console.log(`スロットID: ${selectedLesson?.id} の予約処理を開始します。`);
          return Promise.resolve();
        }}
      />
    </div>
  );
};

// App Routerのページエクスポート
export default function ReservationPageWrapper() {
  return <ReservationPage />;
} 