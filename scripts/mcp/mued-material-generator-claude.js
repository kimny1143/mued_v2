/**
 * MUED Material Generator - Claude Edition
 *
 * MCP Server for generating music learning materials using Claude API
 * with Chain-of-Musical-Thought (CoMT) prompting
 *
 * Usage: Claude Desktop → MCP Tool → "generate_music_material_claude"
 *
 * Architecture:
 * - Development/Admin Mode: Local execution via Claude Desktop
 * - Production: OpenAI GPT-4o-mini (existing implementation)
 * - Future: Claude Haiku if CoMT validation succeeds
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");
const fs = require("fs");

// Load .env.local from project root
const projectRoot = path.resolve(__dirname, '../..');
const envLocalPath = path.join(projectRoot, '.env.local');

if (fs.existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath });
  console.error(`[MCP] Loaded environment variables from: ${envLocalPath}`);
} else {
  console.error(`[MCP] Warning: .env.local not found at ${envLocalPath}`);
}

// Initialize Anthropic client
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[MCP] ERROR: ANTHROPIC_API_KEY not found in environment variables');
  console.error('[MCP] Please add ANTHROPIC_API_KEY to .env.local file');
  console.error(`[MCP] Expected location: ${envLocalPath}`);
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create MCP Server
const server = new McpServer({
  name: "mued_material_generator_claude",
  version: "1.0.0",
});

/**
 * Chain-of-Musical-Thought (CoMT) System Prompt
 *
 * This prompt guides Claude through structured musical reasoning
 * to generate high-quality educational materials.
 */
const COMT_SYSTEM_PROMPT = `You are an expert music educator and composer specializing in creating educational materials for music students.

Use Chain-of-Musical-Thought (CoMT) reasoning:

1. **Musical Context Analysis**
   - Understand the student's level and learning goals
   - Consider appropriate key signatures and time signatures
   - Determine suitable note range and complexity

2. **Theoretical Foundation**
   - Select appropriate chord progressions for the key
   - Design melodic contour that reinforces learning objectives
   - Ensure harmonic and melodic coherence

3. **Pedagogical Design**
   - Structure the piece to gradually increase difficulty
   - Include repetition for skill reinforcement
   - Add variations to maintain engagement

4. **ABC Notation Generation**
   - Convert musical ideas into valid ABC notation
   - Include proper metadata (title, meter, key, tempo)
   - Use clear and readable formatting

5. **Educational Support**
   - Identify key learning points for the student
   - Provide specific, actionable practice instructions
   - Suggest progression to next skill level

IMPORTANT:
- Always output valid ABC notation syntax
- Ensure all notes are playable on the specified instrument
- Tailor difficulty to the specified level
- Use Japanese for learning points and instructions`;

/**
 * Generate music learning material using Claude
 */
async function generateMusicMaterial({
  level = "beginner",
  instrument = "guitar",
  genre = "classical",
  length = "medium",
  specificRequest = "",
}) {
  console.error("[Claude Material] Starting generation...");
  console.error(`[Claude Material] Level: ${level}, Instrument: ${instrument}, Genre: ${genre}`);

  try {
    // Construct user prompt
    const userPrompt = `生徒向けの音楽教材を生成してください。

要件:
- レベル: ${level === "beginner" ? "初心者" : level === "intermediate" ? "中級者" : "上級者"}
- 楽器: ${instrument}
- ジャンル: ${genre}
- 長さ: ${length === "short" ? "短い（8-16小節）" : length === "medium" ? "中程度（16-32小節）" : "長い（32小節以上）"}
${specificRequest ? `- 特定の要求: ${specificRequest}` : ""}

出力フォーマット（必ず以下のJSON形式で出力してください）:
{
  "title": "曲のタイトル（日本語）",
  "description": "この教材の概要（日本語、1-2文）",
  "abcNotation": "ABC notation形式の楽譜（複数行可）",
  "learningPoints": [
    "学習ポイント1（日本語）",
    "学習ポイント2（日本語）",
    "..."
  ],
  "practiceInstructions": [
    "練習指示1（日本語、具体的かつ段階的に）",
    "練習指示2（日本語）",
    "..."
  ]
}

重要:
1. ABC notation は必ず有効な構文で記述してください
2. ヘッダー情報（X:, T:, M:, L:, K:）を必ず含めてください
3. テンポ情報（Q:）も追加してください
4. 学習ポイントは3-5個、練習指示は3-7個程度にしてください
5. 必ずJSON形式で出力し、余計な説明文は含めないでください`;

    // Call Claude API
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929", // Latest Sonnet 4.5
      max_tokens: 8192,
      temperature: 0.7, // Slight creativity while maintaining coherence
      system: COMT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    console.error("[Claude Material] API response received");

    // Extract response
    const responseText = message.content[0].text;
    console.error("[Claude Material] Response text length:", responseText.length);

    // Parse JSON response
    let result;
    try {
      // Try to extract JSON from response (may be wrapped in ```json blocks)
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) ||
                       responseText.match(/```\n([\s\S]*?)\n```/) ||
                       [null, responseText];
      const jsonText = jsonMatch[1] || responseText;
      result = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error("[Claude Material] JSON parse error:", parseError);
      console.error("[Claude Material] Raw response:", responseText.substring(0, 500));

      // Fallback: try to extract parts manually
      throw new Error(`Failed to parse Claude response as JSON: ${parseError.message}`);
    }

    // Validate response structure
    if (!result.abcNotation || !result.learningPoints || !result.practiceInstructions) {
      throw new Error("Invalid response structure: missing required fields");
    }

    console.error("[Claude Material] Successfully generated material");
    console.error(`[Claude Material] Title: ${result.title}`);
    console.error(`[Claude Material] ABC notation length: ${result.abcNotation.length} chars`);
    console.error(`[Claude Material] Learning points: ${result.learningPoints.length}`);
    console.error(`[Claude Material] Practice instructions: ${result.practiceInstructions.length}`);

    return result;

  } catch (error) {
    console.error("[Claude Material] Error:", error);
    throw error;
  }
}

/**
 * Register tool: generate_music_material_claude
 */
server.registerTool(
  "generate_music_material_claude",
  {
    title: "Generate Music Learning Material (Claude)",
    description: "Generate educational music materials using Claude with Chain-of-Musical-Thought reasoning. Outputs ABC notation, learning points, and practice instructions in Japanese.",
    inputSchema: {
      level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner").describe("Student skill level"),
      instrument: z.enum(["guitar", "piano", "violin", "flute", "clarinet", "saxophone"]).default("guitar").describe("Target instrument"),
      genre: z.enum(["classical", "jazz", "pop", "folk", "blues", "rock"]).optional().default("classical").describe("Musical genre/style"),
      length: z.enum(["short", "medium", "long"]).optional().default("medium").describe("Piece length (short: 8-16 bars, medium: 16-32 bars, long: 32+ bars)"),
      specificRequest: z.string().optional().describe("Optional: Specific requirements (e.g., 'arpeggio practice', 'scale exercise', 'chord progression study')"),
    },
  },
  async (params) => {
    try {
      const result = await generateMusicMaterial(params);

      return {
        content: [
          {
            type: "text",
            text: `# ${result.title}

${result.description}

## ABC Notation

\`\`\`abc
${result.abcNotation}
\`\`\`

## 学習ポイント

${result.learningPoints.map((point, idx) => `${idx + 1}. ${point}`).join('\n')}

## 練習指示

${result.practiceInstructions.map((instruction, idx) => `${idx + 1}. ${instruction}`).join('\n')}

---

**Generated with Claude Sonnet 4.5 using Chain-of-Musical-Thought**
`,
          },
          {
            type: "text",
            text: `\n\n**Structured Output (JSON):**\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error generating music material:\n\n${error.message}\n\nPlease check:\n1. ANTHROPIC_API_KEY environment variable is set\n2. Claude API is accessible\n3. Input parameters are valid`,
          },
        ],
        isError: true,
      };
    }
  }
);

/**
 * Register tool: test_comt_quality
 *
 * Quick test tool to compare Claude output quality
 */
server.registerTool(
  "test_comt_quality",
  {
    title: "Test CoMT Quality",
    description: "Generate a standardized test piece to evaluate Chain-of-Musical-Thought quality. Uses fixed parameters for consistent comparison.",
    inputSchema: {
      model: z.enum(["sonnet", "haiku"]).optional().default("sonnet").describe("Claude model to test (sonnet-4-5 or haiku-3-5)"),
    },
  },
  async (params) => {
    const model = (params?.model || "sonnet") === "haiku"
      ? "claude-3-5-haiku-20241022"
      : "claude-sonnet-4-5-20250929";

    console.error(`[CoMT Test] Testing with model: ${model}`);

    try {
      // Fixed test case for comparison
      const testParams = {
        level: "beginner",
        instrument: "guitar",
        genre: "classical",
        length: "medium",
        specificRequest: "Dメジャーのアルペジオ練習曲（6/8拍子）",
      };

      const result = await generateMusicMaterial(testParams);

      return {
        content: [
          {
            type: "text",
            text: `# CoMT Quality Test Results

**Model:** ${model}
**Test Case:** D major arpeggio etude (6/8 time) for beginner guitar

## Generated Material

### Title
${result.title}

### Description
${result.description}

### ABC Notation
\`\`\`abc
${result.abcNotation}
\`\`\`

### Learning Points (${result.learningPoints.length})
${result.learningPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### Practice Instructions (${result.practiceInstructions.length})
${result.practiceInstructions.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

**Evaluation Criteria:**
- [ ] ABC notation is syntactically valid
- [ ] Melody is musically coherent
- [ ] Appropriate difficulty for beginner level
- [ ] Learning points are specific and actionable
- [ ] Practice instructions are clear and progressive

**Next Steps:**
1. Compare with OpenAI GPT-4o-mini output
2. Test with abcjs renderer
3. Generate MIDI file
4. Evaluate educational value
`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ CoMT Test Error:\n\n${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MUED Material Generator (Claude) MCP Server started successfully");
  console.error("Available tools:");
  console.error("  - generate_music_material_claude");
  console.error("  - test_comt_quality");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
