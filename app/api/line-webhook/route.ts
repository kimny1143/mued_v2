/**
 * LINE Webhook Endpoint
 * POST /api/line-webhook
 *
 * Receives LINE Messaging API webhooks from MUED Threads Bot.
 * Processes kimny's LINE replies to trigger Threads reply via GitHub Actions.
 *
 * Flow:
 *   LINE message → signature verify → parse text → dispatch GitHub Action or reply
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET!;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
const GITHUB_PAT = process.env.GITHUB_PAT!;
const GITHUB_REPO = "kimny1143/threds-api";

// ─── Signature Verification ──────────────────────────────────────────────────

function validateSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(body)
    .digest("base64");
  return crypto.timingSafeEqual(
    Buffer.from(hash, "base64"),
    Buffer.from(signature, "base64"),
  );
}

// ─── LINE Reply ──────────────────────────────────────────────────────────────

async function replyToLine(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
}

// ─── GitHub repository_dispatch ──────────────────────────────────────────────

async function dispatchGitHub(payload: {
  thread_id: string;
  reply_text: string;
  line_user_id: string;
}) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `token ${GITHUB_PAT}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_type: "threads-reply",
        client_payload: payload,
      }),
    },
  );
  return res.ok;
}

// ─── In-memory state (per-instance, sufficient for single-user) ──────────────

interface PendingReply {
  threadId: string;
  candidates: string[];
  timestamp: number;
}

let pendingReply: PendingReply | null = null;

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");

  if (!signature || !validateSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events ?? [];

  // LINE verification request (empty events)
  if (events.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Log user IDs for debugging
  for (const ev of events) {
    if (ev.source?.userId) {
      console.log(`[LINE] userId=${ev.source.userId} type=${ev.type}`);
    }
  }

  for (const event of events) {
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const text = (event.message.text as string).trim();
    const replyToken = event.replyToken as string;
    const userId = event.source?.userId as string;

    // ── "0" → Skip ────────────────────────────────────────────────────────
    if (text === "0") {
      pendingReply = null;
      await replyToLine(replyToken, "スキップしました");
      continue;
    }

    // ── Number (1-9) → Execute reply with candidate ───────────────────────
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      if (!pendingReply) {
        await replyToLine(replyToken, "リプライ候補がありません。通知を待ってください。");
        continue;
      }

      const candidate = pendingReply.candidates[num - 1];
      if (!candidate) {
        await replyToLine(
          replyToken,
          `候補 ${num} は存在しません（${pendingReply.candidates.length}件中）`,
        );
        continue;
      }

      const ok = await dispatchGitHub({
        thread_id: pendingReply.threadId,
        reply_text: candidate,
        line_user_id: userId,
      });

      if (ok) {
        await replyToLine(replyToken, `リプライ送信中...\n「${candidate.slice(0, 50)}${candidate.length > 50 ? "..." : ""}」`);
      } else {
        await replyToLine(replyToken, "GitHub Actions の起動に失敗しました");
      }

      pendingReply = null;
      continue;
    }

    // ── Threads URL → Extract media ID ────────────────────────────────────
    const threadsUrlMatch = text.match(
      /threads\.net\/@[\w.]+\/post\/([\w-]+)/,
    );
    if (threadsUrlMatch) {
      const mediaId = threadsUrlMatch[1];
      pendingReply = {
        threadId: mediaId,
        candidates: [],
        timestamp: Date.now(),
      };
      await replyToLine(
        replyToken,
        `Thread ID: ${mediaId}\nリプライ候補を受け付けます。`,
      );
      continue;
    }

    // ── Free text while pending → Store as candidate ──────────────────────
    if (pendingReply && text.length > 0) {
      pendingReply.candidates.push(text);
      await replyToLine(
        replyToken,
        `候補 ${pendingReply.candidates.length} 登録:\n「${text.slice(0, 50)}${text.length > 50 ? "..." : ""}」\n\n数字で送信 / 0でスキップ`,
      );
      continue;
    }

    // ── Otherwise → Ignore silently ──────────────────────────────────────
  }

  return NextResponse.json({ ok: true });
}
