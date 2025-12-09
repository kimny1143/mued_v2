/**
 * LessonSlotsRepository - Data access layer for Lesson Slots
 *
 * Provides CRUD operations for mentor lesson slots including:
 * - Slot creation/update/deletion
 * - Availability management
 * - Recurring slot support
 * - Conflict detection
 */

import { db } from '@/db/edge';
import { lessonSlots, users, reservations } from '@/db/schema';
import { desc, eq, and, gte, lte, sql, or, ne } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

export type SlotStatus = 'available' | 'booked' | 'cancelled';

export interface CreateSlotInput {
  mentorId: string;
  startTime: Date;
  endTime: Date;
  price: string;
  maxCapacity?: number;
  tags?: string[];
  recurringId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSlotInput {
  startTime?: Date;
  endTime?: Date;
  price?: string;
  maxCapacity?: number;
  status?: SlotStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SlotFilters {
  mentorId?: string;
  status?: SlotStatus;
  startDate?: Date;
  endDate?: Date;
  available?: boolean;
  tags?: string[];
  recurringId?: string;
  limit?: number;
  offset?: number;
}

export interface RecurringSlotPattern {
  mentorId: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  price: string;
  maxCapacity?: number;
  tags?: string[];
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, unknown>;
}

// ========================================
// LessonSlotsRepository Class
// ========================================

export class LessonSlotsRepository {
  // ========================================
  // CRUD Operations
  // ========================================

  /**
   * Create a new lesson slot
   */
  async create(input: CreateSlotInput) {
    const [slot] = await db
      .insert(lessonSlots)
      .values({
        mentorId: input.mentorId,
        startTime: input.startTime,
        endTime: input.endTime,
        price: input.price,
        maxCapacity: input.maxCapacity ?? 1,
        currentCapacity: 0,
        status: 'available',
        tags: input.tags,
        recurringId: input.recurringId,
        metadata: input.metadata,
      })
      .returning();

    return slot;
  }

  /**
   * Create multiple slots in a single transaction
   */
  async createMany(inputs: CreateSlotInput[]) {
    if (inputs.length === 0) return [];

    const slots = await db
      .insert(lessonSlots)
      .values(
        inputs.map((input) => ({
          mentorId: input.mentorId,
          startTime: input.startTime,
          endTime: input.endTime,
          price: input.price,
          maxCapacity: input.maxCapacity ?? 1,
          currentCapacity: 0,
          status: 'available' as const,
          tags: input.tags,
          recurringId: input.recurringId,
          metadata: input.metadata,
        }))
      )
      .returning();

    return slots;
  }

  /**
   * Find slot by ID
   */
  async findById(slotId: string) {
    const [slot] = await db
      .select()
      .from(lessonSlots)
      .where(eq(lessonSlots.id, slotId))
      .limit(1);

    return slot ?? null;
  }

  /**
   * Find slot with mentor info
   */
  async findByIdWithMentor(slotId: string) {
    const result = await db
      .select({
        slot: lessonSlots,
        mentor: {
          id: users.id,
          name: users.name,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(lessonSlots)
      .leftJoin(users, eq(lessonSlots.mentorId, users.id))
      .where(eq(lessonSlots.id, slotId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find slots with filters
   */
  async findMany(filters: SlotFilters = {}) {
    const conditions = [];

    if (filters.mentorId) {
      conditions.push(eq(lessonSlots.mentorId, filters.mentorId));
    }

    if (filters.status) {
      conditions.push(eq(lessonSlots.status, filters.status));
    }

    if (filters.available) {
      conditions.push(eq(lessonSlots.status, 'available'));
      conditions.push(
        sql`${lessonSlots.currentCapacity} < ${lessonSlots.maxCapacity}`
      );
    }

    if (filters.startDate) {
      conditions.push(gte(lessonSlots.startTime, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(lessonSlots.startTime, filters.endDate));
    }

    if (filters.recurringId) {
      conditions.push(eq(lessonSlots.recurringId, filters.recurringId));
    }

    let query = db
      .select({
        slot: lessonSlots,
        mentor: {
          id: users.id,
          name: users.name,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(lessonSlots)
      .leftJoin(users, eq(lessonSlots.mentorId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(lessonSlots.startTime) as typeof query;

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  /**
   * Find slots by mentor
   */
  async findByMentor(mentorId: string, filters: Omit<SlotFilters, 'mentorId'> = {}) {
    return this.findMany({ ...filters, mentorId });
  }

  /**
   * Find available slots for booking
   */
  async findAvailable(filters: Omit<SlotFilters, 'available'> = {}) {
    return this.findMany({ ...filters, available: true });
  }

  /**
   * Update slot
   */
  async update(slotId: string, input: UpdateSlotInput) {
    const [updated] = await db
      .update(lessonSlots)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(lessonSlots.id, slotId))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete slot (only if no active reservations)
   */
  async delete(slotId: string) {
    // Check for active reservations first
    const [activeReservation] = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.slotId, slotId),
          or(
            eq(reservations.status, 'pending'),
            eq(reservations.status, 'approved'),
            eq(reservations.status, 'paid')
          )
        )
      )
      .limit(1);

    if (activeReservation) {
      throw new Error('Cannot delete slot with active reservations');
    }

    const [deleted] = await db
      .delete(lessonSlots)
      .where(eq(lessonSlots.id, slotId))
      .returning();

    return deleted ?? null;
  }

  /**
   * Cancel slot (sets status to cancelled)
   */
  async cancel(slotId: string) {
    return this.update(slotId, { status: 'cancelled' });
  }

  // ========================================
  // Conflict Detection
  // ========================================

  /**
   * Check for overlapping slots for a mentor
   */
  async hasConflict(
    mentorId: string,
    startTime: Date,
    endTime: Date,
    excludeSlotId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(lessonSlots.mentorId, mentorId),
      ne(lessonSlots.status, 'cancelled'),
      // Overlapping time check: new slot starts before existing ends AND new slot ends after existing starts
      sql`${lessonSlots.startTime} < ${endTime}`,
      sql`${lessonSlots.endTime} > ${startTime}`,
    ];

    if (excludeSlotId) {
      conditions.push(ne(lessonSlots.id, excludeSlotId));
    }

    const [conflict] = await db
      .select({ id: lessonSlots.id })
      .from(lessonSlots)
      .where(and(...conditions))
      .limit(1);

    return !!conflict;
  }

  /**
   * Find all conflicting slots
   */
  async findConflicts(
    mentorId: string,
    startTime: Date,
    endTime: Date,
    excludeSlotId?: string
  ) {
    const conditions = [
      eq(lessonSlots.mentorId, mentorId),
      ne(lessonSlots.status, 'cancelled'),
      sql`${lessonSlots.startTime} < ${endTime}`,
      sql`${lessonSlots.endTime} > ${startTime}`,
    ];

    if (excludeSlotId) {
      conditions.push(ne(lessonSlots.id, excludeSlotId));
    }

    return db
      .select()
      .from(lessonSlots)
      .where(and(...conditions));
  }

  // ========================================
  // Recurring Slots
  // ========================================

  /**
   * Generate slots from a recurring pattern
   */
  generateRecurringSlots(pattern: RecurringSlotPattern): CreateSlotInput[] {
    const slots: CreateSlotInput[] = [];
    const recurringId = crypto.randomUUID();

    const currentDate = new Date(pattern.startDate);
    const endDate = new Date(pattern.endDate);

    // Parse time strings
    const [startHour, startMin] = pattern.startTime.split(':').map(Number);
    const [endHour, endMin] = pattern.endTime.split(':').map(Number);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      if (pattern.daysOfWeek.includes(dayOfWeek)) {
        const slotStart = new Date(currentDate);
        slotStart.setHours(startHour, startMin, 0, 0);

        const slotEnd = new Date(currentDate);
        slotEnd.setHours(endHour, endMin, 0, 0);

        slots.push({
          mentorId: pattern.mentorId,
          startTime: slotStart,
          endTime: slotEnd,
          price: pattern.price,
          maxCapacity: pattern.maxCapacity,
          tags: pattern.tags,
          recurringId,
          metadata: pattern.metadata,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Create recurring slots from pattern
   */
  async createRecurring(pattern: RecurringSlotPattern) {
    const slots = this.generateRecurringSlots(pattern);

    // Check for conflicts
    for (const slot of slots) {
      const hasConflict = await this.hasConflict(
        slot.mentorId,
        slot.startTime,
        slot.endTime
      );

      if (hasConflict) {
        throw new Error(
          `Conflict detected for slot at ${slot.startTime.toISOString()}`
        );
      }
    }

    return this.createMany(slots);
  }

  /**
   * Delete all slots in a recurring series
   */
  async deleteRecurringSeries(recurringId: string) {
    // Check for active reservations in the series
    const slotsWithReservations = await db
      .select({ slotId: lessonSlots.id })
      .from(lessonSlots)
      .innerJoin(reservations, eq(reservations.slotId, lessonSlots.id))
      .where(
        and(
          eq(lessonSlots.recurringId, recurringId),
          or(
            eq(reservations.status, 'pending'),
            eq(reservations.status, 'approved'),
            eq(reservations.status, 'paid')
          )
        )
      );

    if (slotsWithReservations.length > 0) {
      throw new Error(
        `Cannot delete recurring series: ${slotsWithReservations.length} slots have active reservations`
      );
    }

    const deleted = await db
      .delete(lessonSlots)
      .where(eq(lessonSlots.recurringId, recurringId))
      .returning();

    return deleted;
  }

  /**
   * Cancel future slots in a recurring series
   */
  async cancelFutureRecurring(recurringId: string, fromDate: Date = new Date()) {
    const updated = await db
      .update(lessonSlots)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(lessonSlots.recurringId, recurringId),
          gte(lessonSlots.startTime, fromDate),
          eq(lessonSlots.status, 'available')
        )
      )
      .returning();

    return updated;
  }

  // ========================================
  // Capacity Management
  // ========================================

  /**
   * Increment slot capacity (when a booking is made)
   */
  async incrementCapacity(slotId: string) {
    const [updated] = await db
      .update(lessonSlots)
      .set({
        currentCapacity: sql`${lessonSlots.currentCapacity} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(lessonSlots.id, slotId))
      .returning();

    // Update status if fully booked
    if (updated && updated.currentCapacity >= updated.maxCapacity) {
      return this.update(slotId, { status: 'booked' });
    }

    return updated ?? null;
  }

  /**
   * Decrement slot capacity (when a booking is cancelled)
   */
  async decrementCapacity(slotId: string) {
    const [updated] = await db
      .update(lessonSlots)
      .set({
        currentCapacity: sql`GREATEST(${lessonSlots.currentCapacity} - 1, 0)`,
        status: 'available', // Make available again
        updatedAt: new Date(),
      })
      .where(eq(lessonSlots.id, slotId))
      .returning();

    return updated ?? null;
  }

  // ========================================
  // Statistics
  // ========================================

  /**
   * Get slot statistics for a mentor
   */
  async getMentorStats(mentorId: string, startDate?: Date, endDate?: Date) {
    const conditions = [eq(lessonSlots.mentorId, mentorId)];

    if (startDate) {
      conditions.push(gte(lessonSlots.startTime, startDate));
    }

    if (endDate) {
      conditions.push(lte(lessonSlots.startTime, endDate));
    }

    const result = await db
      .select({
        totalSlots: sql<number>`count(*)`,
        availableSlots: sql<number>`count(*) filter (where ${lessonSlots.status} = 'available')`,
        bookedSlots: sql<number>`count(*) filter (where ${lessonSlots.status} = 'booked')`,
        cancelledSlots: sql<number>`count(*) filter (where ${lessonSlots.status} = 'cancelled')`,
        totalCapacity: sql<number>`coalesce(sum(${lessonSlots.maxCapacity}), 0)`,
        usedCapacity: sql<number>`coalesce(sum(${lessonSlots.currentCapacity}), 0)`,
      })
      .from(lessonSlots)
      .where(and(...conditions));

    return result[0];
  }
}

// ========================================
// Singleton Instance
// ========================================

export const lessonSlotsRepository = new LessonSlotsRepository();
