"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, User } from "lucide-react";

interface LessonSlot {
  id: string;
  mentorId: string;
  mentorName: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "BOOKED" | "COMPLETED";
  price: number;
}

export default function BookingCalendarPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<LessonSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchSlots();
  }, []); // 初回マウント時のみ実行

  useEffect(() => {
    // selectedDate変更時は別途処理
    if (selectedDate) {
      fetchSlots();
    }
  }, [selectedDate]);

  const fetchSlots = async () => {
    console.log("Fetching slots..."); // デバッグ用
    setLoading(true); // 明示的にローディング開始

    try {
      const response = await fetch("/api/lessons?available=true");
      if (!response.ok) throw new Error("Failed to fetch slots");
      const data = await response.json();

      console.log(`Fetched ${data.slots?.length || 0} slots from API`); // デバッグ用

      // APIデータを画面用に整形
      const formattedSlots = data.slots.map((slot: {
        id: string;
        mentorId: string;
        mentor?: { name: string };
        startTime: string;
        endTime: string;
        price: string | number;
      }) => ({
        id: slot.id,
        mentorId: slot.mentorId,
        mentorName: slot.mentor?.name || "メンター",
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "AVAILABLE",
        price: typeof slot.price === "string" ? parseFloat(slot.price) : slot.price,
      }));

      setSlots(formattedSlots);
      console.log(`Set ${formattedSlots.length} slots to state`); // デバッグ用
    } catch (error) {
      console.error("Error fetching slots:", error);
      setSlots([]);
    } finally {
      setLoading(false);
      console.log("Loading complete"); // デバッグ用
    }
  };

  const handleBookSlot = (slotId: string) => {
    router.push(`/dashboard/lessons/${slotId}/book`);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const availableSlots = slots.filter((slot) => slot.status === "AVAILABLE");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          レッスン予約カレンダー
        </h1>
        <p className="text-gray-600">
          メンターのスケジュールから予約可能な時間を選択してください
        </p>
      </div>

      {/* カレンダービュー */}
      <div data-testid="calendar-view" className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            日付を選択
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="mx-auto h-12 w-12 mb-4 text-gray-400" />
            <p>選択された日付に利用可能なスロットはありません</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableSlots.map((slot) => (
              <div
                key={slot.id}
                data-available="true"
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-center mb-3">
                  <User className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="font-medium">{slot.mentorName}</span>
                </div>
                <div className="flex items-center mb-3 text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                  </span>
                </div>
                <div className="mb-4">
                  <span className="text-lg font-bold">¥{slot.price.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => handleBookSlot(slot.id)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  このスロットを予約
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}