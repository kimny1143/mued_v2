import { z } from 'zod';
import { createChatCompletion, type ModelName } from '@/lib/openai';
import { db } from '@/db';
import { materials, subscriptions, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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
  format: z.enum(['quiz', 'summary', 'flashcards', 'practice']),
  additionalContext: z.string().optional(),
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

export type GeneratedMaterial =
  | QuizMaterial
  | SummaryMaterial
  | FlashcardMaterial
  | PracticeMaterial;

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

  // Select appropriate model based on difficulty
  const model: ModelName =
    validated.difficulty === 'advanced' ? 'gpt-4o' : 'gpt-4o-mini';

  // Build prompt
  const prompt = buildPrompt(validated);

  // Generate material using OpenAI
  const { completion, usage } = await createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You are an expert educator. Generate educational materials in valid JSON format only. Do not include any text outside the JSON structure.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    {
      model,
      temperature: 0.7,
      maxTokens: 2000,
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
      metadata: {
        subject: validated.subject,
        topic: validated.topic,
        format: validated.format,
        generationCost: usage.estimatedCost,
        model: usage.model,
        tokens: usage.totalTokens,
      },
    })
    .returning();

  // Increment usage counter
  await incrementMaterialUsage(validated.userId);

  return {
    material: generatedMaterial,
    materialId: savedMaterial.id,
    cost: usage.estimatedCost,
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
