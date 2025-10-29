import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function aggregateMetrics() {
  console.log('📊 Aggregating RAG metrics for the last 14 days...\n');

  try {
    // Get date range for last 14 days
    const today = new Date();
    const startDate = subDays(today, 14);

    console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(today, 'yyyy-MM-dd')}\n`);

    // Aggregate metrics for each day
    for (let i = 14; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      console.log(`Processing ${format(date, 'yyyy-MM-dd')}...`);

      // Get metrics for this day
      const metrics = await sql`
        SELECT
          COUNT(*) as total_queries,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(citation_rate) as avg_citation_rate,
          AVG(latency_ms) as avg_latency_ms,
          AVG(token_cost_jpy) as avg_cost_jpy,
          AVG(relevance_score) as avg_relevance_score,
          SUM(token_cost_jpy) as total_cost,
          AVG(total_tokens) as avg_tokens_per_query,
          COUNT(CASE WHEN user_feedback = 1 THEN 1 END) as positive_votes,
          COUNT(CASE WHEN user_feedback != 0 THEN 1 END) as total_votes,
          COUNT(DISTINCT CASE WHEN citations IS NOT NULL THEN
            jsonb_array_length(citations::jsonb) END) as citation_count
        FROM ai_dialogue_log
        WHERE created_at >= ${dayStart.toISOString()}
          AND created_at <= ${dayEnd.toISOString()}
      `;

      if (metrics.length === 0 || metrics[0].total_queries === 0) {
        console.log(`  ⚠️  No data for this day\n`);
        continue;
      }

      const m = metrics[0];

      // Calculate percentiles for latency
      const latencies = await sql`
        SELECT
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) as p99
        FROM ai_dialogue_log
        WHERE created_at >= ${dayStart.toISOString()}
          AND created_at <= ${dayEnd.toISOString()}
          AND latency_ms IS NOT NULL
      `;

      const citationRate = Number(m.avg_citation_rate) || 0;
      const latencyP50 = Math.round(Number(latencies[0]?.p50) || 0);
      const latencyP95 = Math.round(Number(latencies[0]?.p95) || 0);
      const latencyP99 = Math.round(Number(latencies[0]?.p99) || 0);
      const costPerAnswer = Number(m.avg_cost_jpy) || 0;
      const positiveRate = m.total_votes > 0
        ? (Number(m.positive_votes) / Number(m.total_votes)) * 100
        : 0;

      // SLO compliance
      const sloCompliance = {
        citationRate: { met: citationRate >= 70, target: 70, actual: citationRate },
        latency: { met: latencyP50 <= 1500, target: 1500, actual: latencyP50 },
        cost: { met: costPerAnswer <= 3, target: 3, actual: costPerAnswer },
      };

      // Insert or update
      await sql`
        INSERT INTO rag_metrics_history (
          date,
          citation_rate,
          citation_count,
          unique_sources_count,
          latency_p50_ms,
          latency_p95_ms,
          latency_p99_ms,
          cost_per_answer,
          total_cost,
          total_queries,
          unique_users,
          average_tokens_per_query,
          average_relevance_score,
          positive_votes_rate,
          slo_compliance
        ) VALUES (
          ${date.toISOString()},
          ${citationRate},
          ${Number(m.citation_count) || 0},
          ${Number(m.citation_count) || 0},
          ${latencyP50},
          ${latencyP95},
          ${latencyP99},
          ${costPerAnswer},
          ${Number(m.total_cost) || 0},
          ${Number(m.total_queries)},
          ${Number(m.unique_users)},
          ${Math.round(Number(m.avg_tokens_per_query) || 0)},
          ${Number(m.avg_relevance_score) || 0},
          ${positiveRate},
          ${JSON.stringify(sloCompliance)}
        )
        ON CONFLICT (DATE(date))
        DO UPDATE SET
          citation_rate = EXCLUDED.citation_rate,
          citation_count = EXCLUDED.citation_count,
          latency_p50_ms = EXCLUDED.latency_p50_ms,
          latency_p95_ms = EXCLUDED.latency_p95_ms,
          latency_p99_ms = EXCLUDED.latency_p99_ms,
          cost_per_answer = EXCLUDED.cost_per_answer,
          total_cost = EXCLUDED.total_cost,
          total_queries = EXCLUDED.total_queries,
          unique_users = EXCLUDED.unique_users,
          slo_compliance = EXCLUDED.slo_compliance
      `;

      console.log(`  ✅ Aggregated ${m.total_queries} queries, ${citationRate.toFixed(1)}% citation rate\n`);
    }

    console.log('✅ Metrics aggregation complete!\n');
    console.log('🎉 Refresh the dashboard to see historical charts:\n');
    console.log('   http://localhost:3000/dashboard/admin/rag-metrics\n');

  } catch (error) {
    console.error('❌ Error aggregating metrics:', error);
    process.exit(1);
  }
}

aggregateMetrics();
