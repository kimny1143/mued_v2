/**
 * Mentor Slot Individual API - Operations on a specific slot
 *
 * GET    /api/mentor-slots/:id - Get slot details
 * PUT    /api/mentor-slots/:id - Update slot
 * DELETE /api/mentor-slots/:id - Delete or cancel slot
 */

import { withAuthParams } from "@/lib/middleware/with-auth";
import { apiSuccess, apiServerError, apiValidationError, apiForbidden, apiNotFound } from "@/lib/api-response";
import { userRepository, lessonSlotsRepository } from "@/lib/repositories";
import { requireMentor, requireOwnership } from "@/lib/auth";
import { z } from "zod";

// ========================================
// Validation Schemas
// ========================================

const UpdateSlotSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format").optional(),
  maxCapacity: z.number().int().min(1).max(100).optional(),
  status: z.enum(["available", "cancelled"]).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ========================================
// GET - Get slot details
// ========================================

export const GET = withAuthParams<{ id: string }>(async ({ userId: clerkUserId, params }) => {
  try {
    const slotId = params.id;

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

    // Fetch slot with mentor info
    const result = await lessonSlotsRepository.findByIdWithMentor(slotId);
    if (!result) {
      return apiNotFound("Slot not found");
    }

    // Verify ownership
    try {
      requireOwnership(user, result.slot.mentorId);
    } catch {
      return apiForbidden("You can only view your own slots");
    }

    return apiSuccess({
      slot: {
        ...result.slot,
        mentor: result.mentor,
      },
    });
  } catch (error) {
    console.error("Error fetching slot:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to fetch slot"));
  }
});

// ========================================
// PUT - Update slot
// ========================================

export const PUT = withAuthParams<{ id: string }>(async ({ userId: clerkUserId, request, params }) => {
  try {
    const slotId = params.id;

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

    // Fetch existing slot
    const existingSlot = await lessonSlotsRepository.findById(slotId);
    if (!existingSlot) {
      return apiNotFound("Slot not found");
    }

    // Verify ownership
    try {
      requireOwnership(user, existingSlot.mentorId);
    } catch {
      return apiForbidden("You can only update your own slots");
    }

    // Check if slot is booked (limited updates allowed)
    if (existingSlot.status === "booked" && existingSlot.currentCapacity > 0) {
      return apiValidationError("Cannot modify a booked slot with active reservations. Cancel reservations first.");
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = UpdateSlotSchema.safeParse(body);

    if (!parseResult.success) {
      return apiValidationError(parseResult.error.message);
    }

    const updates = parseResult.data;

    // Validate time range if both provided
    if (updates.startTime && updates.endTime) {
      const startTime = new Date(updates.startTime);
      const endTime = new Date(updates.endTime);

      if (endTime <= startTime) {
        return apiValidationError("End time must be after start time");
      }

      // Check for conflicts
      const hasConflict = await lessonSlotsRepository.hasConflict(
        user.id,
        startTime,
        endTime,
        slotId
      );

      if (hasConflict) {
        return apiValidationError("Time slot conflicts with existing slot");
      }
    } else if (updates.startTime || updates.endTime) {
      // Only one time provided - need to check against existing
      const startTime = updates.startTime ? new Date(updates.startTime) : existingSlot.startTime;
      const endTime = updates.endTime ? new Date(updates.endTime) : existingSlot.endTime;

      if (endTime <= startTime) {
        return apiValidationError("End time must be after start time");
      }

      const hasConflict = await lessonSlotsRepository.hasConflict(
        user.id,
        startTime,
        endTime,
        slotId
      );

      if (hasConflict) {
        return apiValidationError("Time slot conflicts with existing slot");
      }
    }

    // Build update object
    const updateData: Parameters<typeof lessonSlotsRepository.update>[1] = {};

    if (updates.startTime) updateData.startTime = new Date(updates.startTime);
    if (updates.endTime) updateData.endTime = new Date(updates.endTime);
    if (updates.price) updateData.price = updates.price;
    if (updates.maxCapacity) updateData.maxCapacity = updates.maxCapacity;
    if (updates.status) updateData.status = updates.status;
    if (updates.tags) updateData.tags = updates.tags;
    if (updates.metadata) updateData.metadata = updates.metadata;

    // Update slot
    const updatedSlot = await lessonSlotsRepository.update(slotId, updateData);

    return apiSuccess({ slot: updatedSlot });
  } catch (error) {
    console.error("Error updating slot:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to update slot"));
  }
});

// ========================================
// DELETE - Delete or cancel slot
// ========================================

export const DELETE = withAuthParams<{ id: string }>(async ({ userId: clerkUserId, request, params }) => {
  try {
    const slotId = params.id;

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

    // Fetch existing slot
    const existingSlot = await lessonSlotsRepository.findById(slotId);
    if (!existingSlot) {
      return apiNotFound("Slot not found");
    }

    // Verify ownership
    try {
      requireOwnership(user, existingSlot.mentorId);
    } catch {
      return apiForbidden("You can only delete your own slots");
    }

    // Check query param for action type
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "delete";

    if (action === "cancel") {
      // Soft delete - just cancel the slot
      const cancelledSlot = await lessonSlotsRepository.cancel(slotId);
      return apiSuccess({
        message: "Slot cancelled",
        slot: cancelledSlot,
      });
    }

    // Hard delete - only if no active reservations
    try {
      const deletedSlot = await lessonSlotsRepository.delete(slotId);
      return apiSuccess({
        message: "Slot deleted",
        slot: deletedSlot,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("active reservations")) {
        return apiValidationError(error.message + ". Use ?action=cancel to cancel the slot instead.");
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deleting slot:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to delete slot"));
  }
});
