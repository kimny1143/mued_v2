/**
 * Recurring Slots Series API - Operations on recurring slot series
 *
 * GET    /api/mentor-slots/recurring/:recurringId - Get all slots in series
 * DELETE /api/mentor-slots/recurring/:recurringId - Delete or cancel series
 */

import { withAuthParams } from "@/lib/middleware/with-auth";
import { apiSuccess, apiServerError, apiValidationError, apiForbidden, apiNotFound } from "@/lib/api-response";
import { userRepository, lessonSlotsRepository } from "@/lib/repositories";
import { requireMentor } from "@/lib/auth";

// ========================================
// GET - Get all slots in recurring series
// ========================================

export const GET = withAuthParams<{ recurringId: string }>(async ({ userId: clerkUserId, params }) => {
  try {
    const { recurringId } = params;

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

    // Fetch all slots in the recurring series
    const results = await lessonSlotsRepository.findMany({
      recurringId,
      mentorId: user.id, // Only return user's own recurring slots
    });

    if (results.length === 0) {
      return apiNotFound("Recurring series not found or not owned by you");
    }

    // Group by status for summary
    const summary = {
      total: results.length,
      available: results.filter(r => r.slot.status === "available").length,
      booked: results.filter(r => r.slot.status === "booked").length,
      cancelled: results.filter(r => r.slot.status === "cancelled").length,
    };

    return apiSuccess({
      recurringId,
      summary,
      slots: results.map(r => ({
        ...r.slot,
        mentor: r.mentor,
      })),
    });
  } catch (error) {
    console.error("Error fetching recurring series:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to fetch recurring series"));
  }
});

// ========================================
// DELETE - Delete or cancel recurring series
// ========================================

export const DELETE = withAuthParams<{ recurringId: string }>(async ({ userId: clerkUserId, request, params }) => {
  try {
    const { recurringId } = params;

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

    // Verify ownership by checking if any slots in series belong to user
    const existingSlots = await lessonSlotsRepository.findMany({
      recurringId,
      mentorId: user.id,
      limit: 1,
    });

    if (existingSlots.length === 0) {
      return apiNotFound("Recurring series not found or not owned by you");
    }

    // Check query params
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "cancel";
    const fromDateParam = searchParams.get("fromDate");

    if (action === "delete") {
      // Hard delete entire series (only if no active reservations)
      try {
        const deleted = await lessonSlotsRepository.deleteRecurringSeries(recurringId);
        return apiSuccess({
          message: `Deleted ${deleted.length} slots from recurring series`,
          deletedCount: deleted.length,
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("active reservations")) {
          return apiValidationError(error.message + ". Use ?action=cancel to cancel future slots instead.");
        }
        throw error;
      }
    }

    // Default: Cancel future slots
    const fromDate = fromDateParam ? new Date(fromDateParam) : new Date();
    const cancelled = await lessonSlotsRepository.cancelFutureRecurring(recurringId, fromDate);

    return apiSuccess({
      message: `Cancelled ${cancelled.length} future slots in recurring series`,
      cancelledCount: cancelled.length,
      fromDate: fromDate.toISOString(),
    });
  } catch (error) {
    console.error("Error deleting recurring series:", error);
    return apiServerError(error instanceof Error ? error : new Error("Failed to delete recurring series"));
  }
});
