"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLessons } from "@/hooks/use-lessons";
import { useReservations } from "@/hooks/use-reservations";
import { usePayment } from "@/hooks/use-payment";
import { useMentorMatching } from "@/hooks/use-mentor-matching";
import { ReservationTable } from "@/components/features/reservation-table";
import { BookingConfirmationModal } from "@/components/features/booking-confirmation-modal";
import { AccessibleCalendar } from "@/components/features/accessible-calendar";
import { MentorMatchCard } from "@/components/features/mentor-match-card";
import { MatchingPreferencesPanel } from "@/components/features/matching-preferences";
import { MatchingStats } from "@/components/features/matching-stats";
import { LoadingState } from "@/components/ui/loading-state";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardTabs } from "@/components/layouts/dashboard-tabs";
import type { StudentProfile, MentorProfile } from "@/types/matching";

type TabType = "booking" | "reservations" | "ai-matching";

interface SelectedSlot {
  id: string;
  startTime: string;
  endTime: string;
  price: string;
  mentor?: {
    name: string;
    email: string;
  };
}

export default function UnifiedBookingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("booking");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMentors, setSelectedMentors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 15000]);
  const [timeSlot, setTimeSlot] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  const { slots, loading } = useLessons({
    available: true,
  });
  const { reservations, loading: reservationsLoading } = useReservations();
  const { processPayment } = usePayment();

  // Extract unique mentors from slots
  const mentors = Array.from(
    new Set(slots.map((s) => s.mentor?.id))
  )
    .filter(Boolean)
    .map((id) => {
      const slot = slots.find((s) => s.mentor?.id === id);
      return { id: id!, name: slot?.mentor?.name || "Unknown" };
    });

  // TODO: Replace with actual user profile from authentication/database
  const studentProfile: StudentProfile = {
    id: "student-001",
    skillLevel: "intermediate",
    learningGoals: ["technique_improvement", "repertoire_expansion"],
    learningStyle: ["visual", "auditory"],
    preferredGenres: ["classical", "jazz"],
    availableTimeSlots: [
      { day: "monday", startHour: 18, endHour: 21 },
      { day: "wednesday", startHour: 18, endHour: 21 },
      { day: "saturday", startHour: 10, endHour: 16 },
    ],
    priceRange: { min: 3000, max: 8000 },
    previousMentorIds: [],
  };

  // TODO: Replace with actual mentor profiles from database
  const mentorProfiles: MentorProfile[] = mentors.map((mentor, idx) => ({
    id: mentor.id,
    name: mentor.name,
    skillLevel: idx % 2 === 0 ? "advanced" : "professional",
    specializations: ["technique_improvement", "performance_preparation"],
    teachingStyles: ["visual", "auditory"],
    genres: ["classical", "jazz", "contemporary"],
    availableTimeSlots: [
      { day: "monday", startHour: 16, endHour: 21 },
      { day: "wednesday", startHour: 16, endHour: 21 },
      { day: "saturday", startHour: 9, endHour: 17 },
    ],
    pricePerHour: 5000 + idx * 1000,
    rating: 4.0 + (idx % 10) * 0.1,
    totalReviews: 10 + idx * 5,
    responseRate: 0.85 + (idx % 15) * 0.01,
    successfulMatches: 20 + idx * 3,
  }));

  const matching = useMentorMatching({
    studentProfile,
    availableMentors: mentorProfiles,
    topN: 10,
  });

  // Available tags (TODO: get from database)
  const availableTags = [
    { id: "piano", label: "ピアノ" },
    { id: "guitar", label: "ギター" },
    { id: "bass", label: "ベース" },
    { id: "drums", label: "ドラム" },
    { id: "vocal", label: "ボーカル" },
    { id: "composition", label: "作曲・編曲" },
    { id: "theory", label: "音楽理論" },
    { id: "dtm", label: "DTM・DAW" },
    { id: "beginner", label: "初心者" },
    { id: "intermediate", label: "中級者" },
    { id: "advanced", label: "上級者" },
    { id: "jazz", label: "ジャズ" },
    { id: "classical", label: "クラシック" },
    { id: "pop", label: "ポップス" },
    { id: "rock", label: "ロック" },
  ];

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Filter slots by selected date and filters
  const filteredSlots = slots.filter((slot) => {
    const slotDate = new Date(slot.startTime);
    const isSameDate =
      slotDate.toDateString() === selectedDate.toDateString();

    const matchesMentor =
      selectedMentors.length === 0 ||
      selectedMentors.includes(slot.mentor?.id || "");

    const slotPrice = parseFloat(slot.price?.toString() || "0");
    const matchesPrice =
      slotPrice >= priceRange[0] && slotPrice <= priceRange[1];

    // タグマッチング - slot.tagsとselectedTagsの共通要素があるか
    const matchesTags =
      selectedTags.length === 0 ||
      (slot.tags &&
        Array.isArray(slot.tags) &&
        selectedTags.some((tag) => slot.tags?.includes(tag)));

    return isSameDate && matchesMentor && matchesPrice && matchesTags;
  });

  const handleBooking = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot) {
      setSelectedSlot({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price?.toString() || "0",
        mentor: slot.mentor
          ? {
              name: slot.mentor.name,
              email: slot.mentor.email,
            }
          : undefined,
      });
      setIsModalOpen(true);
    }
  };

  const handleConfirmBooking = () => {
    if (selectedSlot) {
      router.push(`/dashboard/lessons/${selectedSlot.id}/book`);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSlot(null);
  };

  const handlePayment = async (reservationId: string) => {
    await processPayment(reservationId);
  };

  const toggleMentor = (mentorId: string) => {
    setSelectedMentors((prev) =>
      prev.includes(mentorId)
        ? prev.filter((id) => id !== mentorId)
        : [...prev, mentorId]
    );
  };

  const mappedReservations = reservations.map((res) => ({
    id: res.id,
    mentorName: res.mentor?.name || "Unknown",
    mentorEmail: res.mentor?.email || "",
    startTime: new Date(res.slot?.startTime || new Date()),
    endTime: new Date(res.slot?.endTime || new Date()),
    status: res.status,
    paymentStatus: res.paymentStatus,
  }));

  if (loading || reservationsLoading) {
    return <LoadingState />;
  }

  return (
    <DashboardLayout>
      <DashboardTabs />

      {/* Booking Confirmation Modal */}
      <BookingConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmBooking}
        slot={selectedSlot}
      />

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("ai-matching")}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === "ai-matching"
                ? "text-[var(--color-brand-green)] border-b-2 border-[var(--color-brand-green)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            ✨ AIマッチング
            {matching.perfectMatches.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--color-brand-green)] text-white rounded-full">
                {matching.perfectMatches.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("booking")}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === "booking"
                ? "text-[var(--color-brand-green)] border-b-2 border-[var(--color-brand-green)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            レッスン予約
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === "reservations"
                ? "text-[var(--color-brand-green)] border-b-2 border-[var(--color-brand-green)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            予約状況
            {reservations.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--color-brand-green)] text-white rounded-full">
                {reservations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "ai-matching" ? (
        /* AI Matching View */
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-brand-green)] to-green-600 rounded-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-3">AIメンターマッチング</h2>
            <p className="text-lg opacity-90">
              あなたの学習スタイル、目標、スケジュールに基づいて、最適なメンターを見つけます
            </p>
          </div>

          {/* Matching Stats */}
          <MatchingStats stats={matching.stats} />

          {/* 2-Column Layout: Preferences + Results */}
          <div className="grid grid-cols-[320px_1fr] gap-8">
            {/* LEFT: Matching Preferences */}
            <div className="space-y-6">
              <MatchingPreferencesPanel
                preferences={matching.preferences}
                onChange={matching.updatePreferences}
                onReset={matching.resetPreferences}
              />

              {/* Student Profile Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  あなたのプロフィール
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">スキルレベル:</span>
                    <span className="ml-2 font-medium">{studentProfile.skillLevel}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">学習目標:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {studentProfile.learningGoals.map((goal) => (
                        <span
                          key={goal}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                        >
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">予算:</span>
                    <span className="ml-2 font-medium">
                      ¥{studentProfile.priceRange.min.toLocaleString()} - ¥
                      {studentProfile.priceRange.max.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Matching Results */}
            <div className="space-y-6">
              {/* Perfect Matches Section */}
              {matching.perfectMatches.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">✨</span>
                    最適なマッチ ({matching.perfectMatches.length})
                  </h3>
                  <div className="grid gap-4">
                    {matching.perfectMatches.map((result) => (
                      <MentorMatchCard
                        key={result.mentor.id}
                        matchResult={result}
                        onSelect={(mentorId) => {
                          // TODO: Navigate to mentor's available slots
                          setSelectedMentors([mentorId]);
                          setActiveTab("booking");
                        }}
                        showDetailedScore={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Matches Section */}
              {matching.recommendedMentors.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="text-2xl">💡</span>
                    おすすめのメンター ({matching.recommendedMentors.length})
                  </h3>
                  <div className="grid gap-4">
                    {matching.recommendedMentors
                      .filter((r) => !r.isPerfectMatch)
                      .map((result) => (
                        <MentorMatchCard
                          key={result.mentor.id}
                          matchResult={result}
                          onSelect={(mentorId) => {
                            setSelectedMentors([mentorId]);
                            setActiveTab("booking");
                          }}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Other Matches */}
              {matching.topMatches.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    その他のメンター
                  </h3>
                  <div className="grid gap-4">
                    {matching.topMatches
                      .filter((r) => !r.isRecommended)
                      .map((result) => (
                        <MentorMatchCard
                          key={result.mentor.id}
                          matchResult={result}
                          onSelect={(mentorId) => {
                            setSelectedMentors([mentorId]);
                            setActiveTab("booking");
                          }}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {matching.topMatches.length === 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    マッチするメンターが見つかりませんでした
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    検索条件を調整してみてください
                  </p>
                  <button
                    onClick={matching.resetPreferences}
                    className="px-6 py-3 bg-[var(--color-brand-green)] text-white rounded-lg font-semibold hover:bg-[var(--color-brand-green-hover)] transition-all"
                  >
                    設定をリセット
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "booking" ? (
        /* 3-Column Layout */
        <div className="grid grid-cols-[280px_400px_1fr] gap-8">
        {/* LEFT: Filter Sidebar */}
        <div className="bg-white rounded-lg border border-gray-100 p-6 h-fit sticky top-4 shadow-sm">
          {/* Mentors */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">講師</h3>
            <div className="space-y-3">
              {mentors.map((mentor) => (
                <label key={mentor.id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedMentors.includes(mentor.id)}
                    onChange={() => toggleMentor(mentor.id)}
                    className="w-4 h-4 text-[var(--color-brand-green)] border-gray-300 rounded focus:ring-2 focus:ring-[var(--color-brand-green)] focus:ring-offset-1"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{mentor.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">料金</h3>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="15000"
                step="1000"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>¥{priceRange[0].toLocaleString()}</span>
                <span>¥{priceRange[1].toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Time Slot */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">時間帯</h3>
            <div className="space-y-3">
              {[
                { value: "all", label: "すべて" },
                { value: "morning", label: "午前 (9:00-12:00)" },
                { value: "afternoon", label: "午後 (12:00-18:00)" },
                { value: "evening", label: "夜間 (18:00-21:00)" },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="timeSlot"
                    value={option.value}
                    checked={timeSlot === option.value}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-4 h-4 text-[var(--color-brand-green)] border-gray-300 focus:ring-2 focus:ring-[var(--color-brand-green)] focus:ring-offset-1"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">タグで絞り込み</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTags.includes(tag.id)
                      ? "bg-[var(--color-brand-green)] text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="mt-3 text-xs text-gray-600 hover:text-gray-900 underline"
              >
                タグをクリア ({selectedTags.length}件選択中)
              </button>
            )}
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setSelectedMentors([]);
              setPriceRange([0, 15000]);
              setTimeSlot("all");
              setSelectedTags([]);
            }}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            フィルターをリセット
          </button>
        </div>

        {/* CENTER: Monthly Calendar */}
        <AccessibleCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          slots={slots}
        />

        {/* RIGHT: Time Slot List */}
        <div className="space-y-3 h-[600px] overflow-y-auto pr-2">
          {filteredSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                この日は予約可能な枠がありません
              </p>
              <p className="text-sm text-gray-500">
                別の日付を選択するか、フィルターを調整してください
              </p>
            </div>
          ) : (
            filteredSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Mentor Info */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex-shrink-0 flex items-center justify-center text-gray-600 font-semibold">
                    {(slot.mentor?.name || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-[var(--color-text-primary)] truncate">
                      {slot.mentor?.name || "Unknown"}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {slot.mentor?.email || ""}
                    </p>
                  </div>
                </div>

                {/* Time */}
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gray-50 rounded-lg">
                  <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {new Date(slot.startTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(slot.endTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    <span className="text-gray-500">(60 min)</span>
                  </span>
                </div>

                {/* Tags */}
                {slot.tags && slot.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {slot.tags.slice(0, 5).map((tag) => {
                      const tagLabel = availableTags.find((t) => t.id === tag)?.label || tag;
                      return (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {tagLabel}
                        </span>
                      );
                    })}
                    {slot.tags.length > 5 && (
                      <span className="px-2 py-0.5 text-gray-500 text-xs">
                        +{slot.tags.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Price */}
                <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
                  ¥{parseFloat(slot.price?.toString() || "0").toLocaleString()}
                </div>

                {/* Book Button */}
                <button
                  onClick={() => handleBooking(slot.id)}
                  className="w-full px-4 py-3 bg-[var(--color-brand-green)] text-white rounded-lg font-semibold hover:bg-[var(--color-brand-green-hover)] active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                >
                  予約する
                </button>
              </div>
            ))
          )}
        </div>
        </div>
      ) : (
        /* Reservations View */
        <div>
          {reservations.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                予約がありません
              </p>
              <p className="text-sm text-gray-500 mb-6">
                まずはレッスンを予約してみましょう
              </p>
              <button
                onClick={() => setActiveTab("booking")}
                className="px-6 py-3 bg-[var(--color-brand-green)] text-white rounded-lg font-semibold hover:bg-[var(--color-brand-green-hover)] transition-all shadow-sm hover:shadow-md"
              >
                レッスンを予約する
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <ReservationTable
                reservations={mappedReservations}
                onPayment={handlePayment}
              />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
