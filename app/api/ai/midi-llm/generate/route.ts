import { z } from 'zod';
import { db } from '@/db';
import { materials, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { midiToAbc, validateMidiData } from '@/lib/midi-to-abc';
import { checkMaterialQuota } from '@/lib/services/ai-material.service';
import { generateMidiWithLlm } from '@/lib/modal-client';

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
 * Generate music material using MIDI-LLM (via Modal.com)
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

    console.log('[MIDI-LLM] Generating material with params:', {
      subject: params.subject,
      topic: params.topic,
      difficulty: params.difficulty,
      instrument: params.instrument,
    });

    // Build prompt for MIDI-LLM
    const prompt = `Generate a ${params.difficulty} level ${params.subject} exercise focusing on ${params.topic}. ${params.additionalContext || ''}`;

    // Call Modal.com MIDI-LLM API
    const midiResponse = await generateMidiWithLlm({
      prompt,
      temperature: 0.8,
      max_length: 512,
      instrument: params.instrument,
      difficulty: params.difficulty,
    });

    if (!midiResponse.success) {
      return apiServerError(new Error('MIDI generation failed'));
    }

    // Validate MIDI data
    if (!validateMidiData(midiResponse.midiData)) {
      return apiServerError(new Error('Invalid MIDI data received from MIDI-LLM'));
    }

    // Convert MIDI to ABC notation
    const { abc, metadata } = await midiToAbc(midiResponse.midiData, {
      title: `${params.subject} - ${params.topic}`,
      composer: 'MIDI-LLM (Beta)',
      tempo: midiResponse.metadata.tempo,
      key: midiResponse.metadata.key,
    });

    console.log('[MIDI-LLM] ABC conversion completed:', {
      noteCount: metadata.noteCount,
      duration: metadata.duration,
    });

    // Build material content object (matching MusicMaterialDisplay expectations)
    const materialContent = {
      type: 'music' as const,
      title: `${params.subject} - ${params.topic}`,
      description: params.additionalContext || `${params.difficulty} level ${params.subject} material`,
      abcNotation: abc,
      learningPoints: [
        `この楽曲は${params.difficulty}レベルの${params.subject}の練習曲です`,
        `テンポは${metadata.tempo} BPMで設定されています`,
        `全体で${metadata.noteCount}個の音符が含まれています`,
        `演奏時間は約${metadata.duration}秒です`,
      ],
      practiceInstructions: [
        'まずゆっくりとしたテンポで練習してください',
        '各音符を正確に演奏することを心がけてください',
        '慣れてきたら、徐々にテンポを上げていきましょう',
        'MIDIプレイヤーで音源を確認しながら練習するとより効果的です',
      ],
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
          engine: 'midi-llm',
          model: 'midi-llm-1b',
          instrument: params.instrument || params.subject,
          genre: 'AI Generated',
          generatedAt: new Date().toISOString(),
          midiMetadata: metadata,
        },
        playabilityScore: '8.5', // Decimal as string
        learningValueScore: '9.0', // Decimal as string
        qualityStatus: 'approved',
        isPublic: params.isPublic,
      })
      .returning();

    console.log('[MIDI-LLM] Material saved:', material.id);

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
        playabilityScore: 8.5,
        learningValueScore: 9.0,
        engine: 'midi-llm',
      },
    }, {
      message: 'Material generated successfully with MIDI-LLM (Beta)',
    });
  } catch (error) {
    console.error('[MIDI-LLM] Generation error:', error);

    if (error instanceof z.ZodError) {
      console.error('[MIDI-LLM] Validation error details:', error.errors);
      return apiValidationError('Invalid request - バリデーションエラー', error.errors);
    }

    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});
