/**
 * Mentor Detail Modal Component
 * Shows mentor details and available slots for in-chat booking
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MentorProfile } from '@/types/matching';

interface MentorSlot {
  id: string;
  startTime: string;
  endTime: string;
  price: string;
  status: string;
}

interface MentorDetailModalProps {
  mentor: MentorProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onBookSlot: (slotId: string) => void;
}

export function MentorDetailModal({
  mentor,
  isOpen,
  onClose,
  onBookSlot,
}: MentorDetailModalProps) {
  const [slots, setSlots] = useState<MentorSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Fetch mentor's available slots when modal opens
  useEffect(() => {
    if (isOpen && mentor?.id) {
      setLoading(true);
      fetch(`/api/lessons?mentorId=${mentor.id}&available=true`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.slots) {
            setSlots(data.data.slots);
          } else {
            setSlots([]);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch mentor slots:', err);
          setSlots([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, mentor?.id]);

  if (!isOpen || !mentor) return null;

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return {
      date: date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      }),
      time: date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const handleBook = () => {
    if (selectedSlotId) {
      onBookSlot(selectedSlotId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {mentor.imageUrl ? (
              <Image
                src={mentor.imageUrl}
                alt={mentor.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-2xl font-bold">
                {mentor.name.charAt(0)}
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{mentor.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-yellow-500">★</span>
                <span className="font-medium">{mentor.rating.toFixed(1)}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 text-sm">
                  {mentor.totalReviews}件のレビュー
                </span>
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold text-gray-900">
                  ¥{mentor.pricePerHour.toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">/時間</span>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Bio */}
          {mentor.bio && (
            <p className="mt-4 text-sm text-gray-600">{mentor.bio}</p>
          )}

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {mentor.genres.slice(0, 4).map((genre) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        </div>

        {/* Slots */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="font-semibold text-gray-900 mb-4">空き時間を選択</h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>現在、予約可能な時間がありません</p>
              <p className="text-sm mt-1">別のメンターを選ぶか、後でもう一度お試しください</p>
            </div>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => {
                const { date, time } = formatDateTime(slot.startTime);
                const endTime = formatDateTime(slot.endTime).time;
                const isSelected = selectedSlotId === slot.id;

                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{date}</div>
                        <div className="text-sm text-gray-600">
                          {time} - {endTime}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          ¥{parseInt(slot.price).toLocaleString()}
                        </div>
                        {isSelected && (
                          <span className="text-xs text-blue-600">選択中</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              戻る
            </Button>
            <Button
              variant="primary"
              onClick={handleBook}
              disabled={!selectedSlotId}
              className="flex-1"
            >
              予約に進む
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
