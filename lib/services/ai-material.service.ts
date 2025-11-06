import { z } from 'zod';
import { createChatCompletion, type ModelName } from '@/lib/openai';
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

export type GeneratedMaterial =
  | QuizMaterial
  | SummaryMaterial
  | FlashcardMaterial
  | PracticeMaterial
  | MusicMaterial;

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

const MUSIC_PROMPT = `You are a world-class music educator and composer with expertise in pedagogical material design. Create a comprehensive, musically sophisticated exercise in ABC notation.

Subject: {subject}
Topic: {topic}
Difficulty: {difficulty}
Instrument: {instrument}
Additional Context: {context}

CRITICAL REQUIREMENTS:

1. Musical Quality & Pedagogy:
   - Create musically engaging, melodic content (not just scale patterns)
   - Design progressive difficulty within the exercise (start easier, build complexity)
   - Include multiple sections or variations for practice (minimum 16 bars)
   - Ensure the music sounds good and is motivating to practice
   - Consider the specific topic and provide targeted practice for that skill

2. Difficulty-Specific Guidelines:
   - beginner: Simple rhythms (quarter/half/whole notes), 1 octave range, C/G major keys only, clear melodic contour, 4/4 or 3/4 time
   - intermediate: Eighth notes, dotted rhythms, 1.5 octave range, keys up to 2 sharps/flats, syncopation, 6/8 or mixed meters allowed
   - advanced: Complex rhythms (16ths, triplets), full range, any key, modulations, advanced articulations, challenging technical passages

3. ABC Notation Excellence:
   - MUST be valid ABC 2.1 syntax (test mentally before generating)
   - Structure: X:1, T:title, C:composer (you), M:meter, L:default note length, Q:tempo, K:key
   - Minimum 16 bars of music (32+ bars for advanced)
   - Use sections (|: A part :|, |: B part :|) for form
   - Include dynamics (%%MIDI program), articulations (staccato ., legato -, accent >)
   - Add chord symbols above melody for harmonic context
   - Use proper octave notation: C,, C, C c c' c''

4. Educational Value:
   - learningPoints: Provide 5-7 specific, actionable learning objectives tied to the music theory and technique required
   - practiceInstructions: Give 6-10 detailed, step-by-step practice strategies including:
     * Tempo progression (start slow, metronome markings)
     * Section-by-section breakdown
     * Technical focus areas (fingering, articulation, phrasing)
     * Common mistakes to avoid
     * Performance tips and musical expression
     * Practice duration estimates for each stage

5. Topic-Specific Content:
   - If the topic mentions scales, arpeggios, or patterns: integrate them musically, not as dry exercises
   - If the topic mentions styles (jazz, classical, etc.): reflect that style authentically
   - If the topic mentions specific techniques: feature them prominently with clear examples

Return in the following JSON format:
{
  "type": "music",
  "title": "Engaging and specific title reflecting the topic",
  "description": "Comprehensive 2-3 sentence description of what students will learn and why this exercise is valuable",
  "abcNotation": "X:1\\nT:Title\\nC:AI Music Educator\\nM:4/4\\nL:1/8\\nQ:1/4=120\\nK:C\\n|[notations with at least 16 bars]|",
  "learningPoints": ["Detailed point 1", "Detailed point 2", ... 5-7 points],
  "practiceInstructions": ["Detailed instruction 1", "Detailed instruction 2", ... 6-10 instructions]
}

IMPORTANT: Generate substantial, high-quality musical content worthy of a professional music educator. This is not a placeholder - students will actually practice this.`;

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
      temperature: 0.7,
      // maxTokens will be set from env.OPENAI_MAX_TOKENS via createChatCompletion
    }
  );

  const response = completion.choices[0]?.message?.content;
  if (!response) {
    throw new Error('Failed to generate material');
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
