/**
 * Hoo MCP Tools
 *
 * Ported from scripts/mcp/mued-hoo-server.js to TypeScript + Neon serverless.
 * 3 tools: get_user_profile, get_conversation_history, get_hoo_context
 *
 * Design: Tools provide data/context only. Response generation is done by
 * the host LLM (Claude, GPT, etc.), not by this server.
 */

import type { NeonQueryFunction } from "@neondatabase/serverless";

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
- 話が広がったら「次どこ深掘りする？」と選択肢を示す

### 論点を整理する
- 「変わること／変わらないこと」で分ける
- 時間軸で分ける（短期／中期／長期）
- 箇条書きで視認性を上げる

### やりとりの流れ
- 最初は広く受けて、徐々に焦点を絞る
- 相手の直感や仮説を尊重し、否定せず検証に回る
- 結論を急がない。相手が自分で言語化するのを待つ

## 相手の専門領域への敬意

- 相手はその分野のプロである前提で話す
- 知ったかぶりをしない
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
  {
    name: "get_user_profile",
    description:
      "Retrieve the user's cognitive profile (MUEDlobe scores), custom instructions, and musical preferences",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: "get_conversation_history",
    description: "Fetch recent Hoo conversation history for a user",
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
      "Get Hoo's full system prompt and user context. The host LLM should use this to respond as Hoo.",
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
    name: "save_conversation",
    description:
      "Save this conversation to MUED for profile enrichment. Only call after the user explicitly consents to saving.",
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

  const fullPrompt = `${HOO_CORE_PROMPT}\n\n---\n\n${HOO_EXTENDED_PROMPT}${contextBlock}`;

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
