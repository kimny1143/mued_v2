/**
 * Echovna MCP Tools (Phase 1)
 *
 * Composer-side tools for AI-assisted music generation via Hoo.
 * Design mirrors Python PoC (Echovna/echovna/pipeline/) — TypeScript
 * reimplementation driven by kimny_cognitive_model.md v0.6 specs.
 *
 * Phase 1: Free-form concept parser — Japanese/English → English music tags.
 *           ACE-Step v1.5 (MIT/MLX-Swift) local inference via MUEDaw subprocess.
 * Phase 2: Result evaluation + iterative refinement loop.
 *
 * Tools:
 *   compose_from_concept    — CognitiveImage → GenerationPrompt translation
 *   evaluate_generation     — Generation result scoring (Phase 2 stub)
 *   get_echovna_capability  — Available genres, status, Phase 1 readiness
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
// Japanese Keyword → English Tags (Phase 1 concept parser)
// ========================================

const JP_KEYWORDS: Record<string, string[]> = {
  ゆったり: ["relaxed", "laid-back", "unhurried"],
  のんびり: ["easygoing", "relaxed", "slow"],
  心地よい: ["pleasant", "comfortable", "mellow"],
  夕暮れ: ["sunset", "twilight", "golden hour"],
  朝焼け: ["dawn", "sunrise", "morning glow"],
  夜明け: ["dawn", "early morning"],
  深夜: ["late night", "midnight", "nocturnal"],
  夜: ["night", "nocturnal", "dark"],
  朝: ["morning", "fresh", "bright"],
  雨: ["rainy", "melancholic", "grey"],
  春: ["spring", "fresh", "bright"],
  夏: ["summer", "warm", "vibrant"],
  秋: ["autumn", "melancholic", "nostalgic"],
  冬: ["winter", "cold", "sparse"],
  切ない: ["bittersweet", "melancholic", "longing"],
  哀愁: ["nostalgia", "melancholy", "wistful"],
  懐かしい: ["nostalgic", "vintage", "warm memory"],
  幻想的: ["dreamy", "ethereal", "surreal"],
  神秘的: ["mysterious", "ethereal", "dark ambient"],
  明るい: ["bright", "uplifting", "cheerful"],
  暗い: ["dark", "brooding", "moody"],
  静か: ["quiet", "peaceful", "sparse"],
  激しい: ["intense", "energetic", "driving"],
  柔らかい: ["soft", "gentle", "mellow"],
  温かい: ["warm", "cozy", "intimate"],
  爽やか: ["fresh", "crisp", "airy"],
  疾走感: ["driving", "fast-paced", "momentum"],
  浮遊感: ["floating", "ethereal", "weightless"],
  孤独: ["solitary", "minimal", "sparse"],
  内省: ["introspective", "intimate", "subdued"],
  力強い: ["powerful", "strong dynamics", "driving rhythm"],
  優しい: ["gentle", "soft dynamics", "warm texture"],
  雰囲気: [], // modifier only, no standalone tags
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
// Free-form Concept Parser (Phase 1)
// Parses Japanese/English concept string → CognitiveImage fields
// ========================================

function extractBpmFromText(text: string): number | undefined {
  const m = text.match(/\bBPM\s*(\d{2,3})\b/i);
  return m ? parseInt(m[1], 10) : undefined;
}

function extractDurationFromText(text: string): number | undefined {
  const minMatch = text.match(/(\d+)\s*分/);
  const secMatch = text.match(/(\d+)\s*秒/);
  if (minMatch && secMatch) return parseInt(minMatch[1]) * 60 + parseInt(secMatch[1]);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  if (secMatch) return parseInt(secMatch[1]);
  return undefined;
}

interface ParsedConcept {
  genre?: string;
  extra_tags: string[];
  bpm?: number;
  duration?: number;
}

function parseConceptFreeform(concept: string): ParsedConcept {
  const extra_tags: string[] = [];
  const seen = new Set<string>();

  const addTag = (tag: string) => {
    if (tag && !seen.has(tag)) { extra_tags.push(tag); seen.add(tag); }
  };

  // Extract BPM and duration from text
  const bpm = extractBpmFromText(concept);
  const duration = extractDurationFromText(concept);

  // Japanese keywords → English tags
  for (const [jp, en] of Object.entries(JP_KEYWORDS)) {
    if (concept.includes(jp)) {
      en.forEach(addTag);
    }
  }

  // Detect genre from concept (longest match wins to avoid "lo-fi" matching "fi")
  const lc = concept.toLowerCase();
  const genres = Object.keys(GENRE_TABLE).sort((a, b) => b.length - a.length);
  let genre: string | undefined;
  for (const g of genres) {
    if (lc.includes(g)) { genre = g; break; }
  }

  // Detect English adjective keys present in concept
  for (const adj of Object.keys(ADJECTIVE_TABLE)) {
    if (lc.includes(adj.toLowerCase())) {
      ADJECTIVE_TABLE[adj].forEach(addTag);
    }
  }

  return { genre, extra_tags, bpm, duration };
}

// Strip Japanese characters and BPM specs, returning clean ASCII tags
function conceptToFallbackTags(concept: string): string {
  return concept
    .replace(/[^\x00-\x7F]+/g, " ")   // remove non-ASCII
    .replace(/\bBPM\s*\d+\b/gi, "")   // remove BPM spec
    .replace(/\s+/g, ", ")
    .trim()
    .replace(/^,\s*|,\s*$/g, "");
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
      "Accepts free-form Japanese or English input (e.g. 'lo-fi chill ゆったり BPM75 夕暮れの雰囲気'). " +
      "Converts adjectives, genre, and mood into English music tags, BPM, and duration for ACE-Step. " +
      "Use when: the user describes a musical idea, mood, or reference and wants to generate music.",
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
  const rawConcept = String(args.concept ?? "");

  // Parse free-form concept for implicit genre / adjectives / BPM / duration
  const parsed = parseConceptFreeform(rawConcept);

  const image: CognitiveImage = {
    concept: rawConcept,
    genre: args.genre ? String(args.genre) : parsed.genre,
    adjectives: Array.isArray(args.adjectives)
      ? (args.adjectives as string[])
      : undefined,
    bpm: typeof args.bpm === "number" ? args.bpm : parsed.bpm,
    duration: typeof args.duration === "number" ? args.duration : parsed.duration,
    vocal_style: args.vocal_style ? String(args.vocal_style) : undefined,
    lyrics: args.lyrics ? String(args.lyrics) : undefined,
    extra_tags: parsed.extra_tags.length > 0 ? parsed.extra_tags : undefined,
  };

  const prompt = buildGenerationPrompt(image);

  // Fallback: if cognitive model produced no tags, extract ASCII words from concept
  const finalTags = prompt.prompt || conceptToFallbackTags(rawConcept) || rawConcept;

  const lines = [
    `## Echovna Generation Prompt`,
    ``,
    `### Concept`,
    prompt.source_image.concept,
    ``,
    `### Translated Tags`,
    `\`\`\``,
    finalTags,
    `\`\`\``,
    ``,
    `### Parameters`,
    `- **BPM**: ${prompt.bpm}`,
    `- **Duration**: ${prompt.duration}s`,
    prompt.lyrics ? `- **Lyrics**: ${prompt.lyrics.slice(0, 80)}...` : "",
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
  const supportedJpKeywords = Object.keys(JP_KEYWORDS).filter(k => JP_KEYWORDS[k].length > 0).join(", ");

  const lines = [
    `## Echovna Capability (Phase 1)`,
    ``,
    `### Current Phase`,
    `**Phase 1** — Free-form concept parser active.`,
    `Input: Japanese/English concept string → Output: English music tags for ACE-Step.`,
    `Local inference: ACE-Step v1.5 via MUEDaw subprocess (MLX backend).`,
    ``,
    `### Supported Genres`,
    supportedGenres,
    ``,
    `### Supported Adjectives (English)`,
    supportedAdjectives,
    ``,
    `### Supported Japanese Keywords`,
    supportedJpKeywords,
    ``,
    `### Available Tools`,
    `- \`compose_from_concept\` — Translate concept (JP/EN free-form) to generation prompt ✅`,
    `- \`evaluate_generation\` — Generation scoring (stub, Phase 2)`,
  ];

  return textResult(lines.join("\n"));
}
