#!/usr/bin/env node
/**
 * Hoo MCP Server
 *
 * Provides 3 tools for interacting with Hoo (MUED's owl AI companion):
 * - get_user_profile: Retrieve user's cognitive profile + preferences
 * - get_conversation_history: Fetch recent Hoo conversations
 * - chat_with_hoo: Send a message and get Hoo's response
 *
 * Usage:
 *   node scripts/mcp/mued-hoo-server.js
 *
 * Environment:
 *   DATABASE_URL - Neon PostgreSQL connection string
 *   OPENAI_API_KEY - OpenAI API key for Hoo responses
 */

const { z } = require("zod");
const { createMcpServer, startMcpServer, createTextResponse } = require("./mcp-utils");
const { Client } = require("pg");

// ========================================
// Database
// ========================================

let dbClient = null;

async function getDb() {
  if (dbClient) return dbClient;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  dbClient = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await dbClient.connect();
  return dbClient;
}

// ========================================
// Hoo System Prompt (embedded, mirrors lib/ai/prompts/hoo.ts)
// ========================================

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
- 相手の経験則や直感を軽視しない`;

// ========================================
// Cognitive Variable Display Names
// ========================================

const VARIABLE_DISPLAY = {
  WM: "Memory (Working Memory)",
  PS: "Tempo (Processing Speed)",
  VC: "Word Sense (Verbal Comprehension)",
  PR: "Patterns (Perceptual Reasoning)",
  ATT: "Focus (Attention)",
};

// ========================================
// MCP Server
// ========================================

const server = createMcpServer("mued-hoo", "1.0.0");

// --- Tool 1: get_user_profile ---
server.tool(
  "get_user_profile",
  "Retrieve the user's cognitive profile (MUEDlobe scores), custom instructions, and musical preferences",
  {
    clerk_id: z.string().describe("The user's Clerk ID (e.g., user_xxx)"),
  },
  async ({ clerk_id }) => {
    const db = await getDb();

    // Fetch cognitive profile
    const profileResult = await db.query(
      `SELECT wm_score, ps_score, vc_score, pr_score, att_score,
              significant_patterns, prompt_params, measured_at, version
       FROM cognitive_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [clerk_id]
    );

    // Fetch user from users table to get internal UUID
    const userResult = await db.query(
      `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
      [clerk_id]
    );

    let customInstructions = null;
    let userProfile = null;

    if (userResult.rows.length > 0) {
      const internalId = userResult.rows[0].id;

      // Fetch custom instructions
      const memResult = await db.query(
        `SELECT custom_instructions FROM hoo_memories
         WHERE user_id = $1 AND custom_instructions IS NOT NULL
         LIMIT 1`,
        [internalId]
      );
      if (memResult.rows.length > 0) {
        customInstructions = memResult.rows[0].custom_instructions;
      }

      // Fetch user profile (musical preferences etc.)
      const upResult = await db.query(
        `SELECT profile_data FROM user_profiles
         WHERE user_id = $1
         LIMIT 1`,
        [internalId]
      );
      if (upResult.rows.length > 0) {
        userProfile = upResult.rows[0].profile_data;
      }
    }

    // Fetch completed games
    const gamesResult = await db.query(
      `SELECT DISTINCT game_type FROM measurement_history
       WHERE user_id = $1`,
      [clerk_id]
    );

    const cogProfile = profileResult.rows[0] || null;
    const completedGames = gamesResult.rows.map((r) => r.game_type);

    // Build response
    const sections = [];

    sections.push("# User Profile");

    if (cogProfile) {
      sections.push("\n## Cognitive Profile (MUEDlobe)");
      sections.push(`- **${VARIABLE_DISPLAY.WM}**: ${cogProfile.wm_score}/100`);
      sections.push(`- **${VARIABLE_DISPLAY.PS}**: ${cogProfile.ps_score}/100`);
      sections.push(`- **${VARIABLE_DISPLAY.VC}**: ${cogProfile.vc_score}/100`);
      sections.push(`- **${VARIABLE_DISPLAY.PR}**: ${cogProfile.pr_score}/100`);
      sections.push(`- **${VARIABLE_DISPLAY.ATT}**: ${cogProfile.att_score}/100`);
      if (cogProfile.significant_patterns && cogProfile.significant_patterns.length > 0) {
        sections.push(`\n**Patterns**: ${cogProfile.significant_patterns.join(", ")}`);
      }
      sections.push(`\n*Measured: ${cogProfile.measured_at ? new Date(cogProfile.measured_at).toISOString().slice(0, 10) : "unknown"}*`);
    } else {
      sections.push("\n## Cognitive Profile: Not yet measured");
      sections.push(`Completed games: ${completedGames.length}/7 (${completedGames.join(", ") || "none"})`);
    }

    if (customInstructions) {
      sections.push(`\n## Custom Instructions\n${customInstructions}`);
    }

    if (userProfile) {
      sections.push("\n## Musical Profile");
      if (userProfile.musical) {
        const m = userProfile.musical;
        if (m.genres?.length) sections.push(`- **Genres**: ${m.genres.join(", ")}`);
        if (m.instruments?.length) sections.push(`- **Instruments**: ${m.instruments.join(", ")}`);
        if (m.productionStyle) sections.push(`- **Production style**: ${m.productionStyle}`);
      }
      if (userProfile.creative) {
        const c = userProfile.creative;
        if (c.focusAreas?.length) sections.push(`- **Focus areas**: ${c.focusAreas.join(", ")}`);
        if (c.strengths?.length) sections.push(`- **Strengths**: ${c.strengths.join(", ")}`);
      }
    }

    return createTextResponse(sections.join("\n"));
  }
);

// --- Tool 2: get_conversation_history ---
server.tool(
  "get_conversation_history",
  "Fetch recent Hoo conversation history for a user",
  {
    clerk_id: z.string().describe("The user's Clerk ID"),
    limit: z.number().min(1).max(20).default(5).describe("Number of conversations to return (default 5)"),
    include_messages: z.boolean().default(false).describe("Include full message content"),
  },
  async ({ clerk_id, limit, include_messages }) => {
    const db = await getDb();

    // Get internal UUID
    const userResult = await db.query(
      `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
      [clerk_id]
    );

    if (userResult.rows.length === 0) {
      return createTextResponse("User not found.");
    }

    const internalId = userResult.rows[0].id;

    // Fetch conversations
    const convResult = await db.query(
      `SELECT id, title, message_count, model, provider, created_at, updated_at
       FROM hoo_conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT $2`,
      [internalId, limit]
    );

    if (convResult.rows.length === 0) {
      return createTextResponse("No conversations found.");
    }

    const sections = [`# Recent Conversations (${convResult.rows.length})\n`];

    for (const conv of convResult.rows) {
      sections.push(`## ${conv.title || "Untitled"}`);
      sections.push(`- Messages: ${conv.message_count}`);
      sections.push(`- Date: ${new Date(conv.updated_at).toISOString().slice(0, 10)}`);
      sections.push(`- Model: ${conv.model || "unknown"}`);

      if (include_messages) {
        const msgResult = await db.query(
          `SELECT role, content, created_at
           FROM hoo_messages
           WHERE conversation_id = $1
           ORDER BY created_at ASC`,
          [conv.id]
        );

        if (msgResult.rows.length > 0) {
          sections.push("\n### Messages:");
          for (const msg of msgResult.rows) {
            const role = msg.role === "user" ? "**User**" : "**Hoo**";
            const time = new Date(msg.created_at).toLocaleTimeString();
            sections.push(`\n${role} (${time}):\n${msg.content}`);
          }
        }
      }

      sections.push("");
    }

    return createTextResponse(sections.join("\n"));
  }
);

// --- Tool 3: chat_with_hoo ---
server.tool(
  "chat_with_hoo",
  "Send a message to Hoo and get a response. Hoo is an owl AI companion for music creators.",
  {
    clerk_id: z.string().describe("The user's Clerk ID"),
    message: z.string().min(1).describe("The message to send to Hoo"),
    conversation_history: z.array(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })).default([]).describe("Previous messages in the conversation for context"),
  },
  async ({ clerk_id, message, conversation_history }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return createTextResponse("Error: OPENAI_API_KEY not set.");
    }

    const db = await getDb();

    // Build context from user profile
    let contextBlock = "";

    // Fetch cognitive profile
    const profileResult = await db.query(
      `SELECT wm_score, ps_score, vc_score, pr_score, att_score,
              significant_patterns, prompt_params
       FROM cognitive_profiles WHERE user_id = $1 LIMIT 1`,
      [clerk_id]
    );

    if (profileResult.rows.length > 0) {
      const p = profileResult.rows[0];
      contextBlock += `\n\n## ユーザーの認知プロファイル
- Working Memory: ${p.wm_score}/100
- Processing Speed: ${p.ps_score}/100
- Verbal Comprehension: ${p.vc_score}/100
- Perceptual Reasoning: ${p.pr_score}/100
- Attention: ${p.att_score}/100`;
      if (p.significant_patterns?.length) {
        contextBlock += `\nPatterns: ${p.significant_patterns.join(", ")}`;
      }
    }

    // Fetch custom instructions
    const userResult = await db.query(
      `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
      [clerk_id]
    );

    if (userResult.rows.length > 0) {
      const internalId = userResult.rows[0].id;
      const memResult = await db.query(
        `SELECT custom_instructions FROM hoo_memories
         WHERE user_id = $1 AND custom_instructions IS NOT NULL
         LIMIT 1`,
        [internalId]
      );
      if (memResult.rows[0]?.custom_instructions) {
        contextBlock += `\n\n## ユーザーからのカスタム指示\n${memResult.rows[0].custom_instructions}`;
      }
    }

    // Build messages array
    const systemPrompt = `${HOO_CORE_PROMPT}\n\n---\n\n${HOO_EXTENDED_PROMPT}${contextBlock}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation_history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return createTextResponse(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const hooResponse = data.choices?.[0]?.message?.content || "...";

    return createTextResponse(`**Hoo**: ${hooResponse}`);
  }
);

// ========================================
// Start Server
// ========================================

startMcpServer(server);
