"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/locale-context";
import { useLessons } from "@/hooks/use-lessons";
import { useReservations } from "@/hooks/use-reservations";
import { usePayment } from "@/hooks/use-payment";
import { ReservationTable } from "@/components/features/reservation-table";
import { BookingConfirmationModal } from "@/components/features/booking-confirmation-modal";
import { AccessibleCalendar } from "@/components/features/accessible-calendar";
import { ChatMatchingPanel } from "@/components/features/chat-matching";
import { LoadingState } from "@/components/ui/loading-state";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardTabs } from "@/components/layouts/dashboard-tabs";
import type { MentorProfile, MatchResult } from "@/types/matching";

type TabType = "chat-matching" | "booking" | "reservations";

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
  const { t } = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("chat-matching");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMentors, setSelectedMentors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 15000]);
  const [timeSlot, setTimeSlot] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  // Read tab and payment status from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      const payment = params.get('payment');

      if (tab === 'chat-matching' || tab === 'reservations' || tab === 'booking') {
        setActiveTab(tab as TabType);
      }

      if (payment) {
        setPaymentStatus(payment);
        // Clear message after 5 seconds
        setTimeout(() => setPaymentStatus(null), 5000);
      }
    }
  }, []);

  const { slots, loading } = useLessons({
    available: false, // Get all slots (including reserved ones)
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

  // Available tags (TODO: get from database)
  const availableTags = [
    { id: "piano", label: "Piano" },
    { id: "guitar", label: "Guitar" },
    { id: "bass", label: "Bass" },
    { id: "drums", label: "Drums" },
    { id: "vocal", label: "Vocal" },
    { id: "composition", label: "Composition & Arrangement" },
    { id: "theory", label: "Music Theory" },
    { id: "dtm", label: "DTM/DAW" },
    { id: "beginner", label: "Beginner" },
    { id: "intermediate", label: "Intermediate" },
    { id: "advanced", label: "Advanced" },
    { id: "jazz", label: "Jazz" },
    { id: "classical", label: "Classical" },
    { id: "pop", label: "Pop" },
    { id: "rock", label: "Rock" },
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

    // Tag matching - check if slot.tags and selectedTags have common elements
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

      {/* Payment Status Message */}
      {paymentStatus && (
        <div className={`mb-6 p-4 rounded-lg ${
          paymentStatus === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          {paymentStatus === 'success' ? (
            <>
              <div className="flex items-center gap-2 font-semibold mb-1">
                <span>✅</span>
                <span>{t.lessons.payment.success}</span>
              </div>
              <p className="text-sm">{t.lessons.payment.successDesc}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 font-semibold mb-1">
                <span>⚠️</span>
                <span>{t.lessons.payment.cancelled}</span>
              </div>
              <p className="text-sm">{t.lessons.payment.cancelledDesc}</p>
            </>
          )}
        </div>
      )}

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
            onClick={() => setActiveTab("chat-matching")}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === "chat-matching"
                ? "text-[var(--color-brand-green)] border-b-2 border-[var(--color-brand-green)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.lessons.tabs.chatMatching || "Chat AI"}
            <span className="ml-2 px-2 py-0.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
              New
            </span>
          </button>
          <button
            onClick={() => setActiveTab("booking")}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === "booking"
                ? "text-[var(--color-brand-green)] border-b-2 border-[var(--color-brand-green)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.lessons.tabs.booking}
          </button>
          <button
            onClick={() => setActiveTab("reservations")}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === "reservations"
                ? "text-[var(--color-brand-green)] border-b-2 border-[var(--color-brand-green)]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.lessons.tabs.reservations}
            {reservations.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--color-brand-green)] text-[var(--color-brand-text)] rounded-full">
                {reservations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === "chat-matching" ? (
        /* Chat-based AI Matching View */
        <div className="max-w-4xl mx-auto">
          <ChatMatchingPanel
            onMentorSelected={(mentor: MentorProfile, matchResult: MatchResult) => {
              // Show confirmation before navigating
              console.log('Mentor selected:', mentor.name, 'Score:', matchResult.score.totalScore);
              const confirmed = window.confirm(
                `${mentor.name}さんの予約ページに移動しますか？\n\n※チャット履歴は保存されています。`
              );
              if (confirmed) {
                setSelectedMentors([mentor.id]);
                setActiveTab("booking");
              }
            }}
            onStepChange={(step, data) => {
              // Analytics tracking
              console.log('Chat matching step:', step, data);
            }}
            maxSuggestions={3}
            className="h-[600px]"
          />
        </div>
      ) : activeTab === "booking" ? (
        /* 3-Column Layout */
        <div className="grid grid-cols-[280px_400px_1fr] gap-8">
        {/* LEFT: Filter Sidebar */}
        <div className="bg-white rounded-lg border border-gray-100 p-6 h-fit sticky top-4 shadow-sm">
          {/* Mentors */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">{t.lessons.filters.mentors}</h3>
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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">{t.lessons.filters.price}</h3>
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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">{t.lessons.filters.timeSlot}</h3>
            <div className="space-y-3">
              {[
                { value: "all", label: t.lessons.filters.timeSlots.all },
                { value: "morning", label: t.lessons.filters.timeSlots.morning },
                { value: "afternoon", label: t.lessons.filters.timeSlots.afternoon },
                { value: "evening", label: t.lessons.filters.timeSlots.evening },
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
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 uppercase tracking-wide">{t.lessons.filters.filterByTags}</h3>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTags.includes(tag.id)
                      ? "bg-[var(--color-brand-green)] text-[var(--color-brand-text)] shadow-sm"
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
                {t.lessons.filters.clearTags} ({selectedTags.length} {t.lessons.filters.selectedTags})
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
            {t.lessons.filters.resetFilters}
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
                {t.lessons.slots.noSlots}
              </p>
              <p className="text-sm text-gray-500">
                {t.lessons.slots.noSlotsDesc}
              </p>
            </div>
          ) : (
            filteredSlots.map((slot) => {
              const isReserved = !!slot.reservation;
              const isCompleted = slot.reservation?.paymentStatus === "completed";

              return (
                <div
                  key={slot.id}
                  className={`relative bg-white border rounded-xl p-5 transition-all duration-200 ${
                    isReserved
                      ? "border-blue-200 bg-blue-50/30"
                      : "border-gray-100 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5"
                  }`}
                >
                {/* Reserved Badge */}
                {isReserved && (
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {isCompleted ? t.lessons.slots.reserved : t.lessons.slots.pending}
                    </span>
                  </div>
                )}

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

                {/* Action Button */}
                {isReserved ? (
                  <button
                    onClick={() => setActiveTab("reservations")}
                    className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                  >
                    {t.lessons.slots.viewDetails}
                  </button>
                ) : (
                  <button
                    onClick={() => handleBooking(slot.id)}
                    className="w-full px-4 py-3 bg-[var(--color-brand-green)] text-[var(--color-brand-text)] rounded-lg font-semibold hover:bg-[var(--color-brand-green-hover)] active:scale-[0.98] transition-all shadow-sm hover:shadow-md"
                  >
                    {t.lessons.slots.bookNow}
                  </button>
                )}
                </div>
              );
            })
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
                {t.lessons.reservations.noReservations}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {t.lessons.reservations.noReservationsDesc}
              </p>
              <button
                onClick={() => setActiveTab("booking")}
                className="px-6 py-3 bg-[var(--color-brand-green)] text-[var(--color-brand-text)] rounded-lg font-semibold hover:bg-[var(--color-brand-green-hover)] transition-all shadow-sm hover:shadow-md"
              >
                {t.lessons.reservations.bookLesson}
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
