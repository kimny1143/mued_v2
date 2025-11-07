import { db } from "@/db";
import { ragMetricsHistory } from "@/db/schema/rag-metrics";
import { desc, gte, lte, and } from "drizzle-orm";
import { z } from "zod";
import { withAdminAuth } from "@/lib/middleware/with-auth";
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from "@/lib/api-response";

// Query parameter validation schema
const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(365).default(30), // Default: 30 days
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(["date", "citationRate", "latencyP50Ms", "costPerAnswer"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * GET /api/admin/rag-metrics/history
 *
 * Fetch historical RAG metrics with filtering and sorting
 *
 * Query parameters:
 * - startDate: ISO datetime string (optional)
 * - endDate: ISO datetime string (optional)
 * - limit: number (1-365, default: 30)
 * - offset: number (min: 0, default: 0)
 * - sortBy: "date" | "citationRate" | "latencyP50Ms" | "costPerAnswer" (default: "date")
 * - sortOrder: "asc" | "desc" (default: "desc")
 *
 * Authorization: Admin only
 */
export const GET = withAdminAuth(async ({ request }) => {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    };

    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
      return apiValidationError("Invalid query parameters", validation.error.errors);
    }

    const { startDate, endDate, limit, offset, sortBy, sortOrder } = validation.data;

    // Build WHERE conditions
    const conditions = [];
    if (startDate) {
      conditions.push(gte(ragMetricsHistory.date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(ragMetricsHistory.date, new Date(endDate)));
    }

    // Build query
    let query = db.select().from(ragMetricsHistory);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Apply sorting
    const sortColumn = ragMetricsHistory[sortBy];
    query = query.orderBy(sortOrder === "asc" ? sortColumn : desc(sortColumn)) as typeof query;

    // Apply pagination
    query = query.limit(limit).offset(offset) as typeof query;

    const history = await query;

    // Calculate summary statistics
    const summary = history.reduce(
      (acc, record) => {
        acc.totalQueries += Number(record.totalQueries) || 0;
        acc.avgCitationRate += Number(record.citationRate) || 0;
        acc.avgLatencyP50 += Number(record.latencyP50Ms) || 0;
        acc.avgCostPerAnswer += Number(record.costPerAnswer) || 0;
        acc.daysWithFullCompliance += record.sloCompliance?.overallMet ? 1 : 0;
        return acc;
      },
      {
        totalQueries: 0,
        avgCitationRate: 0,
        avgLatencyP50: 0,
        avgCostPerAnswer: 0,
        daysWithFullCompliance: 0,
      }
    );

    if (history.length > 0) {
      summary.avgCitationRate /= history.length;
      summary.avgLatencyP50 /= history.length;
      summary.avgCostPerAnswer /= history.length;
    }

    const complianceRate = history.length > 0
      ? (summary.daysWithFullCompliance / history.length) * 100
      : 0;

    return apiSuccess({
      history,
      summary: {
        ...summary,
        complianceRate: Math.round(complianceRate * 100) / 100,
        periodDays: history.length,
      },
      pagination: {
        limit,
        offset,
        total: history.length,
        hasMore: history.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching RAG metrics history:", error);
    return apiServerError(
      error instanceof Error ? error : new Error("Failed to fetch metrics history")
    );
  }
});
