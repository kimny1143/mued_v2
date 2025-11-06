import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai';
import { db } from '@/db';
import { materials, subscriptions, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { checkQualityGate, suggestImprovements, type QualityStatus } from '@/lib/quality-gate';
import { validateAbcSyntax } from '@/lib/abc-validator';

/**
 * AI Material Generation Service
 *
 * Generates educational materials using OpenAI:
 * - Quizzes (multiple choice, true/false, short answer)
 * - Summaries (concise topic overviews)
 * - Flashcards (term-definition pairs)
 * - Practice problems (with solutions)
 */

/**
 * Helper: Get internal user UUID from Clerk ID
 * @exported for use in API routes
 */
export async function getUserIdFromClerkId(clerkId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error(
      `User ${clerkId} not found in database. Please ensure Clerk webhooks are properly configured.`
    );
  }

  return user.id;
}

// Material generation request schema
export const materialGenerationSchema = z.object({
  userId: z.string(), // Clerk user ID
  subject: z.string().min(1).max(100),
  topic: z.string().min(1).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  format: z.enum(['quiz', 'summary', 'flashcards', 'practice', 'music']),
  additionalContext: z.string().optional(),
  instrument: z.enum(['piano', 'guitar', 'violin', 'flute']).optional(), // For music materials
  isPublic: z.boolean().optional().default(false), // Public visibility
});

export type MaterialGenerationRequest = z.infer<typeof materialGenerationSchema>;

// Generated material types
export interface QuizMaterial {
  type: 'quiz';
  questions: Array<{
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

export interface SummaryMaterial {
  type: 'summary';
  overview: string;
  keyPoints: string[];
  examples?: string[];
}

export interface FlashcardMaterial {
  type: 'flashcards';
  cards: Array<{
    term: string;
    definition: string;
    example?: string;
  }>;
}

export interface PracticeMaterial {
  type: 'practice';
  problems: Array<{
    problem: string;
    hints?: string[];
    solution: string;
    steps?: string[];
  }>;
}

export interface MusicMaterial {
  type: 'music';
  title: string;
  description: string;
  abcNotation: string;
  learningPoints: string[];
  practiceInstructions: string[];
}

// Phase 2: MultiTrack Music Material (Intermediate/Advanced)
export interface MultiTrackMusicMaterial {
  type: 'multi-track-music';
  title: string;
  description: string;
  tracks: Array<{
    instrument: string;
    midiProgram?: number;
    notes: Array<{
      pitch: string;
      duration: string;
      velocity: number;
      time: number;
    }>;
    volume?: number;
    pan?: number;
  }>;
  tempo: number;
  timeSignature: string;
  keySignature: string;
  totalBars?: number;
  metadata?: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    composer?: string;
  };
  learningPoints: string[];
  practiceInstructions: string[];
}

export type GeneratedMaterial =
  | QuizMaterial
  | SummaryMaterial
  | FlashcardMaterial
  | PracticeMaterial
  | MusicMaterial
  | MultiTrackMusicMaterial;

// Prompt templates for each material type
const QUIZ_PROMPT = `You are an expert educator. Generate a quiz on the following topic.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}
Additional Context: {context}

Generate 5-10 questions that test understanding of this topic. For each question:
- Write a clear, specific question
- Provide 4 multiple choice options (if applicable)
- Indicate the correct answer
- Provide a brief explanation of why the answer is correct

Return the quiz in the following JSON format:
{
  "type": "quiz",
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "..."
    }
  ]
}`;

const SUMMARY_PROMPT = `You are an expert educator. Create a comprehensive summary of the following topic.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}
Additional Context: {context}

Provide:
1. A clear, concise overview (2-3 paragraphs)
2. 5-8 key points that capture the essential concepts
3. 2-3 practical examples (if applicable)

Return the summary in the following JSON format:
{
  "type": "summary",
  "overview": "...",
  "keyPoints": ["...", "..."],
  "examples": ["...", "..."]
}`;

const FLASHCARD_PROMPT = `You are an expert educator. Create flashcards for studying the following topic.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}
Additional Context: {context}

Generate 10-15 flashcards with:
- A clear term or concept on the front
- A concise, accurate definition on the back
- An example (when helpful)

Return the flashcards in the following JSON format:
{
  "type": "flashcards",
  "cards": [
    {
      "term": "...",
      "definition": "...",
      "example": "..."
    }
  ]
}`;

const PRACTICE_PROMPT = `You are an expert educator. Create practice problems for the following topic.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}
Additional Context: {context}

Generate 5-8 practice problems that:
- Challenge understanding at the appropriate difficulty level
- Include helpful hints (1-2 per problem)
- Provide complete solutions with step-by-step explanations

Return the problems in the following JSON format:
{
  "type": "practice",
  "problems": [
    {
      "problem": "...",
      "hints": ["...", "..."],
      "solution": "...",
      "steps": ["...", "..."]
    }
  ]
}`;

const MUSIC_PROMPT = `You are a world-renowned music educator and composer with decades of experience creating pedagogical materials. Your expertise includes music theory, composition, and evidence-based teaching methodologies.

========================================
IMPORTANT: TECHNICAL CONSTRAINTS
========================================

This system uses ABC notation, which has specific limitations:

SUPPORTED (All difficulty levels):
✓ Single melodic line instruments (piano solo, guitar solo, flute, violin, etc.)
✓ Melody with chord symbols (accompaniment as symbols only)
✓ Basic music education exercises

CURRENTLY LIMITED (Phase 2 development in progress):
✗ Multiple simultaneous parts (orchestra, band arrangements)
✗ DAW/ProTools multi-track materials
✗ Detailed drum notation or tablature

FOR INTERMEDIATE/ADVANCED REQUESTS:
- If orchestra or band arrangement is requested, generate ONLY the main melody in ABC notation
- Provide detailed instructions for other parts in the practiceInstructions section
- Full multi-part support will be available after MIDI/MusicXML implementation

REQUEST DETAILS:
Subject: {subject}
Topic: {topic}
Difficulty Level: {difficulty}
Instrument: {instrument}
Additional Context: {context}

========================================
PART 1: COMPOSITIONAL PLANNING (Chain-of-Musical-Thought)
========================================

Before composing, mentally outline your approach following these steps:

1. STRUCTURAL DESIGN
   - Determine total length: exactly 16 bars (beginner), 24 bars (intermediate), or 32 bars (advanced)
   - Plan sectional form: A-B form, A-B-A form, or theme with variations
   - Select key and harmonic progression that supports the pedagogical goal
   - Design difficulty progression: easier opening → gradual complexity increase → culminating challenge

2. PEDAGOGICAL INTEGRATION
   - Identify 2-3 core technical skills this exercise will develop
   - Plan where in the music each skill will be introduced and reinforced
   - Ensure melodic interest to maintain student motivation
   - Avoid repetitive, robotic patterns - create real music

3. DIFFICULTY-SPECIFIC CONSTRAINTS
   beginner:
   - Rhythm: quarter notes, half notes, whole notes, simple dotted half notes only
   - Range: 1 octave maximum (middle register)
   - Key: C major, G major, or F major ONLY
   - Meter: 4/4 or 3/4 time
   - Tempo: 80-100 BPM
   - Melodic motion: stepwise with occasional small leaps (3rd max)

   intermediate:
   - Rhythm: add eighth notes, dotted quarters, simple syncopation
   - Range: 1.5 octaves
   - Key: up to 2 sharps or flats (D, Bb, A, Eb major)
   - Meter: 4/4, 3/4, 6/8, or simple compound meters
   - Tempo: 100-120 BPM
   - Melodic motion: leaps up to 5th, scale passages, arpeggios

   advanced:
   - Rhythm: 16th notes, triplets, complex syncopation, polyrhythms
   - Range: full practical range of instrument
   - Key: any key, modulations encouraged
   - Meter: any, including mixed meters
   - Tempo: 120-160 BPM or varied
   - Melodic motion: wide leaps, chromaticism, advanced techniques

========================================
PART 2: ABC NOTATION GENERATION
========================================

CRITICAL ABC SYNTAX REQUIREMENTS:
- Header structure (mandatory in this order):
  X:1
  T:[Descriptive Title]
  C:AI Music Pedagogue
  M:[Meter]
  L:[Default note length - typically 1/8 for intermediate/advanced, 1/4 for beginner]
  Q:[Tempo e.g., 1/4=100]
  K:[Key]

- Body structure:
  * Use |: and :| for repeat signs
  * Use || for section boundaries
  * Each bar must end with | or || or :|
  * Use proper octave notation: C,, (2 octaves below middle C), C, (1 octave below), C (middle C), c (1 octave above), c' (2 octaves above)
  * Add chord symbols in quotes above notes: "C"C2 "F"F2 "G7"G2
  * For articulation: staccato (.), accent (>), fermata (H)
  * For dynamics, use %%MIDI program commands or text annotations

- Common errors to AVOID:
  ❌ Unbalanced bars (each bar must match the meter)
  ❌ Missing bar lines
  ❌ Invalid note values (e.g., /5 doesn't exist)
  ❌ Unclosed repeat signs
  ❌ Incorrect octave notation

- Quality standards:
  ✓ EXACTLY the specified number of bars (16, 24, or 32)
  ✓ Musically coherent phrases (typically 4 or 8 bars)
  ✓ Clear harmonic structure with authentic cadences
  ✓ Melodically interesting (NOT just scale runs)
  ✓ Technically appropriate for the stated difficulty level

========================================
PART 3: EDUCATIONAL CONTENT GENERATION
========================================

Generate EXACTLY 7 learning points:
- Each must be specific, actionable, and directly tied to the music
- Include music theory concepts (e.g., "Understanding dominant-tonic resolution in bars 7-8")
- Include technical skills (e.g., "Developing smooth finger transitions in the ascending arpeggio, bars 5-6")
- Include musical interpretation (e.g., "Shaping the phrase crescendo from bar 9 to the climax in bar 12")
- NO generic statements like "improve coordination" - be SPECIFIC to THIS exercise

Generate EXACTLY 10 practice instructions:
1. Initial sight-reading approach (how to learn the notes)
2. Hands separately practice method (if applicable) with specific bar ranges
3. Slow tempo practice protocol (starting tempo + metronome markings)
4. Challenging passages identification and isolation practice (cite specific bars)
5. Technical focus for Section A (with bar numbers)
6. Technical focus for Section B (with bar numbers)
7. Tempo progression schedule (e.g., "Week 1: 60 BPM, Week 2: 80 BPM, Week 3: 100 BPM, target: 120 BPM")
8. Musical expression and phrasing (dynamics, articulation)
9. Common mistakes students make with THIS specific exercise and how to avoid them
10. Performance readiness checklist and suggested recording/self-evaluation

========================================
PART 4: QUALITY SELF-VERIFICATION
========================================

Before finalizing, verify:
□ Bar count is exactly as specified (16/24/32)
□ ABC syntax is valid (mentally parse each line)
□ Melody is singable and musically interesting
□ Difficulty matches specification (not too easy or hard)
□ Learning points are specific to THIS exercise (7 items)
□ Practice instructions are detailed and actionable (10 items)
□ Description is compelling and explains value proposition
□ Title is specific and engaging

========================================
OUTPUT FORMAT (STRICT JSON)
========================================

{
  "type": "music",
  "title": "[Specific, engaging title, e.g., 'Moonlit Waltz: Legato Phrasing Study in G Major']",
  "description": "[2-3 sentences explaining: (1) what technical skill this develops, (2) what musical concept it teaches, (3) why students will benefit from practicing this]",
  "abcNotation": "[Complete ABC notation exactly as specified above, with proper headers, bar lines, and specified bar count]",
  "learningPoints": [
    "[EXACTLY 7 items - each 15-30 words, specific to the music with bar numbers]"
  ],
  "practiceInstructions": [
    "[EXACTLY 10 items - each 20-50 words, detailed step-by-step practice strategies with specific bar numbers, tempos, and time estimates]"
  ]
}

========================================
FINAL REMINDER
========================================

This exercise will be used by REAL students. Quality matters. Take the chain-of-thought approach: PLAN → COMPOSE → EDUCATE → VERIFY. Generate professional-grade pedagogical material that reflects current best practices in music education (2025). Your reputation as an educator depends on the quality of this output.`;

function getPromptTemplate(format: string): string {
  switch (format) {
    case 'quiz':
      return QUIZ_PROMPT;
    case 'summary':
      return SUMMARY_PROMPT;
    case 'flashcards':
      return FLASHCARD_PROMPT;
    case 'practice':
      return PRACTICE_PROMPT;
    case 'music':
      return MUSIC_PROMPT;
    default:
      throw new Error(`Unknown material format: ${format}`);
  }
}

function buildPrompt(request: MaterialGenerationRequest): string {
  const template = getPromptTemplate(request.format);
  return template
    .replace('{subject}', request.subject)
    .replace('{topic}', request.topic)
    .replace('{difficulty}', request.difficulty)
    .replace('{instrument}', request.instrument || 'piano')
    .replace('{context}', request.additionalContext || 'None');
}

/**
 * Check if user has remaining quota for AI material generation
 */
export async function checkMaterialQuota(clerkUserId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: string;
}> {
  const userId = await getUserIdFromClerkId(clerkUserId);

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!subscription) {
    // No subscription = freemium tier
    return {
      allowed: false,
      remaining: 0,
      limit: 3,
      tier: 'freemium',
    };
  }

  const tier = subscription.tier;
  const used = subscription.aiMaterialsUsed;

  // Determine limit based on tier
  const limit = tier === 'basic' || tier === 'premium' ? -1 : 3; // -1 = unlimited

  if (limit === -1) {
    // Unlimited
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      tier,
    };
  }

  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    tier,
  };
}

/**
 * Increment AI material usage counter
 */
async function incrementMaterialUsage(clerkUserId: string): Promise<void> {
  const userId = await getUserIdFromClerkId(clerkUserId);

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (subscription) {
    await db
      .update(subscriptions)
      .set({
        aiMaterialsUsed: subscription.aiMaterialsUsed + 1,
      })
      .where(eq(subscriptions.id, subscription.id));
  }
}

/**
 * Generate AI-powered educational material
 */
export async function generateMaterial(
  request: MaterialGenerationRequest
): Promise<{
  material: GeneratedMaterial;
  materialId: string;
  cost: number;
  qualityStatus?: QualityStatus;
  qualityMetadata?: {
    playabilityScore: number;
    learningValueScore: number;
    qualityMessage: string;
    canPublish: boolean;
    suggestions: string[];
  };
}> {
  // Validate request
  const validated = materialGenerationSchema.parse(request);

  // Convert Clerk ID to internal UUID
  const internalUserId = await getUserIdFromClerkId(validated.userId);

  // Check quota
  const quota = await checkMaterialQuota(validated.userId);
  if (!quota.allowed) {
    throw new Error(
      `Material generation limit reached. You have ${quota.remaining}/${quota.limit} remaining this month. Upgrade to Basic or Premium for unlimited generation.`
    );
  }

  // Use model from environment variable (no longer auto-downgrade based on difficulty)
  // This allows consistent high-quality generation regardless of difficulty level

  // Build prompt
  const prompt = buildPrompt(validated);

  // Generate material using OpenAI
  const { completion, usage } = await createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You are a world-class educator and instructional designer with deep expertise in creating high-quality learning materials. Your materials are comprehensive, pedagogically sound, and designed to maximize student engagement and learning outcomes. You always generate content in valid JSON format only. Do not include any text outside the JSON structure. Take your time to create substantial, professional-grade educational content.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      // model will be set from env.OPENAI_MODEL via createChatCompletion
      // Note: GPT-5 only supports temperature=1 (default), removed explicit temperature
      // maxTokens will be set from env.OPENAI_MAX_TOKENS via createChatCompletion
    }
  );

  const message = completion.choices[0]?.message;

  // Debug logging for GPT-5
  console.log('[AI Material Service] Completion response:', {
    hasMessage: !!message,
    hasContent: !!message?.content,
    contentLength: message?.content?.length,
    messageKeys: message ? Object.keys(message) : [],
    fullMessage: JSON.stringify(message, null, 2),
  });

  const response = message?.content;
  if (!response) {
    console.error('[AI Material Service] No content in response:', {
      message,
      fullCompletion: JSON.stringify(completion, null, 2),
    });
    throw new Error('Failed to generate material: No content in API response');
  }

  // Parse JSON response
  let generatedMaterial: GeneratedMaterial;
  try {
    generatedMaterial = JSON.parse(response) as GeneratedMaterial;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error}`);
  }

  // For music materials, validate ABC notation and check quality gate
  let qualityStatus: QualityStatus = 'approved'; // Default for non-music materials
  let qualityMetadata: {
    playabilityScore: number;
    learningValueScore: number;
    qualityMessage: string;
    canPublish: boolean;
    suggestions: string[];
  } | Record<string, never> = {};

  if (validated.format === 'music' && generatedMaterial.type === 'music') {
    const abcNotation = generatedMaterial.abcNotation;

    // Validate ABC syntax
    const validationError = validateAbcSyntax(abcNotation);
    if (validationError) {
      throw new Error(`Generated ABC notation is invalid: ${validationError}`);
    }

    // Check quality gate
    const instrument = validated.instrument || 'piano';
    const qualityResult = checkQualityGate(abcNotation, instrument);

    qualityStatus = qualityResult.status;
    qualityMetadata = {
      playabilityScore: qualityResult.playabilityScore,
      learningValueScore: qualityResult.learningValueScore,
      qualityMessage: qualityResult.message,
      canPublish: qualityResult.canPublish,
      suggestions: qualityResult.analysis ? suggestImprovements(qualityResult.analysis) : [],
    };

    // If quality gate fails, still save but mark as draft
    if (!qualityResult.canPublish) {
      console.warn(`Music material failed quality gate: ${qualityResult.message}`);
    }
  }

  // Save to database
  const [savedMaterial] = await db
    .insert(materials)
    .values({
      creatorId: internalUserId,
      title: `${validated.subject}: ${validated.topic}`,
      description: `${validated.format} for ${validated.difficulty} level`,
      content: JSON.stringify(generatedMaterial),
      type: validated.format,
      difficulty: validated.difficulty,
      isPublic: validated.isPublic ?? false, // Set public visibility
      qualityStatus: qualityStatus,
      metadata: {
        subject: validated.subject,
        topic: validated.topic,
        format: validated.format,
        instrument: validated.instrument,
        generationCost: usage.estimatedCost,
        model: usage.model,
        tokens: usage.totalTokens,
        ...qualityMetadata,
      },
    })
    .returning();

  // Increment usage counter
  await incrementMaterialUsage(validated.userId);

  const hasQualityMetadata = Object.keys(qualityMetadata).length > 0;

  return {
    material: generatedMaterial,
    materialId: savedMaterial.id,
    cost: usage.estimatedCost,
    qualityStatus,
    qualityMetadata: hasQualityMetadata ? (qualityMetadata as {
      playabilityScore: number;
      learningValueScore: number;
      qualityMessage: string;
      canPublish: boolean;
      suggestions: string[];
    }) : undefined,
  };
}

/**
 * Get user's generated materials
 */
export async function getUserMaterials(clerkUserId: string) {
  const userId = await getUserIdFromClerkId(clerkUserId);

  // In development, return all materials for testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  const disableAccessCheck = process.env.DISABLE_MATERIAL_ACCESS_CHECK === 'true';

  if (isDevelopment || disableAccessCheck) {
    // Development: Return all materials
    return db
      .select()
      .from(materials)
      .orderBy(desc(materials.createdAt));
  }

  // Production: Return only user's materials
  return db
    .select()
    .from(materials)
    .where(eq(materials.creatorId, userId))
    .orderBy(desc(materials.createdAt));
}

/**
 * Get material by ID
 */
export async function getMaterialById(materialId: string) {
  const [material] = await db
    .select()
    .from(materials)
    .where(eq(materials.id, materialId))
    .limit(1);

  return material;
}

/**
 * Delete material
 */
export async function deleteMaterial(materialId: string, clerkUserId: string) {
  const userId = await getUserIdFromClerkId(clerkUserId);
  const material = await getMaterialById(materialId);

  if (!material || material.creatorId !== userId) {
    throw new Error('Material not found or access denied');
  }

  await db.delete(materials).where(eq(materials.id, materialId));
}
