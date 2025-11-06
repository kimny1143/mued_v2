/**
 * RAG Metrics Calculation Batch Job
 * 夜間バッチでai_dialogue_logを集計してメトリクスを算出
 *
 * 実行スケジュール: 毎日 02:00 JST
 * 実行方法:
 *   - Vercel Cron (Production)
 *   - Node.js Script (Development)
 */

import { db } from '@/db';
import {
  aiDialogueLog,
  ragMetricsHistory,
  type NewRagMetricsHistory
} from '@/db/schema/rag-metrics';
import { sql, between, count, avg } from 'drizzle-orm';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

// SLO Targets
const SLO_TARGETS = {
  citationRate: 70.0,      // 70%以上の回答に根拠提示
  latencyP50Ms: 1500,      // P50: 1.5秒以内
  latencyP95Ms: 3000,      // P95: 3.0秒以内
  costPerAnswer: 3.0,      // 平均3円/回答以内
  relevanceScore: 0.7,     // 関連性スコア0.7以上
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
  console.log(`Calculating metrics for period: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

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
      `
    })
    .from(aiDialogueLog)
    .where(between(aiDialogueLog.createdAt, startDate, endDate));

  // Get unique sources separately using a subquery
  const uniqueSourcesResult = await db.execute<{ sources: string[] }>(sql`
    SELECT ARRAY_AGG(DISTINCT source) as sources
    FROM (
      SELECT jsonb_array_elements(citations)->>'source' as source
      FROM ${aiDialogueLog}
      WHERE ${between(aiDialogueLog.createdAt, startDate, endDate)}
        AND citations IS NOT NULL
    ) expanded_sources
  `);

  // 2. Latency percentile calculation
  const latencyPercentiles = await db
    .select({
      p50: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms)`,
      p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)`,
      p99: sql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms)`
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
      totalCost: sql<number>`SUM(token_cost_jpy)`
    })
    .from(aiDialogueLog)
    .where(between(aiDialogueLog.createdAt, startDate, endDate));

  // 4. Volume metrics calculation
  const volumeMetrics = await db
    .select({
      totalQueries: count(),
      uniqueUsers: sql<number>`COUNT(DISTINCT user_id)`,
      avgTokens: avg(aiDialogueLog.totalTokens)
    })
    .from(aiDialogueLog)
    .where(between(aiDialogueLog.createdAt, startDate, endDate));

  // 5. Quality metrics calculation
  const qualityMetrics = await db
    .select({
      avgRelevance: avg(aiDialogueLog.relevanceScore),
      positiveVotesRate: sql<number>`
        AVG(
          CASE
            WHEN user_feedback = 1 THEN 100.0
            WHEN user_feedback = -1 THEN 0.0
            ELSE NULL
          END
        )
      `
    })
    .from(aiDialogueLog)
    .where(between(aiDialogueLog.createdAt, startDate, endDate));

  const uniqueSourcesCount = uniqueSourcesResult.rows[0]?.sources?.length || 0;

  return {
    citationRate: citationMetrics[0]?.citationRate || null,
    citationCount: citationMetrics[0]?.citationCount || 0,
    uniqueSourcesCount,
    latencyP50Ms: latencyPercentiles[0]?.p50 || null,
    latencyP95Ms: latencyPercentiles[0]?.p95 || null,
    latencyP99Ms: latencyPercentiles[0]?.p99 || null,
    costPerAnswer: Number(costMetrics[0]?.avgCost) || null,
    totalCost: Number(costMetrics[0]?.totalCost) || null,
    totalQueries: volumeMetrics[0]?.totalQueries || 0,
    uniqueUsers: volumeMetrics[0]?.uniqueUsers || 0,
    averageTokensPerQuery: Number(volumeMetrics[0]?.avgTokens) || null,
    averageRelevanceScore: Number(qualityMetrics[0]?.avgRelevance) || null,
    positiveVotesRate: qualityMetrics[0]?.positiveVotesRate || null,
  };
}

/**
 * Check SLO compliance based on calculated metrics
 */
function checkSloCompliance(metrics: MetricsCalculationResult) {
  const citationRateMet =
    metrics.citationRate !== null &&
    metrics.citationRate >= SLO_TARGETS.citationRate;

  const latencyMet =
    metrics.latencyP50Ms !== null &&
    metrics.latencyP50Ms <= SLO_TARGETS.latencyP50Ms &&
    metrics.latencyP95Ms !== null &&
    metrics.latencyP95Ms <= SLO_TARGETS.latencyP95Ms;

  const costMet =
    metrics.costPerAnswer !== null &&
    metrics.costPerAnswer <= SLO_TARGETS.costPerAnswer;

  const relevanceMet =
    metrics.averageRelevanceScore !== null &&
    metrics.averageRelevanceScore >= SLO_TARGETS.relevanceScore;

  const overallMet = citationRateMet && latencyMet && costMet && relevanceMet;

  return {
    citationRateMet,
    latencyMet,
    costMet,
    relevanceMet,
    overallMet
  };
}

/**
 * Main batch job execution
 */
export async function runRagMetricsCalculation(
  targetDate?: Date
): Promise<void> {
  try {
    // Default to yesterday if no date specified
    const processDate = targetDate || subDays(new Date(), 1);
    const startDate = startOfDay(processDate);
    const endDate = endOfDay(processDate);

    // Convert to UTC for database queries
    const startDateUtc = fromZonedTime(startDate, 'Asia/Tokyo');
    const endDateUtc = fromZonedTime(endDate, 'Asia/Tokyo');

    // Calculate metrics
    const metrics = await calculateMetricsForPeriod(startDateUtc, endDateUtc);

    // Check SLO compliance
    const sloCompliance = checkSloCompliance(metrics);

    // Prepare record for insertion
    const metricsRecord: NewRagMetricsHistory = {
      date: endDateUtc,
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
      sloCompliance
    };

    // Insert metrics into history table
    await db.insert(ragMetricsHistory).values(metricsRecord);

    console.log(`✅ Metrics calculation completed for ${format(processDate, 'yyyy-MM-dd')}`);
    console.log('Metrics:', JSON.stringify(metrics, null, 2));
    console.log('SLO Compliance:', JSON.stringify(sloCompliance, null, 2));

    // Alert if SLO is not met
    if (!sloCompliance.overallMet) {
      await sendSloAlert(processDate, sloCompliance);
    }

  } catch (error) {
    console.error('❌ Error in RAG metrics calculation:', error);
    throw error;
  }
}

/**
 * Send alert when SLO targets are not met
 */
async function sendSloAlert(
  date: Date,
  compliance: ReturnType<typeof checkSloCompliance>
): Promise<void> {
  const violations: string[] = [];

  if (!compliance.citationRateMet) {
    violations.push('Citation Rate');
  }
  if (!compliance.latencyMet) {
    violations.push('Response Latency');
  }
  if (!compliance.costMet) {
    violations.push('Cost per Answer');
  }
  if (!compliance.relevanceMet) {
    violations.push('Relevance Score');
  }

  const message = `SLO violations detected for ${format(date, 'yyyy-MM-dd')}: ${violations.join(', ')}`;

  console.error(`🚨 ${message}`);

  // TODO: Implement actual alerting mechanism
  // - Send to Slack
  // - Send email to admin
  // - Create incident in PagerDuty
  // - Log to monitoring system
}

/**
 * Backfill historical metrics for a date range
 */
export async function backfillMetrics(
  startDate: Date,
  endDate: Date
): Promise<void> {
  console.log(`Starting backfill from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    await runRagMetricsCalculation(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('✅ Backfill completed');
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'backfill') {
    // Usage: npm run job:rag-metrics backfill 2025-10-01 2025-10-29
    const startDate = new Date(args[1]);
    const endDate = new Date(args[2]);

    backfillMetrics(startDate, endDate)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    // Run for yesterday by default
    runRagMetricsCalculation()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}