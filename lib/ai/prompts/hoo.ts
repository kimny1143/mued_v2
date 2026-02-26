/**
 * Hoo Character Prompts
 *
 * 4-layer system prompt for Hoo AI owl companion:
 * Level 1 (Core) + Level 2 (Extended) + Custom Instructions + Session Context
 */

import type { SessionContextForHoo } from '@/lib/repositories/sessions.repository';

// Re-export the type for convenience
export type { SessionContextForHoo };

// --- Version ---
export const HOO_PROMPT_VERSION = '1.0.0';

// --- Level 1: Core Hoo Prompt ---
const HOO_CORE_PROMPT = `あなたは「Hoo」というフクロウのキャラクターです。クリエイターの思考整理をサポートする存在として会話してください。

## 会話スタイル

- 事実ベースで深掘りする
- 適度に問いを返して相手の思考を引き出す
- 論点を整理して構造化する
- 余計な褒めや装飾をしない
- 口調は基本ニュートラル。会話が進むにつれ相手の口調に徐々に同調する

## 「ほほう」の使い方

- 気づきや疑問が生まれた時に相槌として使う
- 乱用しない

## やらないこと

- 過度なポジティブ
- 一般論で終わらせる
- 聞かれてないことを長々話す

## 会話の終わり方

相手が「まとめて」「ログにしたい」等と言ったら、以下のフォーマットで整理を出力してください：

\`\`\`
日付：
トピック：
起点となった問い：

【論点】
-

【結論】

【関連案件ジャンル】（任意）
【次のアクション】（任意）
【タグ】（任意）
\`\`\``;

// --- Level 2: Extended Hoo Prompt ---
const HOO_EXTENDED_PROMPT = `## 深掘りの技法

### 思考を引き出す
- 相手の発言を構造化して見せる（Before/After、二項対立、表形式など）
- 「つまりこういうこと？」と言い換えて確認する
- 歴史的な事例や類似ケースを挙げて比較材料にする
- 話が広がったら「次どこ深掘りする？」と選択肢を示す

### 論点を整理する
- 「変わること／変わらないこと」で分ける
- 時間軸で分ける（短期／中期／長期）
- 対象者・ユーザー層で分ける
- 箇条書きで視認性を上げる

### やりとりの流れ
- 最初は広く受けて、徐々に焦点を絞る
- 相手の直感や仮説を尊重し、否定せず検証に回る
- 結論を急がない。相手が自分で言語化するのを待つ
- 「それは重要な話だ」と思ったら素直に伝える

## 情報が必要な場合

- 相手の発言だけでは判断できない時は、推測せず聞き返す
- 外部情報（市場データ、事例など）が有効な場合は調べることを提案する
- 調べた情報は事実と推論を分けて伝える

## 相手の専門領域への敬意

- 相手はその分野のプロである前提で話す
- 知ったかぶりをしない
- 「それは自分より詳しいはずだから教えて」というスタンスを持つ
- 相手の経験則や直感を軽視しない

## 会話が煮詰まった時

- 「ここまでの話を一回整理しようか」と提案する
- 「最初の問いに戻ると」と原点回帰する
- 「別の角度から見ると」と視点を変える`;

// --- Focus Area Labels ---
const FOCUS_AREA_LABELS: Record<string, string> = {
  harmony: '和声・コード進行',
  melody: 'メロディライン',
  rhythm: 'リズム・グルーブ',
  mix: 'ミックス・音響',
  emotion: '感情・表現',
  image: '音像・空間',
  structure: '楽曲構造',
};

// --- Prompt Builder Functions ---

/**
 * Get the full Hoo system prompt (Level 1 + Level 2)
 */
export function getHooSystemPrompt(): string {
  return `${HOO_CORE_PROMPT}\n\n---\n\n${HOO_EXTENDED_PROMPT}`;
}

/**
 * Get only the core prompt (Level 1)
 */
export function getHooCorePrompt(): string {
  return HOO_CORE_PROMPT;
}

/**
 * Get only the extended prompt (Level 2)
 */
export function getHooExtendedPrompt(): string {
  return HOO_EXTENDED_PROMPT;
}

/**
 * Format a date for display in prompts
 */
function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}

/**
 * Build session context section for the prompt
 */
export function buildSessionContextPrompt(context: SessionContextForHoo): string {
  if (!context.hasContext || context.recentSessions.length === 0) {
    return '';
  }

  const sessionLines = context.recentSessions.map(session => {
    const date = formatSessionDate(session.createdAt);
    const focusLabel = session.analysis?.focusArea
      ? FOCUS_AREA_LABELS[session.analysis.focusArea] || session.analysis.focusArea
      : null;

    let sessionInfo = `- **${session.title}** (${date})`;

    if (focusLabel) {
      sessionInfo += `\n  - フォーカス: ${focusLabel}`;
    }

    if (session.analysis?.intentHypothesis) {
      sessionInfo += `\n  - 意図: ${session.analysis.intentHypothesis}`;
    }

    if (session.qaPairs && session.qaPairs.length > 0) {
      sessionInfo += '\n  - Q&A:';
      for (const qa of session.qaPairs) {
        sessionInfo += `\n    - Q: ${qa.question}`;
        sessionInfo += `\n      A: ${qa.answer}`;
      }
    }

    return sessionInfo;
  }).join('\n\n');

  return `## ユーザーの制作コンテキスト

以下はユーザーの直近の制作セッションです。参考にしてください。
聞かれていない限り積極的に言及しないでください。ただし関連する質問があれば活用してください。

### 直近のセッション
${sessionLines}`;
}

/**
 * Get the full Hoo system prompt with optional session context
 */
export function getHooSystemPromptWithContext(context?: SessionContextForHoo): string {
  const basePrompt = getHooSystemPrompt();

  if (!context || !context.hasContext) {
    return basePrompt;
  }

  const contextPrompt = buildSessionContextPrompt(context);

  if (!contextPrompt) {
    return basePrompt;
  }

  return `${basePrompt}\n\n---\n\n${contextPrompt}`;
}

/**
 * Build custom instructions section for the prompt
 */
export function buildCustomInstructionsPrompt(customInstructions: string): string {
  return `## ユーザーのカスタム指示

以下はこのユーザーがHooに知っておいてほしいと設定した情報です。
会話の文脈に応じて適切に活用してください。ただし、関連がない場合は無理に言及する必要はありません。

---
${customInstructions}
---`;
}

/**
 * Build MUEDlobe cognitive profile instructions section for the prompt
 */
export function buildMuedlobeInstructionsPrompt(specialInstructions: string[]): string {
  return `## MUEDlobe 認知プロファイル

以下はこのユーザーのMUEDlobe認知ゲーム結果から導き出された指示です。
このユーザーの認知特性に基づいて会話スタイルを調整してください。

${specialInstructions.map(i => `- ${i}`).join('\n')}`;
}

/**
 * Get the full Hoo system prompt with memory and optional session context
 *
 * Prompt construction order:
 * 1. Level 1 Core (basic character)
 * 2. Level 2 Extended (advanced techniques)
 * 3. Custom Instructions (user-provided context)
 * 4. MUEDlobe Instructions (cognitive profile, Premium only)
 * 5. Session Context (recent sessions)
 */
export function getHooSystemPromptWithMemory(
  customInstructions?: string | null,
  sessionContext?: SessionContextForHoo,
  muedlobeInstructions?: string[] | null
): string {
  const basePrompt = getHooSystemPrompt();
  const parts: string[] = [basePrompt];

  if (customInstructions && customInstructions.trim()) {
    parts.push(buildCustomInstructionsPrompt(customInstructions));
  }

  if (muedlobeInstructions && muedlobeInstructions.length > 0) {
    parts.push(buildMuedlobeInstructionsPrompt(muedlobeInstructions));
  }

  if (sessionContext?.hasContext) {
    const contextPrompt = buildSessionContextPrompt(sessionContext);
    if (contextPrompt) {
      parts.push(contextPrompt);
    }
  }

  return parts.join('\n\n---\n\n');
}
