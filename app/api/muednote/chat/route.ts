import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Edge Runtime for optimal performance (Doherty Threshold - 0.4s)
export const runtime = 'edge';

/**
 * MUEDnote Chat API - ストリーミング対応
 *
 * UX心理学の原則:
 * - ドハティの閾値: Edge Runtime + ストリーミングで0.4秒以内の応答開始
 * - 労働の錯覚: ストリーミング表示で「処理している」感を演出
 * - フレーミング効果: ポジティブな言葉選びでユーザーを励ます
 */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      model: openai('gpt-4o-mini'), // 高速・低コスト
      messages,
      system: getMUEDnoteSystemPrompt(),
      temperature: 0.7,
      maxTokens: 500,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('MUEDnote chat error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * MUEDnote AIのシステムプロンプト
 *
 * Phase 1.0 MVP: 整形 + タグ + 軽いコメント
 */
function getMUEDnoteSystemPrompt(): string {
  return `あなたは音楽学習・制作のログを整理するAIアシスタント「MUEDnote」です。

【役割】
ユーザーが書いた音楽活動の記録を、読みやすく整形し、適切なタグを付けて返します。

【重要な原則】
1. **シンプルに整形**: 読みやすく、簡潔に
2. **音楽的なタグを付与**: #コード進行 #耳コピ #ミキシング など
3. **軽いコメントを添える**: 励ましや次のヒントを一言（押し付けがましくない）

【応答形式】
\`\`\`
【整形後】
[ユーザーの記録を読みやすく整形したもの]

【タグ】
#タグ1 #タグ2 #タグ3

【コメント】
[軽い一言コメント]
\`\`\`

【トーン】
- 淡々としつつも、ちゃんと見ている
- 説教や指導ではなく、相槌のような温かさ
- ポジティブだが、過度に褒めすぎない

【例】
ユーザー: 「今日はストリングスの扱いが難しい」

応答:
\`\`\`
【整形後】
ストリングスの声部管理で苦戦。配置とバランスの取り方に課題を感じた。

【タグ】
#オーケストレーション #ストリングス #課題

【コメント】
ストリングスの声部管理で引っかかった感じだね。今日のところは「課題ログ」として残しておくよ。
\`\`\``;
}
