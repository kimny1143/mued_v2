import { db } from "@/db";
import { aiDialogueLog, ragMetricsHistory } from "@/db/schema/rag-metrics";
import { desc, gte, lte, and, sql, count, avg } from "drizzle-orm";
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
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/admin/rag-metrics
 *
 * Fetch current RAG metrics and SLO status
 *
 * Query parameters:
 * - startDate: ISO datetime string (optional)
 * - endDate: ISO datetime string (optional)
 * - limit: number (1-1000, default: 100)
 * - offset: number (min: 0, default: 0)
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
    };

    const validation = querySchema.safeParse(queryParams);

    if (!validation.success) {
      return apiValidationError("Invalid query parameters", validation.error.errors);
    }

    const { startDate, endDate, limit, offset } = validation.data;

    // Build WHERE conditions
    const conditions = [];
    if (startDate) {
      conditions.push(gte(aiDialogueLog.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(aiDialogueLog.createdAt, new Date(endDate)));
    }

    // Fetch real-time metrics from ai_dialogue_log
    const metricsQuery = db
      .select({
        totalQueries: count(),
        avgCitationRate: avg(aiDialogueLog.citationRate),
        avgLatencyMs: avg(aiDialogueLog.latencyMs),
        avgCostJpy: avg(aiDialogueLog.tokenCostJpy),
        avgRelevanceScore: avg(aiDialogueLog.relevanceScore),
      })
      .from(aiDialogueLog);

    if (conditions.length > 0) {
      metricsQuery.where(and(...conditions));
    }

    const [metrics] = await metricsQuery;

    // Fetch historical metrics for trend analysis
    let historyQuery = db
      .select()
      .from(ragMetricsHistory)
      .orderBy(desc(ragMetricsHistory.date))
      .limit(limit)
      .offset(offset);

    if (startDate) {
      historyQuery = historyQuery.where(
        and(
          gte(ragMetricsHistory.date, new Date(startDate)),
          endDate ? lte(ragMetricsHistory.date, new Date(endDate)) : sql`true`
        )
      );
    }

    const history = await historyQuery;

    // Calculate SLO compliance
    const citationRateTarget = 70; // 70%
    const latencyP50Target = 1500; // 1.5s in ms
    const costPerAnswerTarget = 3.0; // ¥3.0

    const currentCitationRate = Number(metrics.avgCitationRate) || 0;
    const currentLatency = Number(metrics.avgLatencyMs) || 0;
    const currentCost = Number(metrics.avgCostJpy) || 0;

    const sloStatus = {
      citationRate: {
        current: currentCitationRate,
        target: citationRateTarget,
        met: currentCitationRate >= citationRateTarget,
      },
      latency: {
        current: currentLatency,
        target: latencyP50Target,
        met: currentLatency <= latencyP50Target,
      },
      cost: {
        current: currentCost,
        target: costPerAnswerTarget,
        met: currentCost <= costPerAnswerTarget,
      },
      overallMet:
        currentCitationRate >= citationRateTarget &&
        currentLatency <= latencyP50Target &&
        currentCost <= costPerAnswerTarget,
    };

    // Calculate trend (last 7 days vs previous 7 days)
    const last7Days = history.slice(0, 7);
    const previous7Days = history.slice(7, 14);

    const calculateAverage = (items: typeof history, field: keyof (typeof history)[0]) => {
      if (items.length === 0) return 0;
      const sum = items.reduce((acc, item) => {
        const value = item[field];
        return acc + (typeof value === 'string' ? parseFloat(value) : Number(value) || 0);
      }, 0);
      return sum / items.length;
    };

    const trends = {
      citationRate: {
        current: calculateAverage(last7Days, 'citationRate'),
        previous: calculateAverage(previous7Days, 'citationRate'),
        change: 0,
      },
      latency: {
        current: calculateAverage(last7Days, 'latencyP50Ms'),
        previous: calculateAverage(previous7Days, 'latencyP50Ms'),
        change: 0,
      },
      cost: {
        current: calculateAverage(last7Days, 'costPerAnswer'),
        previous: calculateAverage(previous7Days, 'costPerAnswer'),
        change: 0,
      },
    };

    // Calculate percentage change
    trends.citationRate.change = trends.citationRate.previous
      ? ((trends.citationRate.current - trends.citationRate.previous) / trends.citationRate.previous) * 100
      : 0;
    trends.latency.change = trends.latency.previous
      ? ((trends.latency.current - trends.latency.previous) / trends.latency.previous) * 100
      : 0;
    trends.cost.change = trends.cost.previous
      ? ((trends.cost.current - trends.cost.previous) / trends.cost.previous) * 100
      : 0;

    return apiSuccess({
      metrics: {
        totalQueries: Number(metrics.totalQueries) || 0,
        avgCitationRate: Number(metrics.avgCitationRate) || 0,
        avgLatencyMs: Number(metrics.avgLatencyMs) || 0,
        avgCostJpy: Number(metrics.avgCostJpy) || 0,
        avgRelevanceScore: Number(metrics.avgRelevanceScore) || 0,
      },
      sloStatus,
      trends,
      history,
      pagination: {
        limit,
        offset,
        total: history.length,
      },
    });
  } catch (error) {
    console.error("Error fetching RAG metrics:", error);
    return apiServerError(
      error instanceof Error ? error : new Error("Failed to fetch RAG metrics")
    );
  }
});
