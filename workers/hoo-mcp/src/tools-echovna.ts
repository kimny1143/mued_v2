/**
 * Echovna MCP Tools (Phase 0 Skeleton)
 *
 * Composer-side tools for AI-assisted music generation via Hoo.
 * Design mirrors Python PoC (Echovna/echovna/pipeline/) — TypeScript
 * reimplementation driven by kimny_cognitive_model.md v0.6 specs.
 *
 * Phase 0: Skeleton — cognitive model → prompt translation logic.
 *           MiniMax Music API call is NOT wired (Phase 2).
 * Phase 2: Wire MiniMax Music API / ACE-Step generation.
 * Phase 3: Result evaluation + iterative refinement loop.
 *
 * Tools:
 *   compose_from_concept    — CognitiveImage → GenerationPrompt translation
 *   evaluate_generation     — Generation result scoring (Phase 2 stub)
 *   get_echovna_capability  — Available genres, status, Phase 0 readiness
 */

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

// ========================================
// Cognitive Model Types
// (mirrors Python: echovna/pipeline/prompt_builder.py)
// ========================================

interface CognitiveImage {
  concept: string;
  adjectives?: string[];
  genre?: string;
  bpm?: number;
  duration?: number;
  lyrics?: string;
  vocal_style?: string;
  extra_tags?: string[];
}

interface GenerationPrompt {
  prompt: string;          // comma-joined tags for music generation API
  bpm: number;
  duration: number;
  lyrics: string;
  source_image: CognitiveImage;
}

// ========================================
// Genre Table
// (mirrors: echovna/pipeline/genre_table.py — main entries)
// ========================================

const KIMNY_TIMBRE_TAGS = ["warm", "analog texture", "woody tone"];

interface GenreProfile {
  instruments: string[];
  style_tags: string[];
}

const GENRE_TABLE: Record<string, GenreProfile> = {
  "neo-soul": {
    instruments: ["warm analog piano", "soft Rhodes", "electric bass", "subtle drums"],
    style_tags: ["neo-soul", "R&B", "mellow groove", "close voicing chords"],
  },
  "r&b": {
    instruments: ["Rhodes", "electric bass", "tight drums", "soft synth pad"],
    style_tags: ["R&B", "smooth", "groovy"],
  },
  jazz: {
    instruments: ["upright bass", "brushed drums", "piano", "muted trumpet"],
    style_tags: ["jazz", "sophisticated", "live feel"],
  },
  "bossa nova": {
    instruments: ["nylon guitar", "upright bass", "light percussion", "piano"],
    style_tags: ["bossa nova", "gentle rhythm", "Brazilian feel"],
  },
  pop: {
    instruments: ["acoustic guitar", "piano", "bass", "drums", "light synth"],
    style_tags: ["pop", "catchy", "polished"],
  },
  rock: {
    instruments: ["distorted guitar", "bass guitar", "drums", "electric guitar"],
    style_tags: ["rock", "driving", "energetic"],
  },
  "lo-fi": {
    instruments: ["lo-fi piano", "vinyl texture", "soft drums", "tape hiss"],
    style_tags: ["lo-fi", "chill", "vintage", "relaxed"],
  },
  ballad: {
    instruments: ["piano", "strings", "acoustic guitar", "soft percussion"],
    style_tags: ["ballad", "emotional", "gentle"],
  },
  funk: {
    instruments: ["clavinet", "slap bass", "tight drums", "brass stabs"],
    style_tags: ["funk", "groovy", "rhythmic", "tight"],
  },
  ambient: {
    instruments: ["synth pad", "reverb piano", "atmospheric texture"],
    style_tags: ["ambient", "atmospheric", "spacious", "ethereal"],
  },
  elegant: {
    instruments: ["strings", "harp", "bells", "orchestral piano"],
    style_tags: ["elegant", "classical", "refined", "graceful"],
  },
};

// ========================================
// Adjective Table (主要エントリ)
// (mirrors: echovna/pipeline/adjective_table.py)
// ========================================

const ADJECTIVE_TABLE: Record<string, string[]> = {
  切ない: ["bittersweet", "melancholic", "intimate", "lo-fi texture", "warm minor", "close voicing chords"],
  内省: ["introspective", "intimate", "subdued", "lo-fi texture", "close voicing chords"],
  明るい: ["bright", "uplifting", "open voicing", "major feel"],
  社交的: ["bright", "upbeat", "cheerful", "open feel"],
  親密: ["intimate", "close voicing chords", "neo-soul harmony", "warm"],
  力強い: ["powerful", "strong dynamics", "driving rhythm", "full arrangement"],
  優しい: ["gentle", "soft dynamics", "warm texture"],
  孤独: ["solitary", "minimal arrangement", "sparse", "intimate"],
  幻想的: ["dreamy", "reverb-heavy", "floating", "ethereal"],
  nostalgic: ["nostalgic", "vintage", "warm", "lo-fi texture"],
  melancholic: ["melancholic", "bittersweet", "minor feel", "intimate"],
  energetic: ["energetic", "driving rhythm", "full arrangement", "upbeat"],
  relaxed: ["relaxed", "laid-back", "soft groove", "chill"],
};

// ========================================
// BPM Resolution
// (mirrors: echovna/pipeline/bpm_table.py)
// ========================================

const GENRE_DEFAULT_BPM: Record<string, number> = {
  "neo-soul": 78,
  "r&b": 88,
  jazz: 120,
  "bossa nova": 132,
  pop: 120,
  rock: 130,
  "lo-fi": 75,
  ballad: 65,
  funk: 100,
  ambient: 80,
  elegant: 70,
};

// Snap BPM to standard grid (half-tempo and double-tempo aware)
function resolveBpm(explicit?: number, genre?: string): number {
  if (explicit != null && explicit > 0) {
    // Snap to nearest 5
    return Math.round(explicit / 5) * 5;
  }
  if (genre) {
    const g = genre.toLowerCase().trim();
    const base = GENRE_DEFAULT_BPM[g];
    if (base) return base;
  }
  return 90; // sensible default
}

// ========================================
// Cognitive Model → Prompt Translation
// (mirrors: echovna/pipeline/prompt_builder.py :: build_generation_request)
// ========================================

function buildGenerationPrompt(image: CognitiveImage): GenerationPrompt {
  const allTags: string[] = [];
  const seen = new Set<string>();

  function addTags(tags: string[]) {
    for (const tag of tags) {
      if (tag && !seen.has(tag)) {
        allTags.push(tag);
        seen.add(tag);
      }
    }
  }

  // 1. Genre → instruments + style tags
  if (image.genre) {
    const profile = GENRE_TABLE[image.genre.toLowerCase().trim()];
    if (profile) {
      addTags(profile.style_tags);
      addTags(profile.instruments);
    } else {
      addTags([image.genre]);
    }
    addTags(KIMNY_TIMBRE_TAGS);
  }

  // 2. Adjectives → tags
  if (image.adjectives) {
    for (const adj of image.adjectives) {
      const tags = ADJECTIVE_TABLE[adj] ?? [adj];
      addTags(tags);
    }
  }

  // 3. Vocal style
  if (image.vocal_style) {
    addTags(image.vocal_style.split(",").map((t) => t.trim()).filter(Boolean));
  }

  // 4. Extra tags
  if (image.extra_tags) addTags(image.extra_tags);

  return {
    prompt: allTags.join(", "),
    bpm: resolveBpm(image.bpm, image.genre),
    duration: image.duration ?? 30,
    lyrics: image.lyrics ?? "",
    source_image: image,
  };
}

// ========================================
// Tool Definitions
// ========================================

export const ECHOVNA_TOOL_DEFINITIONS = [
  {
    name: "compose_from_concept",
    description:
      "Translate a music concept into a structured generation prompt using kimny's cognitive model. " +
      "Converts adjectives, genre, and mood into music generation API parameters (tags, BPM, duration). " +
      "Use when: the user describes a musical idea, mood, or reference and wants to generate music. " +
      "Phase 0: Returns the translated prompt for inspection. Music generation API is wired in Phase 2.",
    inputSchema: {
      type: "object" as const,
      properties: {
        concept: {
          type: "string",
          description: "Core musical concept or mood (e.g. '夕暮れ時の切ない感情', 'nostalgic summer evening')",
        },
        genre: {
          type: "string",
          description: "Musical genre (e.g. neo-soul, lo-fi, jazz, bossa nova, ballad)",
        },
        adjectives: {
          type: "array",
          items: { type: "string" },
          description: "Mood/texture adjectives in Japanese or English (e.g. ['切ない', '内省', 'nostalgic'])",
        },
        bpm: {
          type: "number",
          description: "Target BPM. Omit to derive from genre.",
        },
        duration: {
          type: "number",
          description: "Target duration in seconds (default: 30)",
        },
        vocal_style: {
          type: "string",
          description: "Vocal style (e.g. 'female vocal', 'male vocal', 'instrumental')",
        },
        lyrics: {
          type: "string",
          description: "Lyrics in ACE-Step format (optional)",
        },
      },
      required: ["concept"] as string[],
    },
    annotations: {
      title: "Compose from Concept",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "evaluate_generation",
    description:
      "Evaluate a music generation result against the original concept. " +
      "Scores how well the generated audio matches the intended mood, genre, and cognitive image. " +
      "Phase 0 stub — returns placeholder evaluation. Full implementation in Phase 2.",
    inputSchema: {
      type: "object" as const,
      properties: {
        concept: {
          type: "string",
          description: "Original concept used for generation",
        },
        generation_id: {
          type: "string",
          description: "ID or URL of the generated audio",
        },
        user_feedback: {
          type: "string",
          description: "Optional user feedback on the result",
        },
      },
      required: ["concept", "generation_id"] as string[],
    },
    annotations: {
      title: "Evaluate Generation Result",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_echovna_capability",
    description:
      "Get Echovna's current Phase 0 status, supported genres, and available composition capabilities. " +
      "Use when: the user asks what Echovna can do, or before attempting composition.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
    annotations: {
      title: "Get Echovna Capability",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

// ========================================
// Tool Handlers
// ========================================

export async function handleEchovnaTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case "compose_from_concept":
      return handleComposeFromConcept(args);
    case "evaluate_generation":
      return handleEvaluateGeneration(args);
    case "get_echovna_capability":
      return handleGetCapability();
    default:
      return textResult(`Unknown Echovna tool: ${name}`);
  }
}

function handleComposeFromConcept(args: Record<string, unknown>): ToolResult {
  const image: CognitiveImage = {
    concept: String(args.concept ?? ""),
    genre: args.genre ? String(args.genre) : undefined,
    adjectives: Array.isArray(args.adjectives)
      ? (args.adjectives as string[])
      : undefined,
    bpm: typeof args.bpm === "number" ? args.bpm : undefined,
    duration: typeof args.duration === "number" ? args.duration : undefined,
    vocal_style: args.vocal_style ? String(args.vocal_style) : undefined,
    lyrics: args.lyrics ? String(args.lyrics) : undefined,
  };

  const prompt = buildGenerationPrompt(image);

  const lines = [
    `## Echovna Generation Prompt`,
    ``,
    `### Concept`,
    prompt.source_image.concept,
    ``,
    `### Translated Tags`,
    `\`\`\``,
    prompt.prompt || "(no tags — concept only)",
    `\`\`\``,
    ``,
    `### Parameters`,
    `- **BPM**: ${prompt.bpm}`,
    `- **Duration**: ${prompt.duration}s`,
    prompt.lyrics ? `- **Lyrics**: ${prompt.lyrics.slice(0, 80)}...` : "",
    ``,
    `### Phase 0 Note`,
    `Music generation API (MiniMax Music) is not yet wired.`,
    `This prompt is ready for Phase 2 integration.`,
    `To generate: pass prompt + BPM + duration to MiniMax Music API.`,
  ].filter((l) => l !== "");

  return textResult(lines.join("\n"));
}

function handleEvaluateGeneration(args: Record<string, unknown>): ToolResult {
  // Phase 0 stub — full scoring implementation in Phase 2
  const concept = String(args.concept ?? "");
  const generationId = String(args.generation_id ?? "");
  const userFeedback = args.user_feedback ? String(args.user_feedback) : null;

  const lines = [
    `## Generation Evaluation (Phase 0 Stub)`,
    ``,
    `- **Concept**: ${concept}`,
    `- **Generation**: ${generationId}`,
    userFeedback ? `- **User Feedback**: ${userFeedback}` : "",
    ``,
    `### Status`,
    `Automated evaluation is not available in Phase 0.`,
    `Phase 2 will implement: mood match scoring, genre accuracy, kimny preference model.`,
    ``,
    `### Manual Check Points`,
    `- [ ] Mood matches concept`,
    `- [ ] Genre/instrumentation correct`,
    `- [ ] BPM feels right`,
    `- [ ] Vocal style as intended`,
  ].filter((l) => l !== "");

  return textResult(lines.join("\n"));
}

function handleGetCapability(): ToolResult {
  const supportedGenres = Object.keys(GENRE_TABLE).join(", ");
  const supportedAdjectives = Object.keys(ADJECTIVE_TABLE).join(", ");

  const lines = [
    `## Echovna Capability (Phase 0)`,
    ``,
    `### Current Phase`,
    `**Phase 0** — Cognitive model → prompt translation (skeleton).`,
    `Music generation API: **NOT connected** (Phase 2).`,
    ``,
    `### Supported Genres`,
    supportedGenres,
    ``,
    `### Supported Adjectives (Japanese / English)`,
    supportedAdjectives,
    ``,
    `### Available Tools`,
    `- \`compose_from_concept\` — Translate concept to generation prompt ✅`,
    `- \`evaluate_generation\` — Generation scoring (stub, Phase 2)`,
    ``,
    `### Cognitive Model`,
    `Based on kimny_cognitive_model.md v0.6 (37KB).`,
    `Conversion: concept → adjectives → genre → instruments → BPM → prompt tags.`,
    ``,
    `### Phase 2 Roadmap`,
    `- MiniMax Music API integration`,
    `- ACE-Step 1.5 XL (local, MLX-Swift via native課)`,
    `- Result scoring + iterative refinement`,
  ];

  return textResult(lines.join("\n"));
}
