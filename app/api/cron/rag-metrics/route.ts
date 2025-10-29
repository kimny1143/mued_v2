import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  aiDialogueLog,
  ragMetricsHistory,
  type NewRagMetricsHistory,
} from "@/db/schema/rag-metrics";
import { sql, between, count, avg } from "drizzle-orm";
import { subDays, startOfDay, endOfDay, format } from "date-fns";

// SLO Targets
const SLO_TARGETS = {
  citationRate: 70.0, // 70%以上の回答に根拠提示
  latencyP50Ms: 1500, // P50: 1.5秒以内
  costPerAnswer: 3.0, // 平均3円/回答以内
} as const;

interface MetricsCalculationResult {
  citationRate: number | null;
  citationCount: number;
  uniqueSourcesCount: number;
  latencyP50Ms: number | null;
  latencyP95Ms: number | null;
  latencyP99Ms: number | null;
  costPerAnswer: number | null;
  totalCost: number | null;
  totalQueries: number;
  uniqueUsers: number;
  averageTokensPerQuery: number | null;
  averageRelevanceScore: number | null;
  positiveVotesRate: number | null;
}

/**
 * Calculate RAG metrics for a specific date range
 */
async function calculateMetricsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<MetricsCalculationResult> {
  console.log(
    `Calculating metrics for period: ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`
  );

  // 1. Citation metrics calculation
  const citationMetrics = await db
    .select({
      citationRate: sql<number>`
        AVG(
          CASE
            WHEN citations IS NOT NULL AND jsonb_array_length(citations) > 0
            THEN 100.0
            ELSE 0.0
          END
        )
      `,
      citationCount: sql<number>`
        SUM(
          CASE
            WHEN citations IS NOT NULL
            THEN jsonb_array_length(citations)
            ELSE 0
          END
        )
      `,
      uniqueSources: sql<string[]>`
        ARRAY_AGG(DISTINCT jsonb_array_elements(citations)->>'source')
        FILTER (WHERE citations IS NOT NULL)
      `,
    })
    .from(aiDialogueLog)
    .where(between(aiDialogueLog.createdAt, startDate, endDate));

  // 2. Latency percentile calculation
  const latencyPercentiles = await db
    .select({
      p50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)`,
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)`,
      p99: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)`,
    })
    .from(aiDialogueLog)
    .where(
      sql`${between(aiDialogueLog.createdAt, startDate, endDate)}
      AND ${aiDialogueLog.latencyMs} IS NOT NULL`
    );

  // 3. Cost metrics calculation
  const costMetrics = await db
    .select({
      avgCost: avg(aiDialogueLog.tokenCostJpy),
      totalCost: sql<number>`SUM(${aiDialogueLog.tokenCostJpy})`,
    })
    .from(aiDialogueLog)
    .where(
      sql`${between(aiDialogueLog.createdAt, startDate, endDate)}
      AND ${aiDialogueLog.tokenCostJpy} IS NOT NULL`
    );

  // 4. Query volume metrics
  const volumeMetrics = await db
    .select({
      totalQueries: count(),
      uniqueUsers: sql<number>`COUNT(DISTINCT ${aiDialogueLog.userId})`,
      avgTokens: avg(aiDialogueLog.totalTokens),
    })
    .from(aiDialogueLog)
    .where(between(aiDialogueLog.createdAt, startDate, endDate));

  // 5. Quality metrics
  const qualityMetrics = await db
    .select({
      avgRelevance: avg(aiDialogueLog.relevanceScore),
      positiveVotes: sql<number>`
        SUM(CASE WHEN ${aiDialogueLog.userFeedback} = 1 THEN 1 ELSE 0 END)
      `,
      totalVotes: sql<number>`
        COUNT(${aiDialogueLog.userFeedback})
        FILTER (WHERE ${aiDialogueLog.userFeedback} IS NOT NULL)
      `,
    })
    .from(aiDialogueLog)
    .where(between(aiDialogueLog.createdAt, startDate, endDate));

  const citation = citationMetrics[0];
  const latency = latencyPercentiles[0];
  const cost = costMetrics[0];
  const volume = volumeMetrics[0];
  const quality = qualityMetrics[0];

  return {
    citationRate: citation?.citationRate || null,
    citationCount: Number(citation?.citationCount) || 0,
    uniqueSourcesCount: citation?.uniqueSources?.length || 0,
    latencyP50Ms: latency?.p50 || null,
    latencyP95Ms: latency?.p95 || null,
    latencyP99Ms: latency?.p99 || null,
    costPerAnswer: cost?.avgCost ? Number(cost.avgCost) : null,
    totalCost: cost?.totalCost ? Number(cost.totalCost) : null,
    totalQueries: Number(volume?.totalQueries) || 0,
    uniqueUsers: Number(volume?.uniqueUsers) || 0,
    averageTokensPerQuery: volume?.avgTokens ? Number(volume.avgTokens) : null,
    averageRelevanceScore: quality?.avgRelevance ? Number(quality.avgRelevance) : null,
    positiveVotesRate:
      quality?.totalVotes && quality.totalVotes > 0
        ? (Number(quality.positiveVotes) / Number(quality.totalVotes)) * 100
        : null,
  };
}

/**
 * POST /api/cron/rag-metrics
 *
 * Vercel Cron job endpoint to calculate and store daily RAG metrics
 *
 * Authorization: Vercel Cron secret header
 * Schedule: Daily at 02:00 JST (17:00 UTC previous day)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET environment variable not configured");
      return NextResponse.json(
        { error: "Cron job not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("Unauthorized cron job attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Calculate metrics for yesterday (default behavior)
    const yesterday = subDays(new Date(), 1);
    const startDate = startOfDay(yesterday);
    const endDate = endOfDay(yesterday);

    console.log(`Starting RAG metrics calculation for ${format(yesterday, "yyyy-MM-dd")}`);

    const metrics = await calculateMetricsForPeriod(startDate, endDate);

    // Calculate SLO compliance
    const sloCompliance = {
      citationRateMet: metrics.citationRate
        ? metrics.citationRate >= SLO_TARGETS.citationRate
        : false,
      latencyMet: metrics.latencyP50Ms
        ? metrics.latencyP50Ms <= SLO_TARGETS.latencyP50Ms
        : false,
      costMet: metrics.costPerAnswer
        ? metrics.costPerAnswer <= SLO_TARGETS.costPerAnswer
        : false,
      overallMet: false,
    };

    sloCompliance.overallMet =
      sloCompliance.citationRateMet &&
      sloCompliance.latencyMet &&
      sloCompliance.costMet;

    // Store metrics in history table
    const [newRecord] = await db
      .insert(ragMetricsHistory)
      .values({
        date: startDate,
        citationRate: metrics.citationRate?.toString() || null,
        citationCount: metrics.citationCount,
        uniqueSourcesCount: metrics.uniqueSourcesCount,
        latencyP50Ms: metrics.latencyP50Ms,
        latencyP95Ms: metrics.latencyP95Ms,
        latencyP99Ms: metrics.latencyP99Ms,
        costPerAnswer: metrics.costPerAnswer?.toString() || null,
        totalCost: metrics.totalCost?.toString() || null,
        totalQueries: metrics.totalQueries,
        uniqueUsers: metrics.uniqueUsers,
        averageTokensPerQuery: metrics.averageTokensPerQuery,
        averageRelevanceScore: metrics.averageRelevanceScore?.toString() || null,
        positiveVotesRate: metrics.positiveVotesRate?.toString() || null,
        sloCompliance,
      } as NewRagMetricsHistory)
      .returning();

    console.log(`✅ RAG metrics calculation completed for ${format(yesterday, "yyyy-MM-dd")}`);
    console.log(`📊 SLO Compliance: ${sloCompliance.overallMet ? "MET ✅" : "NOT MET ❌"}`);
    console.log(`  - Citation Rate: ${metrics.citationRate?.toFixed(2)}% (target: ${SLO_TARGETS.citationRate}%)`);
    console.log(`  - P50 Latency: ${metrics.latencyP50Ms}ms (target: ${SLO_TARGETS.latencyP50Ms}ms)`);
    console.log(`  - Cost/Answer: ¥${metrics.costPerAnswer?.toFixed(2)} (target: ¥${SLO_TARGETS.costPerAnswer})`);

    return NextResponse.json({
      success: true,
      date: format(yesterday, "yyyy-MM-dd"),
      metrics,
      sloCompliance,
      recordId: newRecord.id,
    });
  } catch (error) {
    console.error("Error calculating RAG metrics:", error);
    return NextResponse.json(
      {
        error: "Failed to calculate metrics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/rag-metrics
 *
 * Manual trigger endpoint for testing (development only)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Manual trigger not available in production" },
      { status: 403 }
    );
  }

  // In development, allow manual trigger without auth
  return POST(request);
}
