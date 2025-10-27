"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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

export default function BookLessonPage() {
  const params = useParams();
  const router = useRouter();
  const [slot, setSlot] = useState<LessonSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSlotDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchSlotDetails = async () => {
    try {
      const response = await fetch(`/api/lessons/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch slot details");
      const data = await response.json();
      setSlot(data.slot);
    } catch (err) {
      setError("Failed to load lesson information");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slotId: params.id,
          notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Booking failed");
      }

      const data = await response.json();

      // Open Stripe payment page
      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId: data.reservation.id,
        }),
      });

      if (checkoutResponse.ok) {
        const checkoutData = await checkoutResponse.json();
        // Redirect to Stripe Checkout page
        window.location.href = checkoutData.url;
      } else {
        // Go to reservations tab even on error
        router.push("/dashboard/lessons?tab=reservations");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Booking failed";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "long",
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
    }).format(parseFloat(price));
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-500 mb-4">Lesson not found</p>
          <Link href="/dashboard/lessons" className="text-blue-600 hover:underline">
            Back to Lessons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">Booking Confirmation</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* Mentor Information */}
          <div className="flex items-start gap-4">
            {slot.mentor?.profileImageUrl ? (
              <img
                src={slot.mentor.profileImageUrl}
                alt={slot.mentor.name}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-2xl">
                  {slot.mentor?.name?.charAt(0) || "?"}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold">{slot.mentor?.name}</h2>
              {slot.mentor?.bio && (
                <p className="text-gray-600 mt-1">{slot.mentor.bio}</p>
              )}
              {slot.mentor?.skills && slot.mentor.skills.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {slot.mentor.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lesson Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Date & Time:</span>
              <span className="font-medium">{formatDateTime(slot.startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span>
                {new Date(slot.endTime).getHours() - new Date(slot.startTime).getHours()} hours
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Price:</span>
              <span className="font-semibold text-xl text-blue-600">
                {formatPrice(slot.price)}
              </span>
            </div>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any message or questions for your mentor"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <Link
                href="/dashboard/lessons"
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg text-center hover:bg-gray-300 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting || slot.currentCapacity >= slot.maxCapacity}
                className={`flex-1 py-3 px-4 rounded-lg transition ${
                  submitting || slot.currentCapacity >= slot.maxCapacity
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {submitting ? "Processing..." : "Confirm Booking"}
              </button>
            </div>
          </form>

          <p className="text-sm text-gray-500 text-center">
            * You will be redirected to the payment page after confirming your booking
          </p>
        </div>
      </div>
    </div>
  );
}