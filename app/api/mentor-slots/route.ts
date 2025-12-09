/**
 * Mentor Slots API - CRUD for mentor lesson slot management
 *
 * GET  /api/mentor-slots - List mentor's own slots
 * POST /api/mentor-slots - Create a new slot (or recurring slots)
 */

import { withAuth } from "@/lib/middleware/with-auth";
import { apiSuccess, apiServerError, apiValidationError, apiForbidden } from "@/lib/api-response";
import { userRepository, lessonSlotsRepository } from "@/lib/repositories";
import { requireMentor } from "@/lib/auth";
import { z } from "zod";

// ========================================
// Validation Schemas
// ========================================

const CreateSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  maxCapacity: z.number().int().min(1).max(100).optional().default(1),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const CreateRecurringSchema = z.object({
  recurring: z.literal(true),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:mm"),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  maxCapacity: z.number().int().min(1).max(100).optional().default(1),
  tags: z.array(z.string()).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
});

const RequestSchema = z.union([
  CreateSlotSchema,
  CreateRecurringSchema,
]);

// ========================================
// GET - List mentor's slots
// ========================================

export const GET = withAuth(async ({ userId: clerkUserId, request }) => {
  try {
    // Get current user
    const user = await userRepository.findByClerkId(clerkUserId);
    if (!user) {
      return apiForbidden("User not found");
    }

    // Verify mentor role
    try {
      requireMentor(user);
    } catch {
      return apiForbidden("Mentor access required");
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as "available" | "booked" | "cancelled" | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    // Fetch mentor's slots
    const results = await lessonSlotsRepository.findByMentor(user.id, {
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    // Get statistics
    const stats = await lessonSlotsRepository.getMentorStats(user.id);

    return apiSuccess({
      slots: results.map(r => ({
        ...r.slot,
        mentor: r.mentor,
      })),
      stats,
    });
  } catch (error) {
    console.error("Error fetching mentor slots:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to fetch slots"));
  }
});

// ========================================
// POST - Create slot(s)
// ========================================

export const POST = withAuth(async ({ userId: clerkUserId, request }) => {
  try {
    // Get current user
    const user = await userRepository.findByClerkId(clerkUserId);
    if (!user) {
      return apiForbidden("User not found");
    }

    // Verify mentor role
    try {
      requireMentor(user);
    } catch {
      return apiForbidden("Mentor access required");
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = RequestSchema.safeParse(body);

    if (!parseResult.success) {
      return apiValidationError(parseResult.error.message);
    }

    const data = parseResult.data;

    // Handle recurring slots
    if ("recurring" in data && data.recurring) {
      const pattern = {
        mentorId: user.id,
        startTime: data.startTime,
        endTime: data.endTime,
        price: data.price,
        maxCapacity: data.maxCapacity,
        tags: data.tags,
        daysOfWeek: data.daysOfWeek,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        metadata: data.metadata,
      };

      try {
        const slots = await lessonSlotsRepository.createRecurring(pattern);
        return apiSuccess({
          message: `Created ${slots.length} recurring slots`,
          slots,
          recurringId: slots[0]?.recurringId,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("Conflict")) {
          return apiValidationError(error.message);
        }
        throw error;
      }
    }

    // Handle single slot
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    // Validate time range
    if (endTime <= startTime) {
      return apiValidationError("End time must be after start time");
    }

    // Check for conflicts
    const hasConflict = await lessonSlotsRepository.hasConflict(
      user.id,
      startTime,
      endTime
    );

    if (hasConflict) {
      return apiValidationError("Time slot conflicts with existing slot");
    }

    // Create slot
    const slot = await lessonSlotsRepository.create({
      mentorId: user.id,
      startTime,
      endTime,
      price: data.price,
      maxCapacity: data.maxCapacity,
      tags: data.tags,
      metadata: data.metadata,
    });

    return apiSuccess({ slot }, { status: 201 });
  } catch (error) {
    console.error("Error creating slot:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to create slot"));
  }
});
