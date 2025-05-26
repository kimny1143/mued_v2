// カレンダー関連の共通型定義

export interface ExtendedTimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  hourlyRate?: number;
  mentorId: string;
  mentorName: string | null;
  bookingStatus: 'available' | 'partial' | 'full' | 'unavailable';
  reservationCount: number;
  bookedTime: number;
  availableTime: number;
  bookingRate: number;
}

export interface MyReservation {
  id: string;
  slotId: string;
  studentId: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'APPROVED' | 'PENDING_APPROVAL';
  bookedStartTime: string;
  bookedEndTime: string;
  createdAt: string;
  slot?: {
    id: string;
    teacherId: string;
    teacher?: {
      id: string;
      name: string | null;
    };
  };
}

export interface Mentor {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
  bio?: string;
  specialties?: string[];
  rating?: {
    avgRating: number;
    totalReviews: number;
  };
  availableSlots?: ExtendedTimeSlot[];
  availableSlotsCount?: number;
}

export interface CalendarViewProps {
  currentDate: Date;
  allTimeSlots: ExtendedTimeSlot[];
  myReservations: MyReservation[];
  mentors: Mentor[];
  selectedDates: Date[];
}

export interface CalendarHandlers {
  onDateClick: (date: Date) => void;
  onSlotClick: (date: Date, slot: ExtendedTimeSlot, mentor: Mentor | null) => void;
  onViewChange: (view: 'month' | 'day' | 'week') => void;
  onDateNavigation: (date: Date) => void;
} 