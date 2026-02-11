/**
 * Weak Drill Generation Prompts
 *
 * System prompt and user message builder for weak spot drill generation.
 * Generates 3 variations: same difficulty, easier, harder.
 */

import type { AbcAnalysis } from '@/lib/abc-analyzer';

// --- Version ---
export const WEAK_DRILL_PROMPT_VERSION = '1.0.0';

// --- System Prompt ---
export function getWeakDrillSystemPrompt(instrument: string): string {
  return `You are an expert music educator specializing in ${instrument}. You create targeted practice variations that help students master difficult passages through progressive difficulty adjustment. Your variations maintain musical coherence while adjusting technical demands.`;
}

// --- User Message Builder ---
export function buildWeakDrillPrompt(
  originalSection: string,
  startBar: number,
  endBar: number,
  instrument: string,
  currentTempo: number,
  analysis: AbcAnalysis,
  materialTitle: string
): string {
  return `A student is struggling with bars ${startBar}-${endBar} from "${materialTitle}" on ${instrument}.

**Original Section (ABC notation):**
\`\`\`abc
${originalSection}
\`\`\`

**Current Performance:**
- Tempo achieved: ${currentTempo} BPM
- Target tempo: ${analysis.tempo_qpm} BPM
- Difficulty: ${analysis.difficulty_level}
- Average leap: ${analysis.leap_mean.toFixed(1)} semitones
- Note density: ${analysis.notes_per_measure.toFixed(1)} notes/bar

**Task:**
Generate 3 practice variations of this section:

1. **SAME difficulty** - Similar technical demands, different notes
   - Keep same leap patterns, rhythm complexity, and tempo
   - Use different pitches/keys

2. **EASIER (-1 difficulty)** - Simplified version for building confidence
   - Reduce leaps (smoother melodic line)
   - Simplify rhythms
   - Lower tempo by 10-20 BPM

3. **HARDER (+1 difficulty)** - Challenge version for growth
   - Increase leaps and technical demands
   - Add rhythmic complexity
   - Increase tempo by 10-20 BPM

**Requirements:**
- Each variation must be the same length (${endBar - startBar + 1} bars)
- Use proper ABC notation with headers (X:, T:, M:, L:, Q:, K:)
- Keep it playable on ${instrument}
- Maintain musical coherence

**Response Format:**
Return a JSON object:
\`\`\`json
{
  "drills": {
    "same": {
      "title": "Similar Pattern",
      "description": "Practice with similar technical demands",
      "abc": "X:1\\nT:...\\n",
      "difficulty": "intermediate",
      "targetTempo": ${analysis.tempo_qpm},
      "estimatedTime": 120,
      "focusPoints": ["leaps", "rhythm"]
    },
    "easier": {
      "title": "Simplified Version",
      "description": "Build confidence with easier version",
      "abc": "X:1\\nT:...\\n",
      "difficulty": "beginner",
      "targetTempo": ${Math.max(60, analysis.tempo_qpm - 20)},
      "estimatedTime": 90,
      "focusPoints": ["smooth transitions"]
    },
    "harder": {
      "title": "Challenge Version",
      "description": "Push your limits",
      "abc": "X:1\\nT:...\\n",
      "difficulty": "advanced",
      "targetTempo": ${analysis.tempo_qpm + 20},
      "estimatedTime": 150,
      "focusPoints": ["speed", "accuracy"]
    }
  }
}
\`\`\``;
}
