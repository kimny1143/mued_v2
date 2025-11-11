/**
 * OpenAI ABC Notation Generator
 *
 * Generates ABC notation directly from text prompts using OpenAI's latest model.
 */

import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

interface GenerateAbcParams {
  subject: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instrument?: string;
  additionalContext?: string;
}

interface AbcGenerationResult {
  success: boolean;
  abcNotation?: string;
  metadata?: {
    noteCount: number;
    duration: number;
    tempo: number;
    key: string;
  };
  error?: string;
}

/**
 * Build educational music generation prompt
 */
function buildPrompt(params: GenerateAbcParams): string {
  const { subject, topic, difficulty, instrument, additionalContext } = params;

  const difficultyDescriptions = {
    beginner: '初心者向け（シンプルなメロディー、基本的なリズム）',
    intermediate: '中級者向け（適度な複雑さ、様々なリズムパターン）',
    advanced: '上級者向け（技術的に挑戦的、複雑なハーモニーとリズム）',
  };

  return `あなたは音楽教育の専門家です。ABC記譜法を使って、教育用の楽曲を生成してください。

【要件】
- 楽器: ${instrument || subject}
- テーマ: ${topic}
- 難易度: ${difficulty} - ${difficultyDescriptions[difficulty]}
${additionalContext ? `- 追加要件: ${additionalContext}` : ''}

【ABC記譜法の出力要件】
1. 必ず有効なABC記譜法の形式で出力してください
2. ヘッダー情報を含めてください（X, T, M, L, K）
3. 教育的価値の高い、練習に適した内容にしてください
4. ${difficulty}レベルに適した複雑さにしてください
5. 説明文は不要です。ABC記譜法のみを出力してください

【出力例】
X:1
T:${topic}
M:4/4
L:1/8
Q:1/4=120
K:Cmaj
|:C2 D2 E2 F2|G2 A2 B2 c2|...

それでは、要件に従ってABC記譜法を生成してください：`;
}

/**
 * Extract metadata from ABC notation using regex
 */
function extractMetadata(abcNotation: string): {
  tempo: number;
  key: string;
  noteCount: number;
  duration: number;
} {
  // Extract tempo (Q: field)
  const tempoMatch = abcNotation.match(/Q:\s*1\/4\s*=\s*(\d+)/i);
  const tempo = tempoMatch ? parseInt(tempoMatch[1]) : 120;

  // Extract key (K: field)
  const keyMatch = abcNotation.match(/K:\s*([A-G][#b]?(?:maj|min)?)/i);
  const key = keyMatch ? keyMatch[1] : 'C';

  // Rough note count estimation (count letter notes A-G)
  const noteCount = (abcNotation.match(/[A-Ga-g]/g) || []).length;

  // Rough duration estimation based on tempo and note count
  // Assuming average note duration of 1/4 beat
  const estimatedBeats = noteCount * 0.25;
  const duration = Math.round((estimatedBeats / tempo) * 60);

  return {
    tempo,
    key,
    noteCount,
    duration: Math.max(duration, 10), // Minimum 10 seconds
  };
}

/**
 * Validate ABC notation format
 */
function validateAbcNotation(abc: string): boolean {
  // Check for required headers
  const hasReferenceNumber = /X:\s*\d+/.test(abc);
  const hasTitle = /T:/.test(abc);
  const hasMeter = /M:/.test(abc);
  const hasKey = /K:/.test(abc);

  // Check for actual notes
  const hasNotes = /[A-Ga-g]/.test(abc);

  return hasReferenceNumber && hasTitle && hasMeter && hasKey && hasNotes;
}

/**
 * Generate ABC notation using OpenAI
 */
export async function generateAbcWithOpenAI(
  params: GenerateAbcParams
): Promise<AbcGenerationResult> {
  try {
    console.log('[OpenAI ABC] Generating notation with params:', params);

    const prompt = buildPrompt(params);
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Latest OpenAI model
      messages: [
        {
          role: 'system',
          content: 'You are a professional music educator and ABC notation expert. Generate valid ABC notation for educational purposes. Output ONLY the ABC notation, no explanations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const abcNotation = response.choices[0]?.message?.content?.trim();

    if (!abcNotation) {
      throw new Error('No ABC notation generated');
    }

    console.log('[OpenAI ABC] Raw response length:', abcNotation.length);

    // Extract ABC notation from response (remove markdown if present)
    let cleanedAbc = abcNotation;

    // Remove markdown code blocks if present
    cleanedAbc = cleanedAbc.replace(/```(?:abc)?\n?/g, '');
    cleanedAbc = cleanedAbc.trim();

    // Validate ABC notation
    if (!validateAbcNotation(cleanedAbc)) {
      console.error('[OpenAI ABC] Invalid ABC notation:', cleanedAbc.substring(0, 200));
      throw new Error('Generated ABC notation is invalid');
    }

    // Extract metadata
    const metadata = extractMetadata(cleanedAbc);

    console.log('[OpenAI ABC] Generation successful:', {
      noteCount: metadata.noteCount,
      duration: metadata.duration,
      tempo: metadata.tempo,
      key: metadata.key,
    });

    return {
      success: true,
      abcNotation: cleanedAbc,
      metadata,
    };
  } catch (error) {
    console.error('[OpenAI ABC] Generation error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate learning points in Japanese based on ABC metadata
 */
export function generateLearningPoints(
  params: GenerateAbcParams,
  metadata: {
    tempo: number;
    key: string;
    noteCount: number;
    duration: number;
  }
): string[] {
  const { subject, topic, difficulty } = params;

  return [
    `この楽曲は${difficulty}レベルの${subject}の練習曲です`,
    `テーマ: ${topic}`,
    `テンポは${metadata.tempo} BPMで設定されています`,
    `調: ${metadata.key}`,
    `全体で${metadata.noteCount}個の音符が含まれています`,
    `演奏時間は約${metadata.duration}秒です`,
  ];
}

/**
 * Generate practice instructions in Japanese based on difficulty
 */
export function generatePracticeInstructions(difficulty: string): string[] {
  const baseInstructions = [
    'まずゆっくりとしたテンポで練習してください',
    '各音符を正確に演奏することを心がけてください',
    'MIDIプレイヤーで音源を確認しながら練習するとより効果的です',
  ];

  const difficultySpecific = {
    beginner: [
      '指の位置を確認しながら、一つずつの音を丁寧に弾きましょう',
      '焦らずに、正しいリズムで演奏できるようになってから次に進みましょう',
    ],
    intermediate: [
      '慣れてきたら、徐々にテンポを上げていきましょう',
      'フレーズごとに区切って練習し、最後に全体を通して演奏しましょう',
    ],
    advanced: [
      '表現力を意識して、強弱やアーティキュレーションに注意を払いましょう',
      '技術的に難しい箇所は部分練習を繰り返し、完成度を高めましょう',
    ],
  };

  return [
    ...baseInstructions,
    ...(difficultySpecific[difficulty as keyof typeof difficultySpecific] || difficultySpecific.intermediate),
  ];
}
