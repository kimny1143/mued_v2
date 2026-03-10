#!/usr/bin/env npx tsx
/**
 * MUEDial Dialogue Mode Cost PoC
 *
 * Simulates a full dialogue mixing session with Claude Haiku to measure:
 * - Conversation turns per cycle (feedback gathering behavior)
 * - LLM token costs (Claude Haiku 4.5)
 * - RoEx credit costs (calculated, not consumed)
 * - Total cost ratio against $35 session price
 *
 * Usage: npx tsx scripts/poc-dialogue-cost.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

type HooChatMessage = import('../lib/ai/providers/types').HooChatMessage;
type DialPromptInput = import('../lib/ai/prompts/dial').DialPromptInput;

// ─── Constants ─────────────────────────────────────────────────────────────

const PRICE_PER_SESSION = 35.0;
const ROEX_COST_PER_CREDIT = 0.008; // Large package
const HAIKU_INPUT_COST = 1.0 / 1_000_000;
const HAIKU_OUTPUT_COST = 5.0 / 1_000_000;
const COST_RATIO_LIMIT = 0.33;
const STEMS_CREDITS = 50;

const CREDIT_COSTS: Record<string, number> = {
  adjust_preview: 0,
  request_mix_check: 250,
  request_final: 250,
};

// ─── Mock Track Data ───────────────────────────────────────────────────────

const MOCK_TRACKS: DialPromptInput['tracks'] = [
  { filename: 'vocal_main.wav', instrumentGroup: 'VOCAL_GROUP', presenceSetting: 'NORMAL', panPreference: 'NO_PREFERENCE', reverbPreference: 'MEDIUM' },
  { filename: 'guitar_rhythm.wav', instrumentGroup: 'GUITAR_GROUP', presenceSetting: 'NORMAL', panPreference: 'NO_PREFERENCE', reverbPreference: 'LOW' },
  { filename: 'guitar_lead.wav', instrumentGroup: 'GUITAR_GROUP', presenceSetting: 'NORMAL', panPreference: 'NO_PREFERENCE', reverbPreference: 'LOW' },
  { filename: 'bass.wav', instrumentGroup: 'BASS_GROUP', presenceSetting: 'NORMAL', panPreference: 'CENTRE', reverbPreference: 'NONE' },
  { filename: 'drums.wav', instrumentGroup: 'DRUM_GROUP', presenceSetting: 'NORMAL', panPreference: 'CENTRE', reverbPreference: 'NONE' },
];

// ─── Conversation Scenario ─────────────────────────────────────────────────
// Each message simulates realistic user behavior.
// After each tool call we insert a phase-transition marker.

interface ScenarioMessage {
  user: string;
  /** If set, update prompt state BEFORE sending this message */
  stateUpdate?: Partial<PromptState>;
}

interface PromptState {
  musicalStyle: string;
  hasPreview: boolean;
  phase: 1 | 2 | 3;
  mixCheckCount: number;
}

const SCENARIO: ScenarioMessage[] = [
  // ─── Setup (free) ─────────────────────────────────────────────────────
  { user: 'トラックをアップロードしました。ミックスの相談をお願いします。' },
  { user: 'ロック系の曲です。インディーロックっぽい感じで' },
  { user: '力強い感じで、ボーカルが前に出てほしい。低音は重厚な感じ。ギターは左右に広がる感じで' },

  // ─── Preview調整 (free × 5ラウンド想定) ──────────────────────────────
  // Hoo が adjust_preview ツールコール → プレビュー生成
  // Preview #1 試聴後
  {
    user: 'プレビュー聴いた。ボーカルがちょっと埋もれてるかな',
    stateUpdate: { hasPreview: true },
  },
  { user: 'ギターが左右にもうちょっと広がってほしい' },
  { user: 'それだけ' },
  // Preview #2 試聴後
  { user: '良くなった。でもドラムが前に出すぎかも' },
  { user: 'あとリバーブがちょっと深すぎる気がする' },
  { user: 'それくらいかな' },
  // Preview #3 試聴後
  { user: 'かなりいい感じ。リードギターをもう少し目立たせたい' },
  { user: '他は大丈夫' },
  // Preview #4 試聴後
  { user: 'うん、バランスはこれでいいと思う。ベースの存在感をちょっとだけ上げてほしい' },
  { user: 'OK、それで' },
  // Preview #5 → 満足、MC進行
  { user: 'いいね！この方向でOK。本格的なミックスに進みたい' },

  // ─── MC #1 試聴後のフィードバック（有料 250cr）──────────────────────
  {
    user: 'ミックスチェック聴いたよ。全体的にいい！ボーカルがまだ少し埋もれてる気がする。あと声にもうちょっとツヤが欲しい',
    stateUpdate: { phase: 2, mixCheckCount: 1 },
  },
  { user: 'あとドラムがちょっとうるさいかも。もう少し控えめにしてほしい' },
  { user: '低音は今のバランスでいいと思う。それくらいかな' },

  // ─── MC #2 試聴後のフィードバック（有料 250cr）──────────────────────
  {
    user: '前よりだいぶ良くなった！低音がちょっとモコモコしてる感じがする',
    stateUpdate: { mixCheckCount: 2 },
  },
  { user: 'ギターの広がりがもう少し欲しい。あと全体的にちょっと暗い印象' },
  { user: 'もう少し明るい感じにして。他は大丈夫' },

  // ─── MC #3 試聴後のフィードバック（有料 250cr）──────────────────────
  {
    user: 'かなり近づいてきた！ボーカルの存在感がもうちょっとだけ欲しい',
    stateUpdate: { mixCheckCount: 3 },
  },
  { user: '全体的にちょっとだけタイトにしてほしい' },
  { user: 'それで行こう' },

  // ─── MC #4 試聴後のフィードバック（有料 250cr）──────────────────────
  {
    user: 'ほぼ完璧！最後に一点だけ。声にもうちょっと温かみが欲しい',
    stateUpdate: { mixCheckCount: 4 },
  },
  { user: 'あとはお任せで' },

  // ─── MC #5（有料 250cr → 33%超え想定）─────────────────────────────
  {
    user: '惜しいなー。リードギターのソロ部分がもう少し前に出てほしい',
    stateUpdate: { mixCheckCount: 5 },
  },
  { user: 'あとキックにもうちょっとパンチが欲しい' },
  { user: 'それで行こう' },
];

// ─── Tracking ──────────────────────────────────────────────────────────────

interface CycleRecord {
  cycleNumber: number;
  action: string;
  turns: number;
  inputTokens: number;
  outputTokens: number;
  llmCost: number;
  roexCredits: number;
  roexCost: number;
  cumulativeCredits: number;
  cumulativeLlmCost: number;
  cumulativeTotalCost: number;
  costRatio: number;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function callWithRetry(
  fn: () => Promise<import('../lib/ai/providers/types').HooChatResponse>,
  maxRetries = 5,
): Promise<import('../lib/ai/providers/types').HooChatResponse> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if ((status === 529 || status === 503 || status === 500) && attempt < maxRetries) {
        const delay = (attempt + 1) * 5000; // 5s, 10s, 15s, 20s, 25s
        console.log(`    [retry] ${status} error, waiting ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}

async function main() {
  // Dynamic imports — must come AFTER dotenv so env vars are available at module init
  const { sendClaudeChat } = await import('../lib/ai/providers/claude');
  const { buildDialSystemPrompt, DIAL_MIX_ACTION_TOOL, DIAL_SET_STYLE_TOOL } = await import('../lib/ai/prompts/dial');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       MUEDial Dialogue Mode — Cost & Conversation PoC    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Price: $${PRICE_PER_SESSION} flat | Cost limit: ${COST_RATIO_LIMIT * 100}%`);
  console.log(`  Model: Claude Haiku 4.5 | RoEx: $${ROEX_COST_PER_CREDIT}/cr (Large)`);
  console.log(`  Prompt: v5.2.0 (abstract language, feedback gathering, mandatory params)\n`);

  // State
  const state: PromptState = {
    musicalStyle: 'OTHER',
    hasPreview: false,
    phase: 1,
    mixCheckCount: 0,
  };

  const history: HooChatMessage[] = [];
  const cycles: CycleRecord[] = [];

  let cycleTurns = 0;
  let cycleInputTok = 0;
  let cycleOutputTok = 0;
  let totalInputTok = 0;
  let totalOutputTok = 0;
  let totalRoexCredits = 0;
  let totalLlmCost = 0;
  let cycleNumber = 0;
  let stopped = false;

  function calcTotalCost(): number {
    const stemsCost = STEMS_CREDITS * ROEX_COST_PER_CREDIT;
    return totalRoexCredits * ROEX_COST_PER_CREDIT + totalLlmCost + stemsCost;
  }

  for (const step of SCENARIO) {
    if (stopped) break;

    // Apply state update if provided (simulates phase transitions)
    if (step.stateUpdate) {
      Object.assign(state, step.stateUpdate);
    }

    cycleTurns++;
    history.push({ role: 'user', content: step.user });

    console.log(`  [User] ${step.user}`);

    // Build system prompt with current state
    const systemPrompt = buildDialSystemPrompt({
      musicalStyle: state.musicalStyle,
      tracks: MOCK_TRACKS,
      hasPreview: state.hasPreview,
      phase: state.phase,
      mixCheckCount: state.mixCheckCount,
    });

    // Call Claude Haiku
    const res = await callWithRetry(() => sendClaudeChat(history, {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 4096,
      systemPrompt,
      tools: [DIAL_MIX_ACTION_TOOL, DIAL_SET_STYLE_TOOL],
    }));

    // Track tokens
    cycleInputTok += res.usage.inputTokens;
    cycleOutputTok += res.usage.outputTokens;
    totalInputTok += res.usage.inputTokens;
    totalOutputTok += res.usage.outputTokens;
    totalLlmCost += res.cost?.total ?? (
      res.usage.inputTokens * HAIKU_INPUT_COST +
      res.usage.outputTokens * HAIKU_OUTPUT_COST
    );

    // Add to conversation history
    history.push({ role: 'assistant', content: res.content });

    // Print Hoo's response (truncate for readability)
    const hooText = res.content.length > 200
      ? res.content.slice(0, 200) + '...'
      : res.content;
    console.log(`  [Hoo] ${hooText}`);
    console.log(`         (in=${res.usage.inputTokens} out=${res.usage.outputTokens})`);

    // Handle tool calls
    if (res.toolCalls?.length) {
      for (const tc of res.toolCalls) {
        const inputPreview = JSON.stringify(tc.input).slice(0, 300);
        console.log(`  [Tool] ${tc.name}: ${inputPreview}`);

        if (tc.name === 'set_musical_style') {
          const input = tc.input as { style: string; reason: string };
          state.musicalStyle = input.style;
          console.log(`    => Genre set: ${input.style} (${input.reason})`);
        }

        if (tc.name === 'propose_mix_action') {
          const input = tc.input as { action: string; parameter_changes?: unknown[] };
          const credits = CREDIT_COSTS[input.action] ?? 0;
          totalRoexCredits += credits;

          cycleNumber++;
          const cycleLlmCost = cycleInputTok * HAIKU_INPUT_COST + cycleOutputTok * HAIKU_OUTPUT_COST;
          const totalCost = calcTotalCost();
          const costRatio = totalCost / PRICE_PER_SESSION;

          const record: CycleRecord = {
            cycleNumber,
            action: input.action,
            turns: cycleTurns,
            inputTokens: cycleInputTok,
            outputTokens: cycleOutputTok,
            llmCost: cycleLlmCost,
            roexCredits: credits,
            roexCost: credits * ROEX_COST_PER_CREDIT,
            cumulativeCredits: totalRoexCredits,
            cumulativeLlmCost: totalLlmCost,
            cumulativeTotalCost: totalCost,
            costRatio,
          };
          cycles.push(record);

          const paramCount = input.parameter_changes?.length ?? 0;
          console.log(`    => Cycle ${cycleNumber}: ${input.action} | ${credits}cr ($${(credits * ROEX_COST_PER_CREDIT).toFixed(2)}) | ${paramCount} tracks | Ratio: ${(costRatio * 100).toFixed(1)}%`);

          // Phase transitions
          if (input.action === 'adjust_preview') {
            state.hasPreview = true;
          }

          // Reset cycle counters
          cycleTurns = 0;
          cycleInputTok = 0;
          cycleOutputTok = 0;

          // Check cost limit
          if (costRatio > COST_RATIO_LIMIT && credits > 0) {
            console.log(`\n  !! Cost ratio ${(costRatio * 100).toFixed(1)}% > ${COST_RATIO_LIMIT * 100}% limit. Stopping.\n`);
            stopped = true;
            break;
          }
        }
      }
    }
    console.log('');

    // Delay between messages to avoid rate limiting
    await new Promise((r) => setTimeout(r, 2000));
  }

  // ─── Report ────────────────────────────────────────────────────────────

  console.log('═'.repeat(64));
  console.log('  REPORT');
  console.log('═'.repeat(64));

  // Per-cycle table
  console.log('\n## Per-Cycle Breakdown\n');
  console.log('| # | Action            | Turns | In Tok | Out Tok | LLM $    | RoEx cr | RoEx $  | Cum. Ratio |');
  console.log('|---|-------------------|-------|--------|---------|----------|---------|---------|------------|');
  for (const c of cycles) {
    console.log(
      `| ${c.cycleNumber} ` +
      `| ${c.action.padEnd(17)} ` +
      `| ${String(c.turns).padStart(5)} ` +
      `| ${String(c.inputTokens).padStart(6)} ` +
      `| ${String(c.outputTokens).padStart(7)} ` +
      `| $${c.llmCost.toFixed(4).padStart(6)} ` +
      `| ${String(c.roexCredits).padStart(7)} ` +
      `| $${c.roexCost.toFixed(2).padStart(5)} ` +
      `| ${(c.costRatio * 100).toFixed(1).padStart(9)}% |`,
    );
  }

  // Totals
  const stemsCost = STEMS_CREDITS * ROEX_COST_PER_CREDIT;
  const totalCost = calcTotalCost();
  const costRatio = totalCost / PRICE_PER_SESSION;
  const paidCycles = cycles.filter((c) => c.roexCredits > 0);
  const freeCycles = cycles.filter((c) => c.roexCredits === 0);

  console.log('\n## Totals\n');
  console.log(`  Total user messages sent:    ${SCENARIO.filter((_, i) => !stopped || i < SCENARIO.indexOf(SCENARIO[SCENARIO.length - 1])).length}`);
  console.log(`  Total cycles (tool calls):   ${cycles.length}`);
  console.log(`    Free (adjust_preview):     ${freeCycles.length}`);
  console.log(`    Paid (mix_check/final):    ${paidCycles.length}`);
  console.log(`  Total input tokens:          ${totalInputTok.toLocaleString()}`);
  console.log(`  Total output tokens:         ${totalOutputTok.toLocaleString()}`);
  console.log(`  LLM cost:                    $${totalLlmCost.toFixed(4)}`);
  console.log(`  RoEx credits:                ${totalRoexCredits} cr ($${(totalRoexCredits * ROEX_COST_PER_CREDIT).toFixed(2)})`);
  console.log(`  Stems (assumed):             ${STEMS_CREDITS} cr ($${stemsCost.toFixed(2)})`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Total cost:                  $${totalCost.toFixed(2)}`);
  console.log(`  Revenue:                     $${PRICE_PER_SESSION.toFixed(2)}`);
  console.log(`  Cost ratio:                  ${(costRatio * 100).toFixed(1)}%`);
  console.log(`  Gross margin:                ${((1 - costRatio) * 100).toFixed(1)}%`);

  // Feedback gathering analysis
  console.log('\n## Prompt v5.2.0 Behavior Analysis\n');
  const feedbackCycles = paidCycles.filter((c) => c.turns > 1);
  const singleTurnCycles = paidCycles.filter((c) => c.turns === 1);
  console.log(`  Feedback gathered (>1 turn before tool call): ${feedbackCycles.length}/${paidCycles.length} cycles`);
  if (singleTurnCycles.length > 0) {
    console.log(`  !! Single-turn tool calls (prompt violation):  ${singleTurnCycles.length} — Hoo did NOT gather feedback`);
  } else {
    console.log(`  OK: Hoo always gathered feedback before proposing`);
  }
  const avgTurns = paidCycles.length > 0
    ? (paidCycles.reduce((s, c) => s + c.turns, 0) / paidCycles.length).toFixed(1)
    : '0';
  console.log(`  Avg turns per paid cycle:    ${avgTurns}`);

  // Verdict
  console.log('\n## Verdict\n');
  if (costRatio <= COST_RATIO_LIMIT) {
    console.log(`  OK: ${paidCycles.length} paid cycles within ${COST_RATIO_LIMIT * 100}% cost ratio.`);
    console.log(`  Room for ${Math.floor((PRICE_PER_SESSION * COST_RATIO_LIMIT - totalCost) / (250 * ROEX_COST_PER_CREDIT))} more retakes.`);
  } else {
    const safeCycles = paidCycles.length - 1;
    console.log(`  LIMIT: Cost ratio exceeded at paid cycle ${paidCycles.length}.`);
    console.log(`  Safe limit: ${safeCycles} paid cycles (MC + Final combined) at $${PRICE_PER_SESSION}.`);
    console.log(`  Max retakes before Final: ${safeCycles - 1} (1 cycle reserved for Final)`);
  }

  console.log('\n' + '═'.repeat(64));
}

main().then(() => process.exit(0)).catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
