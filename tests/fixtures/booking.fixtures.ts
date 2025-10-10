/**
 * Test fixtures and mock data for booking page tests
 */

export interface MockMentor {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  rate: number;
}

export interface MockSlot {
  id: string;
  startTime: string;
  endTime: string;
  price: string;
  isAvailable: boolean;
  mentor?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface MockReservation {
  id: string;
  slotId: string;
  userId: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  createdAt: string;
  slot?: {
    startTime: string;
    endTime: string;
  };
  mentor?: {
    id: string;
    name: string;
    email: string;
  };
}

// Mock mentors
export const mockMentors: MockMentor[] = [
  {
    id: "mentor_1",
    name: "田中 太郎",
    email: "tanaka@example.com",
    subjects: ["math", "science"],
    rate: 3000,
  },
  {
    id: "mentor_2",
    name: "佐藤 花子",
    email: "sato@example.com",
    subjects: ["english", "japanese"],
    rate: 3500,
  },
  {
    id: "mentor_3",
    name: "山田 次郎",
    email: "yamada@example.com",
    subjects: ["math", "physics"],
    rate: 4000,
  },
  {
    id: "mentor_4",
    name: "鈴木 美咲",
    email: "suzuki@example.com",
    subjects: ["english", "history"],
    rate: 2500,
  },
];

// Generate mock slots for testing
export function generateMockSlots(date: Date, count: number = 10): MockSlot[] {
  const slots: MockSlot[] = [];
  const timeSlots = [
    { start: 9, end: 10 },   // Morning
    { start: 10, end: 11 },  // Morning
    { start: 11, end: 12 },  // Morning
    { start: 13, end: 14 },  // Afternoon
    { start: 14, end: 15 },  // Afternoon
    { start: 15, end: 16 },  // Afternoon
    { start: 16, end: 17 },  // Afternoon
    { start: 18, end: 19 },  // Evening
    { start: 19, end: 20 },  // Evening
    { start: 20, end: 21 },  // Evening
  ];

  for (let i = 0; i < Math.min(count, timeSlots.length); i++) {
    const mentor = mockMentors[i % mockMentors.length];
    const timeSlot = timeSlots[i];

    const startTime = new Date(date);
    startTime.setHours(timeSlot.start, 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(timeSlot.end, 0, 0, 0);

    slots.push({
      id: `slot_${date.getTime()}_${i}`,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      price: mentor.rate.toString(),
      isAvailable: Math.random() > 0.3, // 70% available
      mentor: {
        id: mentor.id,
        name: mentor.name,
        email: mentor.email,
      },
    });
  }

  return slots;
}

// Mock lesson slots for current week
export const mockLessonSlots: MockSlot[] = (() => {
  const slots: MockSlot[] = [];
  const today = new Date();

  // Generate slots for the next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    // Generate 5-10 slots per day
    const slotsPerDay = Math.floor(Math.random() * 6) + 5;
    slots.push(...generateMockSlots(date, slotsPerDay));
  }

  return slots;
})();

// Mock reservations for the current user
export const mockReservations: MockReservation[] = [
  {
    id: "res_1",
    slotId: "slot_1",
    userId: "user_test123",
    status: "confirmed",
    paymentStatus: "paid",
    createdAt: new Date().toISOString(),
    slot: {
      startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 90000000).toISOString(),
    },
    mentor: mockMentors[0],
  },
  {
    id: "res_2",
    slotId: "slot_2",
    userId: "user_test123",
    status: "pending",
    paymentStatus: "unpaid",
    createdAt: new Date().toISOString(),
    slot: {
      startTime: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      endTime: new Date(Date.now() + 176400000).toISOString(),
    },
    mentor: mockMentors[1],
  },
  {
    id: "res_3",
    slotId: "slot_3",
    userId: "user_test123",
    status: "confirmed",
    paymentStatus: "paid",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    slot: {
      startTime: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
      endTime: new Date(Date.now() + 262800000).toISOString(),
    },
    mentor: mockMentors[2],
  },
];

// Helper function to filter slots by criteria
export function filterSlots(
  slots: MockSlot[],
  criteria: {
    date?: Date;
    mentorIds?: string[];
    priceRange?: [number, number];
    timeSlot?: "all" | "morning" | "afternoon" | "evening";
    subject?: string;
  }
): MockSlot[] {
  return slots.filter((slot) => {
    // Filter by date
    if (criteria.date) {
      const slotDate = new Date(slot.startTime);
      if (slotDate.toDateString() !== criteria.date.toDateString()) {
        return false;
      }
    }

    // Filter by mentor
    if (criteria.mentorIds && criteria.mentorIds.length > 0) {
      if (!slot.mentor || !criteria.mentorIds.includes(slot.mentor.id)) {
        return false;
      }
    }

    // Filter by price range
    if (criteria.priceRange) {
      const price = parseFloat(slot.price);
      if (price < criteria.priceRange[0] || price > criteria.priceRange[1]) {
        return false;
      }
    }

    // Filter by time slot
    if (criteria.timeSlot && criteria.timeSlot !== "all") {
      const hour = new Date(slot.startTime).getHours();

      switch (criteria.timeSlot) {
        case "morning":
          if (hour < 9 || hour >= 12) return false;
          break;
        case "afternoon":
          if (hour < 12 || hour >= 18) return false;
          break;
        case "evening":
          if (hour < 18 || hour >= 21) return false;
          break;
      }
    }

    return true;
  });
}

// Generate calendar days for a given month
export function getCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  return days;
}

// Check if a date has available slots
export function hasAvailableSlots(date: Date, slots: MockSlot[]): boolean {
  return slots.some((slot) => {
    const slotDate = new Date(slot.startTime);
    return (
      slotDate.toDateString() === date.toDateString() &&
      slot.isAvailable
    );
  });
}

// Format date for display
export function formatDate(date: Date, format: "short" | "long" | "time" = "short"): string {
  switch (format) {
    case "short":
      return date.toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
      });
    case "long":
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      });
    case "time":
      return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      });
    default:
      return date.toString();
  }
}

// Mock API responses
export const mockApiResponses = {
  lessons: {
    success: {
      slots: mockLessonSlots,
      total: mockLessonSlots.length,
    },
    empty: {
      slots: [],
      total: 0,
    },
    error: {
      error: "Failed to fetch lessons",
      message: "Database connection error",
    },
  },
  reservations: {
    success: {
      reservations: mockReservations,
      total: mockReservations.length,
    },
    empty: {
      reservations: [],
      total: 0,
    },
    error: {
      error: "Failed to fetch reservations",
      message: "Authentication required",
    },
  },
  booking: {
    success: {
      reservation: {
        id: "new_res_1",
        status: "pending",
        message: "Reservation created successfully",
      },
    },
    conflict: {
      error: "Slot already booked",
      message: "This time slot is no longer available",
    },
    error: {
      error: "Booking failed",
      message: "Internal server error",
    },
  },
  payment: {
    success: {
      url: "https://checkout.stripe.com/pay/test_session_123",
      sessionId: "test_session_123",
    },
    error: {
      error: "Payment initialization failed",
      message: "Invalid reservation ID",
    },
  },
};

// Test data generators for edge cases
export const edgeCaseData = {
  // Very long mentor name
  longNameMentor: {
    id: "mentor_long",
    name: "This is a very long mentor name that should be truncated in the UI to prevent layout issues",
    email: "longname@example.com",
  },

  // Special characters in names
  specialCharMentor: {
    id: "mentor_special",
    name: "山田 太郎 (PhD) - 数学・物理学専門",
    email: "yamada.phd@example.com",
  },

  // High price slot
  expensiveSlot: {
    id: "slot_expensive",
    price: "99999",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    isAvailable: true,
  },

  // Free slot
  freeSlot: {
    id: "slot_free",
    price: "0",
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    isAvailable: true,
  },

  // Past date (should be disabled)
  pastDate: new Date(Date.now() - 86400000),

  // Far future date
  futureDateFar: new Date(Date.now() + 31536000000), // 1 year from now
};