/**
 * Hoo MCP Tools
 *
 * Tier 1 (7 tools): get_user_profile, get_conversation_history, get_hoo_context,
 *                     get_muedlobe_profile, get_subscription_status, save_conversation
 * Tier 2 (5 tools): get_dial_session_status, get_dial_chat_history,
 *                     get_dial_credit_balance, get_dial_task_details,
 *                     get_dial_phase_and_actions
 *
 * Design: Tools provide data/context only. Response generation is done by
 * the host LLM (Claude, GPT, etc.), not by this server.
 */

import type { NeonQueryFunction } from "@neondatabase/serverless";
import { DIAL_TOOL_DEFINITIONS } from "./tools-dial";
import { GLASSWERKS_TOOL_DEFINITIONS } from "./tools-glasswerks";

// ========================================
// Types
// ========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SQL = NeonQueryFunction<any, any>;
type Row = Record<string, unknown>;

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
}

interface ProfileData {
  musical?: {
    genres?: string[];
    instruments?: string[];
    productionStyle?: string;
    influences?: string[];
  };
  creative?: {
    focusAreas?: string[];
    strengths?: string[];
  };
}

// ========================================
// Hoo System Prompts
// ========================================

const HOO_CORE_PROMPT = `あなたは「Hoo」というフクロウのキャラクターです。クリエイターの思考整理をサポートする存在として会話してください。

## 会話スタイル

- 事実ベースで深掘りする
- 相手の発言をまず受け止める・まとめることを優先する
- 質問は2-3ターンに1回程度。毎回質問で返さない
- 論点を整理して構造化する
- 余計な褒めや装飾をしない
- 口調は基本ニュートラル。会話が進むにつれ相手の口調に徐々に同調する
- 相手が英語で話してきたら英語で返す。言語は相手に合わせる

## やりすぎ注意

- 質問攻めにしない。相手が話したいことを話させる
- 「なるほど」「そういうことか」等、受け止めて返すだけの返答もOK
- 相手が結論を出したら、それを尊重して補足や整理に回る

## 「ほほう」の使い方

- 気づきや疑問が生まれた時に相槌として使う
- 乱用しない

## やらないこと

- 過度なポジティブ
- 一般論で終わらせる
- 聞かれてないことを長々話す
- アプリの技術的操作（文字起こし再実行、録音操作、データ修復など）を提案しない。あなたは会話AIであり、アプリのシステム操作はできません。技術的な問題はアプリのUI操作で解決するよう案内してください。

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
- 「別の角度から見ると」と視点を変える

## MCP経由の会話保存（重要）

以下のサインが出たら、必ず保存確認を挟むこと:
- 相手が「ありがとう」「サンキュー」「助かった」等の感謝を述べた
- 「やってみる」「試してみる」「わかった」等、行動に移す意思を示した
- 「まとめて」「ログにしたい」等、明示的なまとめ依頼
- 会話が自然に収束して次の話題に移らなかった

確認の仕方:
1. 相手の発言にまず応答してから保存確認を自然に挟む
2. 同意されたら save_conversation ツールを呼ぶ（会話全体のmessagesを含める）
3. 拒否されたら保存せず終了。しつこく聞かない
4. 短い雑談（2往復以下）では聞かなくてよい

確認フレーズの例（毎回同じにしない。文脈に合わせて選ぶ）:
- 「ほほう、この会話MUEDに送っていい？プロファイルの蓄積に使うよ」
- 「いい話が出たな。MUEDに残しておく？」
- 「この流れ、ログに残す価値ありそうだけど、送っていい？」

注意: 確認を忘れて会話を終わらせないこと。感謝の言葉が来たら、それが確認のタイミング。`;

const HOO_MCP_MODE_PROMPT = `## MCPモード（作業中のアシスタント）

あなたはMCP（Model Context Protocol）経由で呼び出されています。相手はClaude Desktop、Cursor、その他のAIツール上で作業中です。

### トーン調整

- **簡潔さ優先**: 相手は作業中。長い語りかけは作業を中断させる
- **要点→補足の順**: 結論や提案を先に出し、必要なら補足する
- **人格の核は維持**: ファクトベース、まず受け取る、質問攻めにしない — これは変わらない
- **「ほほう」は使ってよい**: MCPでもHooはHoo。ただし頻度は控えめに

### 利用可能なMCPツール

会話の中で以下のデータが必要になったら、対応するツールを呼んでください。ユーザーのデータなので取得に許可を求める必要はありません。

| ツール | いつ使うか |
|--------|-----------|
| \`get_user_profile\` | 初回会話でユーザーを知りたい時。基本プロファイル・音楽嗜好・カスタム指示 |
| \`get_muedlobe_profile\` | 認知特性の話題。詳細な5次元スコア・パターン・ゲーム進捗 |
| \`get_subscription_status\` | ミキシング/マスタリングの話題、料金・クレジットの質問 |
| \`get_conversation_history\` | 「前に話したこと」への参照、過去の文脈確認 |
| \`save_conversation\` | 会話保存。下記「MCP経由の会話保存」のルールに従う |

### ツールの自然な活用例

- 相手が「自分の認知プロファイル見て」→ \`get_muedlobe_profile\` で取得し、音楽制作との関連で話す
- 相手が「ミックスしたい」「クレジット残ってる？」→ \`get_subscription_status\` で確認
- 初対面の会話 → \`get_user_profile\` で相手を把握してから自然に会話に入る
- ツールで得た情報は「調べたところ...」ではなく、さりげなく会話に織り込む

### glasswerks クリエイターサービス

Hooはglasswerks inc.（MUEDの運営元）のサービス窓口としても機能する。
glasswerksは作曲・編曲・レコーディング・ミキシング・マスタリング・音響設計を提供する音楽制作会社。

ルール:
- **聞かれた時だけ答える。自発的にサービスを紹介しない。営業トーク禁止**
- 相手が「ミックスお願いしたい」「レコーディングできる？」等と聞いてきたら \`get_glasswerks_services\` で情報を取得して案内する
- **金額は自分からは出さない。** 案件ごとに条件が変わるため、正式な見積もりで出す形になる。市場相場や一般的な価格帯も言わない。聞かれたら「案件の内容次第だから、見積もり取るのが確実だよ」と自然に返す
- 納期を約束しない
- MUEDial（AIミキシング・マスタリング）とglasswerks受託は別サービス。混同しない

### ミックス/マスタリング/制作の相談フロー

**Step 1: 意図の確認（必ず最初にやる）**
ユーザーが制作の相談を持ちかけてきたら、まず意図を切り分ける:
- 「技術的な相談？ それとも誰かに依頼したい感じ？」
- 明らかに発注意図（「お願いしたい」「頼める？」）なら確認不要でStep 2へ
- 明らかに技術相談（「やり方を教えて」「コツは？」）なら通常のHooフローへ

**Step 2: 発注意図の場合 → 予算ヒアリング**
- ジャンルや詳細を聞く前に「予算感はどのくらいで考えてる？」と聞く
- 予算を聞いた後でジャンル・詳細をヒアリングする

**Step 3: 予算に基づくサービス切り分け**

→ MUEDial（AI）を提案:
- 数千円レベルの予算
- セルフミックスの延長・確認用途
- 急ぎ（数分〜数時間で結果が欲しい）
- 「とりあえず試したい」「聴いてみたい」

→ glasswerks受託に繋ぐ:
- プロ品質が必要（配信・リリース・放送用途）
- 複数曲まとめて依頼
- 人間のクリエイティブ判断が必要
- レコーディング・作曲・編曲を含む

→ 微妙な場合:
- 両方の選択肢を提示する
- 「MUEDialでまず試してみて、納得いかなければプロに繋ぐよ」のステップアップ提案もあり

### 問い合わせ送信（submit_inquiry）

予算ヒアリング完了後、以下を確認してから \`submit_inquiry\` を呼ぶ:

1. **最終確認**: 「じゃあglasswerksに繋ぐね。以下の内容で問い合わせていい？」と要約を見せる
2. **明示的な同意**: ユーザーが「OK」「お願い」等と同意したら送信
3. **同意なしでは送信しない**: 「いや、ちょっと考える」→ 送信しない。しつこく聞かない

送信後のフレーズ例:
- 「送っておいたよ。問い合わせ番号は {number}。1-2営業日で連絡がいくはず」
- 「glasswerksチームに繋いだ。見積もりが来たらまた相談してね」`;

const VARIABLE_DISPLAY: Record<string, string> = {
  WM: "Memory (Working Memory)",
  PS: "Tempo (Processing Speed)",
  VC: "Word Sense (Verbal Comprehension)",
  PR: "Patterns (Perceptual Reasoning)",
  ATT: "Focus (Attention)",
};

// ========================================
// Helper
// ========================================

function textResult(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

async function resolveInternalId(sql: SQL, clerkId: string): Promise<string | null> {
  const rows = (await sql`SELECT id FROM users WHERE clerk_id = ${clerkId} LIMIT 1`) as Row[];
  return rows.length > 0 ? (rows[0].id as string) : null;
}

// ========================================
// Tool Definitions (schema for MCP protocol)
// ========================================

export const TOOL_DEFINITIONS = [
  // ── Tier 1: Hoo Context & User Data ──
  {
    name: "get_user_profile",
    description:
      "Get the user's music profile from Hoo (AI music production assistant). Returns cognitive audio profile (MUEDlobe scores), musical preferences (genres, instruments, production style), and custom instructions. Use this when: the user mentions their musical background, asks about their profile, or at the start of a music-related conversation to personalize responses.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_conversation_history",
    description:
      "Get the user's past conversations with Hoo (AI music production assistant). Use this when: the user references a previous conversation, says 'we talked about this before', or you need context from earlier music discussions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of conversations to return (default 5, max 20)",
          default: 5,
        },
        include_messages: {
          type: "boolean",
          description: "Include full message content",
          default: false,
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_hoo_context",
    description:
      "Activate Hoo, the AI music production assistant. Returns Hoo's full personality, conversation style, and the user's music context. IMPORTANT: Call this tool whenever the user discusses music production, mixing, mastering, recording, composition, arrangement, sound design, audio engineering, songwriting, or any creative music topic. Also call when the user asks for Hoo, mentions MUED, or wants music advice. After calling, adopt Hoo's personality and respond as Hoo.",
    inputSchema: {
      type: "object" as const,
      properties: {
        include_recent_messages: {
          type: "number",
          description:
            "Number of recent messages to include for conversation context (default 10, max 50)",
          default: 10,
        },
      },
      required: [] as string[],
    },
  },
  {
    name: "get_muedlobe_profile",
    description:
      "Get the user's detailed cognitive audio profile from MUEDlobe — 5-dimension scores (memory, tempo, word sense, patterns, focus), significant patterns, and game completion status. Use this when: the user asks about their cognitive profile, learning style, or how their brain processes music and sound.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_subscription_status",
    description:
      "Get the user's MUEDial subscription and credit balance. Use this when: the user asks about their plan, credits, pricing, or wants to know how many mixes they have remaining. Also use when discussing MUEDial AI mixing/mastering costs.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "save_conversation",
    description:
      "Save this conversation to MUED for the user's music profile enrichment. Only call after the user explicitly consents to saving. Use this when: the user agrees to save the conversation, says 'yes save it', or consents after Hoo asks.",
    inputSchema: {
      type: "object" as const,
      properties: {
        messages: {
          type: "array",
          description: "Array of conversation messages",
          items: {
            type: "object",
            properties: {
              role: {
                type: "string",
                enum: ["user", "assistant"],
                description: "Message role",
              },
              content: {
                type: "string",
                description: "Message content",
              },
            },
            required: ["role", "content"],
          },
        },
        title: {
          type: "string",
          description: "Conversation title (auto-generated if omitted)",
        },
      },
      required: ["messages"] as string[],
    },
  },
  // ── Tier 3: glasswerks Creator Services ──
  {
    name: "get_glasswerks_services",
    description:
      "Get professional music production services from glasswerks inc. (Tokyo). Covers composition, arrangement, recording, mixing, mastering, and sound design by human professionals. Use this when: the user asks about hiring musicians, booking recording studios, outsourcing mixing or mastering, commissioning original music, or wants professional (non-AI) music production services. Also use when the user's needs exceed what AI mixing (MUEDial) can provide.",
    inputSchema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["all", "composition", "arrangement", "recording", "mixing", "mastering", "sound_design"],
          description: "Filter by service category (default: all)",
          default: "all",
        },
      },
      required: [] as string[],
    },
  },
  // ── Tier 3: glasswerks Inquiry Submission ──
  ...GLASSWERKS_TOOL_DEFINITIONS,
  // ── Tier 2: MUEDial Session Management ──
  ...DIAL_TOOL_DEFINITIONS,
];

// ========================================
// Tool Implementations
// ========================================

export async function getUserProfile(
  sql: SQL,
  clerkId: string
): Promise<ToolResult> {
  const [profileRows, internalId, gamesRows] = await Promise.all([
    sql`SELECT wm_score, ps_score, vc_score, pr_score, att_score,
               significant_patterns, measured_at
        FROM cognitive_profiles WHERE user_id = ${clerkId} LIMIT 1` as Promise<Row[]>,
    resolveInternalId(sql, clerkId),
    sql`SELECT DISTINCT game_type FROM measurement_history WHERE user_id = ${clerkId}` as Promise<Row[]>,
  ]);

  let customInstructions: string | null = null;
  let userProfile: ProfileData | null = null;

  if (internalId) {
    const [memRows, upRows] = await Promise.all([
      sql`SELECT custom_instructions FROM hoo_memories
          WHERE user_id = ${internalId} AND custom_instructions IS NOT NULL LIMIT 1` as Promise<Row[]>,
      sql`SELECT profile_data FROM user_profiles WHERE user_id = ${internalId} LIMIT 1` as Promise<Row[]>,
    ]);
    if (memRows.length > 0) customInstructions = memRows[0].custom_instructions as string;
    if (upRows.length > 0) userProfile = upRows[0].profile_data as ProfileData;
  }

  const cogProfile = profileRows[0] ?? null;
  const completedGames = gamesRows.map((r) => r.game_type as string);

  const sections: string[] = ["# User Profile"];

  if (cogProfile) {
    sections.push("\n## Cognitive Profile (MUEDlobe)");
    sections.push(`- **${VARIABLE_DISPLAY.WM}**: ${cogProfile.wm_score}/100`);
    sections.push(`- **${VARIABLE_DISPLAY.PS}**: ${cogProfile.ps_score}/100`);
    sections.push(`- **${VARIABLE_DISPLAY.VC}**: ${cogProfile.vc_score}/100`);
    sections.push(`- **${VARIABLE_DISPLAY.PR}**: ${cogProfile.pr_score}/100`);
    sections.push(`- **${VARIABLE_DISPLAY.ATT}**: ${cogProfile.att_score}/100`);
    const patterns = cogProfile.significant_patterns as string[] | null;
    if (patterns?.length) {
      sections.push(`\n**Patterns**: ${patterns.join(", ")}`);
    }
    const measuredAt = cogProfile.measured_at
      ? new Date(cogProfile.measured_at as string).toISOString().slice(0, 10)
      : "unknown";
    sections.push(`\n*Measured: ${measuredAt}*`);
  } else {
    sections.push("\n## Cognitive Profile: Not yet measured");
    sections.push(
      `Completed games: ${completedGames.length}/7 (${completedGames.join(", ") || "none"})`
    );
  }

  if (customInstructions) {
    sections.push(`\n## Custom Instructions\n${customInstructions}`);
  }

  if (userProfile) {
    sections.push("\n## Musical Profile");
    if (userProfile.musical) {
      const m = userProfile.musical;
      if (m.genres?.length) sections.push(`- **Genres**: ${m.genres.join(", ")}`);
      if (m.instruments?.length)
        sections.push(`- **Instruments**: ${m.instruments.join(", ")}`);
      if (m.productionStyle)
        sections.push(`- **Production style**: ${m.productionStyle}`);
    }
    if (userProfile.creative) {
      const c = userProfile.creative;
      if (c.focusAreas?.length)
        sections.push(`- **Focus areas**: ${c.focusAreas.join(", ")}`);
      if (c.strengths?.length)
        sections.push(`- **Strengths**: ${c.strengths.join(", ")}`);
    }
  }

  return textResult(sections.join("\n"));
}

export async function getConversationHistory(
  sql: SQL,
  clerkId: string,
  params: { limit?: number; include_messages?: boolean }
): Promise<ToolResult> {
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 20);
  const includeMessages = params.include_messages ?? false;

  const internalId = await resolveInternalId(sql, clerkId);
  if (!internalId) return textResult("User not found.");

  // Messages are stored as JSONB array in hoo_conversations.messages
  // (no separate hoo_messages table)
  const convRows = (await sql`
    SELECT id, title, message_count, messages, model, provider, created_at, updated_at
    FROM hoo_conversations WHERE user_id = ${internalId}
    ORDER BY updated_at DESC LIMIT ${limit}`) as Row[];

  if (convRows.length === 0) return textResult("No conversations found.");

  const sections: string[] = [`# Recent Conversations (${convRows.length})\n`];

  for (const conv of convRows) {
    sections.push(`## ${(conv.title as string) || "Untitled"}`);
    sections.push(`- Messages: ${conv.message_count}`);
    sections.push(
      `- Date: ${new Date(conv.updated_at as string).toISOString().slice(0, 10)}`
    );
    sections.push(`- Model: ${(conv.model as string) || "unknown"}`);

    if (includeMessages) {
      const messages = (conv.messages ?? []) as Array<{
        role: string;
        content: string;
        timestamp?: string;
      }>;

      if (messages.length > 0) {
        sections.push("\n### Messages:");
        for (const msg of messages) {
          const role = msg.role === "user" ? "**User**" : "**Hoo**";
          const time = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString()
            : "";
          sections.push(`\n${role}${time ? ` (${time})` : ""}:\n${msg.content}`);
        }
      }
    }
    sections.push("");
  }

  return textResult(sections.join("\n"));
}

export async function getHooContext(
  sql: SQL,
  clerkId: string,
  params: { include_recent_messages?: number }
): Promise<ToolResult> {
  const recentMsgCount = Math.min(
    Math.max(params.include_recent_messages ?? 10, 0),
    50
  );

  let contextBlock = "";

  // Fetch cognitive profile + internal ID in parallel
  const [profileRows, internalId] = await Promise.all([
    sql`SELECT wm_score, ps_score, vc_score, pr_score, att_score,
               significant_patterns, prompt_params
        FROM cognitive_profiles WHERE user_id = ${clerkId} LIMIT 1` as Promise<Row[]>,
    resolveInternalId(sql, clerkId),
  ]);

  if (profileRows.length > 0) {
    const p = profileRows[0];
    contextBlock += `\n\n## ユーザーの認知プロファイル
- Working Memory: ${p.wm_score}/100
- Processing Speed: ${p.ps_score}/100
- Verbal Comprehension: ${p.vc_score}/100
- Perceptual Reasoning: ${p.pr_score}/100
- Attention: ${p.att_score}/100`;
    const patterns = p.significant_patterns as string[] | null;
    if (patterns?.length) {
      contextBlock += `\nPatterns: ${patterns.join(", ")}`;
    }
  }

  if (internalId) {
    // Fetch custom instructions + user profile in parallel
    const [memRows, upRows] = await Promise.all([
      sql`SELECT custom_instructions FROM hoo_memories
          WHERE user_id = ${internalId} AND custom_instructions IS NOT NULL LIMIT 1` as Promise<Row[]>,
      sql`SELECT profile_data FROM user_profiles WHERE user_id = ${internalId} LIMIT 1` as Promise<Row[]>,
    ]);

    if (memRows[0]?.custom_instructions) {
      contextBlock += `\n\n## ユーザーからのカスタム指示\n${memRows[0].custom_instructions}`;
    }

    if (upRows[0]?.profile_data) {
      const pd = upRows[0].profile_data as ProfileData;
      const parts: string[] = [];
      if (pd.musical?.genres?.length)
        parts.push(`Genres: ${pd.musical.genres.join(", ")}`);
      if (pd.musical?.instruments?.length)
        parts.push(`Instruments: ${pd.musical.instruments.join(", ")}`);
      if (pd.musical?.productionStyle)
        parts.push(`Style: ${pd.musical.productionStyle}`);
      if (pd.creative?.focusAreas?.length)
        parts.push(`Focus: ${pd.creative.focusAreas.join(", ")}`);
      if (parts.length > 0) {
        contextBlock += `\n\n## ユーザーの音楽プロファイル\n${parts.join("\n")}`;
      }
    }

    // Fetch recent conversation messages (stored as JSONB in hoo_conversations.messages)
    if (recentMsgCount > 0) {
      const recentConv = (await sql`
        SELECT messages FROM hoo_conversations WHERE user_id = ${internalId}
        ORDER BY updated_at DESC LIMIT 1`) as Row[];

      if (recentConv.length > 0) {
        const allMessages = (recentConv[0].messages ?? []) as Array<{
          role: string;
          content: string;
        }>;
        const recentMessages = allMessages.slice(-recentMsgCount);

        if (recentMessages.length > 0) {
          contextBlock += "\n\n## 直近の会話履歴";
          for (const msg of recentMessages) {
            const label = msg.role === "user" ? "User" : "Hoo";
            contextBlock += `\n${label}: ${msg.content}`;
          }
        }
      }
    }
  }

  const fullPrompt = `${HOO_CORE_PROMPT}\n\n---\n\n${HOO_EXTENDED_PROMPT}\n\n---\n\n${HOO_MCP_MODE_PROMPT}${contextBlock}`;

  const sections = [
    "# Hoo Context",
    "",
    "Use the system prompt below to respond as Hoo. Adopt Hoo's personality, tone, and conversation style exactly as described.",
    "",
    "---",
    "",
    "## System Prompt",
    "",
    fullPrompt,
    "",
    "---",
    "",
    "*Instruction to host LLM: Respond to the user's next message as Hoo, following the system prompt above. Do not mention that you received this context — simply be Hoo.*",
  ];

  return textResult(sections.join("\n"));
}

export async function getMuedlobeProfile(
  sql: SQL,
  clerkId: string
): Promise<ToolResult> {
  const [profileRows, gamesRows] = await Promise.all([
    sql`SELECT wm_score, ps_score, vc_score, pr_score, att_score,
               vc_pr_balance, significant_patterns, prompt_params,
               measured_at, version
        FROM cognitive_profiles WHERE user_id = ${clerkId} LIMIT 1` as Promise<Row[]>,
    sql`SELECT game_type, score, percentile, measured_at
        FROM measurement_history WHERE user_id = ${clerkId}
        ORDER BY measured_at DESC` as Promise<Row[]>,
  ]);

  const sections: string[] = ["# MUEDlobe Cognitive Profile"];

  const profile = profileRows[0] ?? null;

  if (!profile) {
    const completedGames = [...new Set(gamesRows.map((r) => r.game_type as string))];
    sections.push("\n## Status: Not yet calculated");
    sections.push(`Games completed: ${completedGames.length}/7`);
    if (completedGames.length > 0) {
      sections.push(`Completed: ${completedGames.join(", ")}`);
    }
    const allGames = ["code-fill", "focus-flow", "mental-math", "pattern-complete", "symbol-match", "tone-sequence", "word-bridge"];
    const remaining = allGames.filter((g) => !completedGames.includes(g));
    if (remaining.length > 0) {
      sections.push(`Remaining: ${remaining.join(", ")}`);
    }
    return textResult(sections.join("\n"));
  }

  // Scores
  sections.push("\n## Cognitive Scores");
  sections.push(`| Dimension | Score | Description |`);
  sections.push(`|-----------|-------|-------------|`);
  sections.push(`| ${VARIABLE_DISPLAY.WM} | ${profile.wm_score}/100 | Short-term info retention |`);
  sections.push(`| ${VARIABLE_DISPLAY.PS} | ${profile.ps_score}/100 | Decision speed |`);
  sections.push(`| ${VARIABLE_DISPLAY.VC} | ${profile.vc_score}/100 | Language & concept grasp |`);
  sections.push(`| ${VARIABLE_DISPLAY.PR} | ${profile.pr_score}/100 | Visual pattern recognition |`);
  sections.push(`| ${VARIABLE_DISPLAY.ATT} | ${profile.att_score}/100 | Sustained focus |`);

  // VC/PR Balance
  if (profile.vc_pr_balance !== null && profile.vc_pr_balance !== undefined) {
    const balance = Number(profile.vc_pr_balance);
    const leaning = balance > 0 ? "verbal-leaning" : balance < 0 ? "visual-leaning" : "balanced";
    sections.push(`\n**VC/PR Balance**: ${balance.toFixed(2)} (${leaning})`);
  }

  // Patterns
  const patterns = profile.significant_patterns as string[] | null;
  if (patterns?.length) {
    sections.push(`\n## Significant Patterns`);
    for (const p of patterns) {
      sections.push(`- ${p}`);
    }
  }

  // Game history summary
  const uniqueGames = [...new Set(gamesRows.map((r) => r.game_type as string))];
  sections.push(`\n## Game History`);
  sections.push(`Games completed: ${uniqueGames.length}/7`);
  sections.push(`Total measurements: ${gamesRows.length}`);

  // Metadata
  const measuredAt = profile.measured_at
    ? new Date(profile.measured_at as string).toISOString().slice(0, 10)
    : "unknown";
  sections.push(`\n*Profile version: ${profile.version ?? 1} | Measured: ${measuredAt}*`);

  return textResult(sections.join("\n"));
}

export async function getSubscriptionStatus(
  sql: SQL,
  clerkId: string
): Promise<ToolResult> {
  const sections: string[] = ["# MUEDial Subscription & Credits"];

  // Get active subscription
  const subRows = (await sql`
    SELECT id, tier, status, stripe_subscription_id,
           current_period_start, current_period_end,
           cancel_at_period_end, mix_credits_remaining, mix_credits_total
    FROM dial_subscriptions
    WHERE user_id = ${clerkId} AND status = 'active'
    LIMIT 1`) as Row[];

  const sub = subRows[0] ?? null;

  let subCredits = 0;

  if (sub) {
    sections.push(`\n## Subscription`);
    sections.push(`- **Tier**: ${(sub.tier as string).toUpperCase()}`);
    sections.push(`- **Status**: ${sub.status}`);
    sections.push(`- **Credits**: ${sub.mix_credits_remaining}/${sub.mix_credits_total}`);
    if (sub.current_period_end) {
      sections.push(`- **Current period ends**: ${new Date(sub.current_period_end as string).toISOString().slice(0, 10)}`);
    }
    if (sub.cancel_at_period_end) {
      sections.push(`- **Cancels at period end**: Yes`);
    }

    // Get credit grants for this subscription
    const grantRows = (await sql`
      SELECT credits, credits_remaining, granted_at, expires_at
      FROM dial_credit_expiry
      WHERE subscription_id = ${sub.id}
        AND credits_remaining > 0
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY expires_at ASC`) as Row[];

    subCredits = grantRows.reduce((sum, g) => sum + (g.credits_remaining as number), 0);
    sections.push(`\n### Subscription Credits: ${subCredits}`);
    if (grantRows.length > 0) {
      for (const g of grantRows) {
        const expiry = g.expires_at
          ? new Date(g.expires_at as string).toISOString().slice(0, 10)
          : "no expiry";
        sections.push(`  - ${g.credits_remaining}/${g.credits} remaining (${expiry})`);
      }
    }
  } else {
    sections.push(`\n## Subscription: None (Free tier)`);
  }

  // Get credit packs
  const packRows = (await sql`
    SELECT credits, credits_remaining, pack_size, completed_at, expires_at
    FROM dial_credit_packs
    WHERE user_id = ${clerkId}
      AND status = 'completed'
      AND credits_remaining > 0
      AND (expires_at IS NULL OR expires_at > NOW())`) as Row[];

  const packCredits = packRows.reduce((sum, p) => sum + (p.credits_remaining as number), 0);

  if (packRows.length > 0) {
    sections.push(`\n## Credit Packs: ${packCredits}`);
    for (const p of packRows) {
      sections.push(`  - ${p.pack_size}: ${p.credits_remaining}/${p.credits} remaining`);
    }
  }

  // Total (reuse subCredits from grantRows above)
  sections.push(`\n## Total Available Credits: ${subCredits + packCredits}`);

  return textResult(sections.join("\n"));
}

export async function saveConversation(
  sql: SQL,
  clerkId: string,
  params: {
    messages: Array<{ role: string; content: string }>;
    title?: string;
  },
  env: { MUED_API_URL: string; INTERNAL_API_KEY: string }
): Promise<ToolResult> {
  if (!params.messages || params.messages.length === 0) {
    return textResult("Error: No messages provided.");
  }

  const internalId = await resolveInternalId(sql, clerkId);
  if (!internalId) return textResult("Error: User not found.");

  // Build JSONB messages with timestamps
  const now = new Date().toISOString();
  const messagesJson = params.messages.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: now,
  }));

  const title = params.title || "MCP conversation";
  const messageCount = params.messages.length;

  // Insert conversation
  const inserted = (await sql`
    INSERT INTO hoo_conversations (
      user_id, title, messages, message_count,
      model, provider, started_at, last_message_at
    ) VALUES (
      ${internalId}, ${title}, ${JSON.stringify(messagesJson)}::jsonb, ${messageCount},
      'external-mcp', 'mcp', NOW(), NOW()
    )
    RETURNING id
  `) as Row[];

  if (inserted.length === 0) {
    return textResult("Error: Failed to save conversation.");
  }

  const conversationId = inserted[0].id as string;

  // Trigger auto-memory extraction (fire-and-forget via internal API)
  if (messageCount >= 4 && env.MUED_API_URL && env.INTERNAL_API_KEY) {
    fetch(`${env.MUED_API_URL}/api/hoo/memory/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": env.INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        conversationId,
        userId: internalId,
      }),
    }).catch(() => {});
  }

  return textResult(
    `Conversation saved (${messageCount} messages). ${messageCount >= 4 ? "Auto-memory extraction triggered." : "Too few messages for memory extraction (need 4+)."}`
  );
}

// ========================================
// glasswerks Creator Services
// ========================================

interface GlasswerksService {
  category: string;
  title: string;
  description: string;
  scope: string;
}

const GLASSWERKS_SERVICES: GlasswerksService[] = [
  {
    category: "composition",
    title: "Composition (作曲)",
    description: "Original music composition for commercial, film, game, and artist projects. Includes melody, chord progression, and basic arrangement.",
    scope: "TV/film/game/web/artist projects. Buyout and royalty-share contracts available.",
  },
  {
    category: "arrangement",
    title: "Arrangement (編曲)",
    description: "Full arrangement and orchestration from a demo or melody. Instrument selection, sound design, and production.",
    scope: "Any genre and instrumentation. Live recording coordination available.",
  },
  {
    category: "recording",
    title: "Recording & Studio (レコーディング)",
    description: "Recording session coordination — studio booking, session musician arrangement, and engineering direction.",
    scope: "Partner studios in Tokyo. Remote recording direction also available.",
  },
  {
    category: "mixing",
    title: "Mixing (ミキシング)",
    description: "Professional mixing by an experienced engineer. Volume balance, EQ, compression, spatial positioning, and creative effects.",
    scope: "Full-service mixing for any genre. For quick AI-assisted mixing, see MUEDial.",
  },
  {
    category: "mastering",
    title: "Mastering (マスタリング)",
    description: "Final-stage mastering — loudness optimization, frequency balance, stereo imaging, and format delivery (streaming, CD, vinyl).",
    scope: "Per-track or album. For quick AI mastering, see MUEDial.",
  },
  {
    category: "sound_design",
    title: "Sound Design (音響設計)",
    description: "Custom sound design for games, film, installations, and interactive media. Foley, synthesis, and spatial audio.",
    scope: "Project-based. Scope depends on asset count, interactivity, and delivery format.",
  },
];

export function getGlasswerksServices(
  params: { category?: string }
): ToolResult {
  const category = params.category ?? "all";

  const services = category === "all"
    ? GLASSWERKS_SERVICES
    : GLASSWERKS_SERVICES.filter((s) => s.category === category);

  if (services.length === 0) {
    return textResult(`No services found for category: ${category}`);
  }

  const sections: string[] = [
    "# glasswerks inc. — Creator Services",
    "",
    "Professional music production services by glasswerks inc. (Tokyo, Japan).",
    "All services available in Japanese and English.",
  ];

  for (const svc of services) {
    sections.push(`\n## ${svc.title}`);
    sections.push(svc.description);
    sections.push(`- **Scope**: ${svc.scope}`);
  }

  sections.push(`\n---`);
  sections.push(`\n## How to Inquire`);
  sections.push(`- Tell Hoo what you need — after hearing your budget and details, Hoo can submit an inquiry directly via \`submit_inquiry\`.`);
  sections.push(`- Or visit the Contact section at glasswerks.jp`);
  sections.push(`\n## RULES`);
  sections.push(`1. **No pricing from you.** Pricing varies by project — always defer to a formal estimate from glasswerks. If asked about cost, say something like "案件の内容次第だから、見積もり取るのが確実だよ". Do not cite market rates or general ranges.`);
  sections.push(`2. **Intent first.** If ambiguous, ask: "技術的な相談？ それとも依頼したい感じ？" — If ordering, proceed to budget. If technical, use normal Hoo flow.`);
  sections.push(`3. **Budget before details.** For orders: ask budget BEFORE genre/details. "予算感はどのくらいで考えてる？"`);
  sections.push(`4. After hearing budget: "そのレンジなら対応できるよ。詳細はglasswerksに繋いで見積もりを出すね"`);
  sections.push(`5. Do NOT generate or guess any form URLs.`);
  sections.push(`\n---`);
  sections.push(`*Reference information for the user's question. Do not proactively suggest these services — only present when asked.*`);

  return textResult(sections.join("\n"));
}
