/**
 * Quick Test Generation Prompts
 *
 * System prompt and user message builder for 5-minute quick test generation.
 */

import type { AggregatedWeakSpot } from '@/lib/ai/weak-spots-aggregator';

// --- Version ---
export const QUICK_TEST_PROMPT_VERSION = '1.0.0';

// --- System Prompt ---
export function getQuickTestSystemPrompt(instrument: string): string {
  return `You are an expert music educator specializing in ${instrument}. You create focused practice exercises that target specific technical challenges. Your exercises are pedagogically sound, progressively challenging, and designed to be completed in 5 minutes.`;
}

// --- User Message Builder ---
export function buildQuickTestPrompt(
  materialTitle: string,
  instrument: string,
  targetTempo: number,
  weakSpots: AggregatedWeakSpot[],
  difficulty: string
): string {
  const spotsDescription = weakSpots
    .map(
      (spot, idx) =>
        `${idx + 1}. Bars ${spot.startBar}-${spot.endBar} (Difficulty: ${spot.difficulty}, ${spot.affectedStudentCount} students struggling, avg ${spot.avgLoopCount} loops)`
    )
    .join('\n');

  return `Create a 5-minute quick test for students learning "${materialTitle}" on ${instrument}.

**Weak spots identified in class:**
${spotsDescription}

**Requirements:**
- Generate ${weakSpots.length} practice problems, one for each weak spot
- Each problem should be exactly 8 bars long
- Target tempo: ${targetTempo} BPM
- Difficulty level: ${difficulty}
- Problems should progressively build on each other
- Use ABC notation format
- Focus on the specific technical challenges in each weak spot

**For each problem, provide:**
1. Problem number (1, 2, 3, etc.)
2. Title (e.g., "Arpeggio Practice")
3. Instruction (1-2 sentences explaining what to focus on)
4. ABC notation (8 bars, proper ABC format with headers)
5. Target bars (same as the weak spot bars)
6. Estimated time in seconds (60-90 seconds per problem)

**ABC Format Requirements:**
- Must include: X:, T:, M:, L:, Q:, K: headers
- Must be exactly 8 bars
- Must be playable on ${instrument}
- Tempo should be around ${targetTempo} BPM

**Response Format:**
Return a JSON object with this structure:
\`\`\`json
{
  "title": "Quick Test: [Material Title]",
  "description": "5-minute practice focusing on class weak spots",
  "problems": [
    {
      "problemNumber": 1,
      "title": "Problem title",
      "instruction": "What to focus on",
      "abc": "X:1\\nT:...\\n",
      "targetBars": { "startBar": 1, "endBar": 8 },
      "difficulty": "high",
      "estimatedTime": 75
    }
  ],
  "estimatedTime": 5,
  "totalBars": 24
}
\`\`\``;
}
