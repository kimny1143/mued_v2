"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Mentor {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  bio: string | null;
  skills: string[] | null;
}

interface LessonSlot {
  id: string;
  mentorId: string;
  startTime: string;
  endTime: string;
  price: string;
  maxCapacity: number;
  currentCapacity: number;
  status: string;
  mentor: Mentor;
}

export default function LessonsPage() {
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchSlots();
  }, [selectedMentor]);

  const fetchSlots = async () => {
    try {
      const params = new URLSearchParams();
      params.append("available", "true");
      if (selectedMentor) {
        params.append("mentorId", selectedMentor);
      }

      const response = await fetch(`/api/lessons?${params.toString()}`);
      const data = await response.json();
      setSlots(data.slots || []);
    } catch (error) {
      console.error("Failed to fetch slots:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString("ja-JP", options);
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(parseFloat(price));
  };

  const handleBooking = (slotId: string) => {
    router.push(`/dashboard/lessons/${slotId}/book`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">レッスン予約</h1>
        <p className="text-gray-600">
          利用可能なレッスンスロットから予約できます
        </p>
      </div>

      {/* フィルター */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            メンターで絞り込み:
          </label>
          <select
            value={selectedMentor}
            onChange={(e) => setSelectedMentor(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全てのメンター</option>
            {Array.from(new Set(slots.map(s => s.mentor?.id)))
              .filter(Boolean)
              .map((mentorId) => {
                const mentor = slots.find(s => s.mentor?.id === mentorId)?.mentor;
                return mentor ? (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name}
                  </option>
                ) : null;
              })}
          </select>
        </div>
      </div>

      {/* レッスン一覧 */}
      {slots.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">
            現在予約可能なレッスンはありません
          </p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline"
          >
            ダッシュボードに戻る
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {slot.mentor?.profileImageUrl ? (
                    <img
                      src={slot.mentor.profileImageUrl}
                      alt={slot.mentor.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-500 text-lg">
                        {slot.mentor?.name?.charAt(0) || "?"}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{slot.mentor?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {slot.mentor?.skills?.join(", ") || ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">日時:</span>
                  <span className="font-medium">
                    {formatDateTime(slot.startTime)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">時間:</span>
                  <span>
                    {new Date(slot.endTime).getHours() - new Date(slot.startTime).getHours()}時間
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">料金:</span>
                  <span className="font-semibold text-blue-600">
                    {formatPrice(slot.price)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">空き:</span>
                  <span>
                    {slot.maxCapacity - slot.currentCapacity} / {slot.maxCapacity}
                  </span>
                </div>
              </div>

              {slot.mentor?.bio && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {slot.mentor.bio}
                </p>
              )}

              <button
                onClick={() => handleBooking(slot.id)}
                disabled={slot.currentCapacity >= slot.maxCapacity}
                className={`w-full py-2 px-4 rounded-lg transition ${
                  slot.currentCapacity >= slot.maxCapacity
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {slot.currentCapacity >= slot.maxCapacity
                  ? "満席"
                  : "予約する"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}