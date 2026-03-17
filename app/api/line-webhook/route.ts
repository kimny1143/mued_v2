/**
 * LINE Webhook Endpoint
 * POST /api/line-webhook
 *
 * Receives LINE Messaging API webhooks from MUED Threads Bot.
 * Processes kimny's LINE replies to trigger Threads reply via GitHub Actions.
 *
 * Flow:
 *   LINE message → signature verify → parse text:
 *     - Threads URL → store context
 *     - Free text (with context) → save-pending-reply dispatch
 *     - Number (1-9) → threads-reply dispatch (v1 compat)
 *     - "0" → skip
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

async function dispatchGitHub(eventType: string, payload: Record<string, string>) {
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
        event_type: eventType,
        client_payload: payload,
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(`[GitHub dispatch] ${res.status} ${eventType}: ${body}`);
  }
  return res.ok;
}

// ─── In-memory state (per-instance, sufficient for single-user) ──────────────

interface PendingContext {
  threadId: string;
  threadUrl: string;
  threadAuthor: string;
  threadText: string;
  candidates: string[];
  timestamp: number;
}

let pending: PendingContext | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THREADS_URL_RE = /threads\.(?:net|com)\/(@[\w.]+)\/post\/([\w-]+)/;

function parseThreadsUrl(text: string) {
  const m = text.match(THREADS_URL_RE);
  if (!m) return null;
  return { author: m[1], threadId: m[2], url: text.trim() };
}

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

  for (const event of events) {
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const text = (event.message.text as string).trim();
    const replyToken = event.replyToken as string;
    const userId = event.source?.userId as string;

    console.log(`[LINE] userId=${userId} text="${text.slice(0, 50)}"`);

    // ── "OK" → Approve pending Threads post ───────────────────────────
    if (text.toUpperCase() === "OK") {
      const ok = await dispatchGitHub("approve-post", {
        action: "approve",
        line_user_id: userId,
        timestamp: new Date().toISOString(),
      });
      await replyToLine(replyToken, ok ? "投稿を承認しました" : "承認の送信に失敗しました");
      continue;
    }

    // ── "NG" → Reject and request alternative ───────────────────────────
    if (text.toUpperCase() === "NG") {
      const ok = await dispatchGitHub("approve-post", {
        action: "reject",
        line_user_id: userId,
        timestamp: new Date().toISOString(),
      });
      await replyToLine(replyToken, ok ? "別案を生成中..." : "却下の送信に失敗しました");
      continue;
    }

    // ── "0" → Skip & reset ──────────────────────────────────────────────
    if (text === "0") {
      pending = null;
      await replyToLine(replyToken, "スキップしました");
      continue;
    }

    // ── Number (1-9) → v1 compat: execute reply with candidate ──────────
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      if (!pending) {
        await replyToLine(replyToken, "リプライ候補がありません。通知を待ってください。");
        continue;
      }

      const candidate = pending.candidates[num - 1];
      if (!candidate) {
        await replyToLine(
          replyToken,
          `候補 ${num} は存在しません（${pending.candidates.length}件中）`,
        );
        continue;
      }

      const ok = await dispatchGitHub("threads-reply", {
        thread_id: pending.threadId,
        reply_text: candidate,
        line_user_id: userId,
      });

      if (ok) {
        await replyToLine(replyToken, `リプライ送信中...\n「${candidate.slice(0, 50)}${candidate.length > 50 ? "..." : ""}」`);
      } else {
        await replyToLine(replyToken, "GitHub Actions の起動に失敗しました");
      }

      pending = null;
      continue;
    }

    // ── Threads URL → Store context ─────────────────────────────────────
    const parsed = parseThreadsUrl(text);
    if (parsed) {
      pending = {
        threadId: parsed.threadId,
        threadUrl: parsed.url,
        threadAuthor: parsed.author,
        threadText: "",
        candidates: [],
        timestamp: Date.now(),
      };
      await replyToLine(
        replyToken,
        `投稿URLを受け取りました（${parsed.author}）\nリプライ草案を送ってください。`,
      );
      continue;
    }

    // ── Free text with pending context → Save draft via dispatch ─────────
    if (pending && text.length > 0) {
      pending.candidates.push(text);

      const ok = await dispatchGitHub("save-pending-reply", {
        thread_id: pending.threadId,
        thread_url: pending.threadUrl,
        thread_text: pending.threadText,
        thread_author: pending.threadAuthor,
        reply_draft: text,
        line_user_id: userId,
        timestamp: new Date().toISOString(),
      });

      if (ok) {
        await replyToLine(
          replyToken,
          `草案を保存しました（${pending.candidates.length}件目）\n「${text.slice(0, 50)}${text.length > 50 ? "..." : ""}」\n\n続けて草案を送る / 別のURL / 0でリセット`,
        );
      } else {
        await replyToLine(replyToken, "草案の保存に失敗しました");
      }
      continue;
    }

    // ── Free text without context → Auto-fetch from reply-candidates.json ─
    if (!pending && text.length > 0) {
      try {
        const ghRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/reply-candidates.json`,
          {
            headers: {
              Authorization: `token ${GITHUB_PAT}`,
              Accept: "application/vnd.github.v3+json",
            },
          },
        );
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          const content = Buffer.from(ghData.content, "base64").toString("utf8");
          const candidates = JSON.parse(content);

          if (Array.isArray(candidates) && candidates.length > 0) {
            const latest = candidates[0];
            const parsedUrl = parseThreadsUrl(latest.url ?? "");

            const threadText = (latest.thread_context ? latest.thread_context + "\n\n---\n" : "") + (latest.text || "");
            pending = {
              threadId: parsedUrl?.threadId || "",
              threadUrl: latest.url || "",
              threadAuthor: latest.author || parsedUrl?.author || "",
              threadText,
              candidates: [text],
              timestamp: Date.now(),
            };

            const ok = await dispatchGitHub("save-pending-reply", {
              thread_id: pending.threadId,
              thread_url: pending.threadUrl,
              thread_text: pending.threadText,
              thread_author: pending.threadAuthor,
              reply_draft: text,
              line_user_id: userId,
              timestamp: new Date().toISOString(),
            });

            if (ok) {
              await replyToLine(
                replyToken,
                `草案を保存しました\n${pending.threadAuthor} への返信\n「${text.slice(0, 50)}${text.length > 50 ? "..." : ""}」`,
              );
            } else {
              await replyToLine(replyToken, "草案の保存に失敗しました");
            }
            continue;
          }
        }
      } catch (e) {
        console.error("[Webhook] Failed to fetch candidates:", e);
      }
    }

    // ── Otherwise → Ignore silently ──────────────────────────────────────
  }

  return NextResponse.json({ ok: true });
}
