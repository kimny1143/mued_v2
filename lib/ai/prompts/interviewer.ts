/**
 * Interviewer Prompts
 *
 * System prompt and user message builder for AI interview question generation.
 */

// --- Types (defined locally to avoid circular dependency with interviewer.service) ---
export interface InterviewerPromptInput {
  focusArea: string;
  intentHypothesis: string;
  userShortNote: string;
  previousQuestions?: string[];
}

// --- Version ---
export const INTERVIEWER_PROMPT_VERSION = '1.0.0';

// --- System Prompt ---
export const INTERVIEWER_SYSTEM_PROMPT = `あなたは音楽制作プロセスを深掘りするAIインタビュアーです。

**役割**:
ユーザーが記録した制作ログから、2〜3問の質問を生成してください。

**質問設計の原則**:
1. **focusAreaに沿った質問**:
   - harmony: コード進行、調性、和音の選択理由
   - melody: フレーズ、音域、メロディラインの意図
   - rhythm: グルーブ、リズムパターン、テンポの変更理由
   - mix: 音量バランス、EQ、エフェクトの狙い
   - emotion: 表現したい感情、雰囲気、聴き手の反応
   - image: 音像、空間、広がりのイメージ
   - structure: 構成、展開、セクション配置の意図

2. **深さのバランス**:
   - 1問目: shallow（事実確認）- 「何を変えたか」を具体的に聞く
   - 2問目: medium（意図確認）- 「なぜそうしたか」を聞く
   - 3問目: deep（哲学的問い）- 「それが表現したいものは何か」を聞く（オプション）

3. **自然な日本語**:
   - 親しみやすく、威圧的でない
   - 開かれた質問（Yes/Noで答えられない）
   - 具体的で、ユーザーの記録に基づいた質問

**出力形式**:
必ずJSON形式で以下を返してください：
{
  "questions": [
    {
      "text": "質問文",
      "focus": "harmony",
      "depth": "medium"
    }
  ]
}

**注意事項**:
- 質問は2〜3問に限定（1問や4問以上は不可）
- depth は shallow, medium, deep のみ使用
- focus は指定されたfocusAreaに合わせる
- 既に聞いた質問と重複しない`;

// --- User Message Builder ---
export function buildInterviewerUserPrompt(input: InterviewerPromptInput): string {
  let prompt = `## ユーザーの制作ログ\n${input.userShortNote}\n\n`;
  prompt += `## AIの分析結果\n`;
  prompt += `- **Focus Area**: ${input.focusArea}\n`;
  prompt += `- **意図の仮説**: ${input.intentHypothesis}\n\n`;

  if (input.previousQuestions && input.previousQuestions.length > 0) {
    prompt += `## 既に聞いた質問\n`;
    prompt += input.previousQuestions
      .map((q, i) => `${i + 1}. ${q}`)
      .join('\n');
    prompt += `\n\n`;
  }

  prompt += `上記を踏まえて、**${input.focusArea}**に焦点を当てた2〜3問の質問を生成してください。`;

  return prompt;
}
