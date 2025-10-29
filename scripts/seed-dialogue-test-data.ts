import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { subDays } from 'date-fns';
import { randomUUID } from 'crypto';

// Load environment variables
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

interface Citation {
  source: string;
  sourceType: 'note' | 'material' | 'document' | 'web';
  excerpt: string;
  confidence: number;
  timestamp: string;
  pageNumber?: number;
  paragraphIndex?: number;
}

async function seedTestData() {
  console.log('🌱 Seeding test dialogue data...\n');

  try {
    // Check if users exist
    const users = await sql`SELECT id, clerk_id FROM users LIMIT 1`;

    if (users.length === 0) {
      console.log('❌ No users found in database. Please create a user first.');
      console.log('   Sign in to the application to create your first user.');
      process.exit(1);
    }

    const testUserId = users[0].id;
    console.log(`✅ Found user: ${testUserId}\n`);

    // Generate test data for the last 14 days
    const testDialogues = [];
    const models = ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'];
    const topics = [
      { query: 'ジャズピアノの基本的なコード進行を教えてください', keywords: ['ジャズ', 'コード', 'II-V-I'] },
      { query: 'ピアノ初心者におすすめの練習曲は？', keywords: ['初心者', '練習曲', 'バイエル'] },
      { query: 'スケール練習の効果的な方法を教えて', keywords: ['スケール', '練習方法', 'テクニック'] },
      { query: 'ブルースピアノの特徴的なリズムとは', keywords: ['ブルース', 'リズム', 'シャッフル'] },
      { query: '即興演奏の始め方について知りたい', keywords: ['即興', 'アドリブ', 'スケール'] },
    ];

    for (let i = 14; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dialoguesPerDay = Math.floor(Math.random() * 5) + 3; // 3-7 dialogues per day

      for (let j = 0; j < dialoguesPerDay; j++) {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        const model = models[Math.floor(Math.random() * models.length)];

        // Generate realistic citations
        const citationCount = Math.floor(Math.random() * 4) + 1; // 1-4 citations
        const citations: Citation[] = [];
        for (let c = 0; c < citationCount; c++) {
          citations.push({
            source: `教材-${Math.floor(Math.random() * 100) + 1}`,
            sourceType: Math.random() > 0.5 ? 'material' : 'note',
            excerpt: `${topic.keywords[c % topic.keywords.length]}に関する詳細な説明...`,
            confidence: 0.7 + Math.random() * 0.3, // 0.7-1.0
            timestamp: date.toISOString(),
          });
        }

        const citationRate = (citationCount / 5) * 100; // Assuming 5 possible citations max
        const latencyMs = Math.floor(Math.random() * 2000) + 500; // 500-2500ms
        const promptTokens = Math.floor(Math.random() * 800) + 200; // 200-1000 tokens
        const completionTokens = Math.floor(Math.random() * 1500) + 500; // 500-2000 tokens
        const totalTokens = promptTokens + completionTokens;

        // Cost calculation (rough estimate)
        // gpt-4o-mini: $0.15/1M input, $0.60/1M output
        const inputCostUSD = (promptTokens / 1_000_000) * 0.15;
        const outputCostUSD = (completionTokens / 1_000_000) * 0.60;
        const totalCostUSD = inputCostUSD + outputCostUSD;
        const tokenCostJpy = totalCostUSD * 150; // USD to JPY conversion

        const relevanceScore = 0.7 + Math.random() * 0.3; // 0.7-1.0
        const userFeedback = Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0; // 20% feedback rate

        testDialogues.push({
          user_id: testUserId,
          session_id: randomUUID(),
          query: topic.query,
          response: `${topic.keywords.join('、')}について説明します。${citations.map(c => `[${c.source}]`).join(' ')} これらの教材を参考にすると、より深く理解できます。`,
          model_used: model,
          citations: JSON.stringify(citations),
          latency_ms: latencyMs,
          token_cost_jpy: tokenCostJpy.toFixed(2),
          citation_rate: citationRate.toFixed(2),
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          relevance_score: relevanceScore.toFixed(2),
          user_feedback: userFeedback,
          context_window_size: 128000,
          temperature: 0.7,
          created_at: date.toISOString(),
        });
      }
    }

    console.log(`📊 Generated ${testDialogues.length} test dialogues\n`);

    // Insert test data
    for (const dialogue of testDialogues) {
      await sql`
        INSERT INTO ai_dialogue_log (
          user_id, session_id, query, response, model_used,
          citations, latency_ms, token_cost_jpy, citation_rate,
          prompt_tokens, completion_tokens, total_tokens,
          relevance_score, user_feedback, context_window_size, temperature,
          created_at, updated_at
        ) VALUES (
          ${dialogue.user_id}, ${dialogue.session_id}, ${dialogue.query}, ${dialogue.response}, ${dialogue.model_used},
          ${dialogue.citations}::jsonb, ${dialogue.latency_ms}, ${dialogue.token_cost_jpy}, ${dialogue.citation_rate},
          ${dialogue.prompt_tokens}, ${dialogue.completion_tokens}, ${dialogue.total_tokens},
          ${dialogue.relevance_score}, ${dialogue.user_feedback}, ${dialogue.context_window_size}, ${dialogue.temperature},
          ${dialogue.created_at}, ${dialogue.created_at}
        )
      `;
    }

    console.log('✅ Test data inserted successfully!\n');

    // Display summary statistics
    const summary = await sql`
      SELECT
        COUNT(*) as total_dialogues,
        AVG(citation_rate) as avg_citation_rate,
        AVG(latency_ms) as avg_latency_ms,
        AVG(token_cost_jpy) as avg_cost_jpy,
        AVG(relevance_score) as avg_relevance_score
      FROM ai_dialogue_log
    `;

    console.log('📈 Summary Statistics:');
    console.log('─────────────────────────────────────────────────────');
    console.log(`Total Dialogues: ${summary[0].total_dialogues}`);
    console.log(`Avg Citation Rate: ${Number(summary[0].avg_citation_rate).toFixed(2)}%`);
    console.log(`Avg Latency: ${Number(summary[0].avg_latency_ms).toFixed(0)}ms`);
    console.log(`Avg Cost: ¥${Number(summary[0].avg_cost_jpy).toFixed(2)}`);
    console.log(`Avg Relevance Score: ${Number(summary[0].avg_relevance_score).toFixed(2)}`);
    console.log('─────────────────────────────────────────────────────\n');

    console.log('🎉 Done! You can now view the dashboard at:');
    console.log('   http://localhost:3000/dashboard/admin/rag-metrics\n');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    process.exit(1);
  }
}

seedTestData();
