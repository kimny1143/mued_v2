import OpenAI from 'openai';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { MATERIAL_REQUEST_PARSER_SYSTEM_PROMPT } from '@/lib/ai/prompts/material-request-parser';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const requestSchema = z.object({
  naturalInput: z.string(),
  advancedSettings: z.object({
    materialType: z.string().optional(),
    instrument: z.string().optional(),
    difficulty: z.string().optional(),
    duration: z.number().optional(),
    genre: z.string().optional(),
  }).optional(),
});

interface ParsedMaterialRequest {
  instrument: string;
  topic: string;
  difficulty: string;
  materialType: string;
  genre?: string;
  duration: number;
}

/**
 * POST /api/ai/parse-material-request
 *
 * Parse natural language input to extract material generation parameters
 */
export const POST = withAuth(async ({ request }) => {
  // Rate limit: 10 requests per minute for AI endpoints
  const rateLimitResponse = await rateLimit(request, 'ai');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError('Invalid request', validation.error.errors);
    }

    const { naturalInput, advancedSettings } = validation.data;

    // Use advanced settings if provided, otherwise parse from natural input
    if (advancedSettings?.instrument && advancedSettings?.difficulty) {
      // If user specified in advanced settings, use those
      return apiSuccess({
        instrument: advancedSettings.instrument || 'Piano',
        topic: naturalInput.substring(0, 200) || 'General practice',
        difficulty: advancedSettings.difficulty || 'beginner',
        materialType: advancedSettings.materialType || 'etude',
        genre: advancedSettings.genre || '',
        duration: advancedSettings.duration || 30,
      });
    }

    // Parse natural language input using OpenAI
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const isGPT5 = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o1');

    const params: import('@/types/openai').OpenAICompletionParams = {
      model,
      messages: [
        { role: 'system', content: MATERIAL_REQUEST_PARSER_SYSTEM_PROMPT },
        { role: 'user', content: naturalInput },
      ],
      response_format: { type: 'json_object' },
    };

    // GPT-5 doesn't support custom temperature
    if (!isGPT5) {
      params.temperature = 0.3;
    }

    const response = await openai.chat.completions.create(params);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed: ParsedMaterialRequest = JSON.parse(content);

    // Validate parsed data
    if (!parsed.instrument || !parsed.topic || !parsed.difficulty || !parsed.materialType) {
      return apiValidationError('必要な情報を抽出できませんでした。もう少し具体的に教えてください。');
    }

    // Override with advanced settings if provided
    return apiSuccess({
      instrument: advancedSettings?.instrument || parsed.instrument,
      topic: parsed.topic,
      difficulty: advancedSettings?.difficulty || parsed.difficulty,
      materialType: advancedSettings?.materialType || parsed.materialType,
      genre: advancedSettings?.genre || parsed.genre || '',
      duration: advancedSettings?.duration || parsed.duration || 30,
    });

  } catch (error) {
    console.error('Error parsing material request:', error);
    return apiServerError(
      error instanceof Error ? error : new Error('リクエストの解析中にエラーが発生しました')
    );
  }
});
