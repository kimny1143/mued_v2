import OpenAI from 'openai';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiValidationError,
  apiServerError,
} from '@/lib/api-response';

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
    const systemPrompt = `あなたは音楽教材生成のパラメータ抽出アシスタントです。
ユーザーの自然言語入力から以下のパラメータを抽出してJSONで返してください。

パラメータ:
1. instrument: 楽器名（Piano, Guitar, Drums, Bass, Saxophone, Trumpet, Violin, Cello, Flute, Clarinet, Voice など）
2. topic: 練習・学習したい内容（具体的に。例: ブルーススケール、アルペジオ、リズムパターン、コードボイシング）
3. difficulty: 難易度（beginner, intermediate, advanced, expert のいずれか）
4. materialType: 教材タイプ（etude, exercise, scale_pattern, theory_explanation, warmup のいずれか）
   - etude: エチュード（練習曲）
   - exercise: 基礎練習
   - scale_pattern: スケール・パターン
   - theory_explanation: 理論解説
   - warmup: ウォームアップ
5. genre: 音楽ジャンル（Classical, Jazz, Pop, Rock, Blues, R&B, Latin, Funk, Electronic, Folk, Country など。指定がなければ空文字）
6. duration: 練習時間（分単位。15, 30, 60 のいずれか。指定がなければ30）

例:
入力: "ジャズピアノの初心者向けに、ブルーススケールを使った30分の練習メニューを作って"
出力: {
  "instrument": "Piano",
  "topic": "ブルーススケールを使った練習",
  "difficulty": "beginner",
  "materialType": "exercise",
  "genre": "Jazz",
  "duration": 30
}

入力: "クラシックギターの中級者向けに、アルペジオの練習曲を生成して"
出力: {
  "instrument": "Guitar",
  "topic": "アルペジオ練習",
  "difficulty": "intermediate",
  "materialType": "etude",
  "genre": "Classical",
  "duration": 30
}

入力: "ドラムの上級者向けに、ジャズのリズムパターン集を作って"
出力: {
  "instrument": "Drums",
  "topic": "ジャズのリズムパターン",
  "difficulty": "advanced",
  "materialType": "scale_pattern",
  "genre": "Jazz",
  "duration": 30
}

必ずJSON形式で返してください。他の説明は不要です。`;

    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const isGPT5 = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o1');

    const params: import('@/types/openai').OpenAICompletionParams = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
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
