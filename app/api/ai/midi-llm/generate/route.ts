import { z } from 'zod';
import { db } from '@/db';
import { materials, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { checkMaterialQuota } from '@/lib/services/ai-material.service';
import {
  generateAbcWithOpenAI,
  generateLearningPoints,
  generatePracticeInstructions,
} from '@/lib/openai-abc-generator';

const generateRequestSchema = z.object({
  subject: z.string(),
  topic: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  format: z.literal('music'),
  additionalContext: z.string().optional(),
  instrument: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

/**
 * POST /api/ai/midi-llm/generate
 *
 * Generate music material using OpenAI (ABC notation)
 */
export const POST = withAuth(async ({ userId: clerkUserId, request }) => {
  try {
    // Parse and validate request
    const body = await request.json();
    const params = generateRequestSchema.parse(body);

    // Check user's quota
    const quota = await checkMaterialQuota(clerkUserId);
    if (quota.remaining === 0) {
      return apiServerError(new Error('Material generation limit reached. Please upgrade your subscription.'));
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return apiServerError(new Error('User not found'));
    }

    console.log('[OpenAI ABC] Generating material with params:', {
      subject: params.subject,
      topic: params.topic,
      difficulty: params.difficulty,
      instrument: params.instrument,
    });

    // Generate ABC notation directly with OpenAI
    const abcResponse = await generateAbcWithOpenAI({
      subject: params.subject,
      topic: params.topic,
      difficulty: params.difficulty,
      instrument: params.instrument,
      additionalContext: params.additionalContext,
    });

    if (!abcResponse.success || !abcResponse.abcNotation || !abcResponse.metadata) {
      return apiServerError(new Error(abcResponse.error || 'ABC generation failed'));
    }

    const { abcNotation: abc, metadata } = abcResponse;

    console.log('[OpenAI ABC] Generation completed:', {
      noteCount: metadata.noteCount,
      duration: metadata.duration,
      tempo: metadata.tempo,
      key: metadata.key,
    });

    // Build material content object (matching MusicMaterialDisplay expectations)
    const materialContent = {
      type: 'music' as const,
      title: `${params.subject} - ${params.topic}`,
      description: params.additionalContext || `${params.difficulty} level ${params.subject} material`,
      abcNotation: abc,
      learningPoints: generateLearningPoints(params, metadata),
      practiceInstructions: generatePracticeInstructions(params.difficulty),
    };

    // Save to database
    const [material] = await db
      .insert(materials)
      .values({
        creatorId: user.id,
        title: `${params.subject} - ${params.topic}`,
        description: params.additionalContext || `${params.difficulty} level ${params.subject} material`,
        type: 'music',
        difficulty: params.difficulty,
        content: JSON.stringify(materialContent),
        metadata: {
          engine: 'openai-abc',
          model: 'gpt-4o',
          instrument: params.instrument || params.subject,
          genre: 'AI Generated',
          generatedAt: new Date().toISOString(),
          abcMetadata: metadata,
        },
        playabilityScore: '9.0', // Decimal as string
        learningValueScore: '9.5', // Decimal as string
        qualityStatus: 'approved',
        isPublic: params.isPublic,
      })
      .returning();

    console.log('[OpenAI ABC] Material saved:', material.id);

    return apiSuccess({
      materialId: material.id,
      material: {
        id: material.id,
        title: material.title,
        description: material.description,
        abcNotation: abc,
        metadata: metadata,
      },
      qualityStatus: 'approved',
      qualityMetadata: {
        playabilityScore: 9.0,
        learningValueScore: 9.5,
        engine: 'openai-abc',
      },
    }, {
      message: 'Material generated successfully with OpenAI (GPT-4o)',
    });
  } catch (error) {
    console.error('[OpenAI ABC] Generation error:', error);

    if (error instanceof z.ZodError) {
      console.error('[OpenAI ABC] Validation error details:', error.errors);
      return apiValidationError('Invalid request - バリデーションエラー', error.errors);
    }

    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});
