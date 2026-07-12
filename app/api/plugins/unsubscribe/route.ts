//
// Plugin free-download list unsubscribe — one-click List-Unsubscribe (RFC 8058) + human withdrawal.
//
//   POST /api/plugins/unsubscribe?plugin=muedlim&email=<email>&t=<token>
//        → Gmail/Apple one-click (body: List-Unsubscribe=One-Click). Verify token → mark the Resend
//          contact unsubscribed → 200 (RFC 8058: must not require further interaction).
//   GET  /api/plugins/unsubscribe?plugin=muedlim&email=<email>&t=<token>&locale=ja
//        → human clicks the footer link. Same verify + unsubscribe → localized HTML confirmation.
//
// Public (no auth): the signed token IS the capability (lib/plugins/unsubscribe-token). Best-effort
// contact update — a Resend hiccup still returns 200 on a valid token so the sender doesn't retry-loop.
import { NextRequest } from "next/server";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";
import { unsubscribePluginContact } from "@/lib/plugins/audience";
import { verifyUnsubscribeToken } from "@/lib/plugins/unsubscribe-token";
import { logger } from "@/lib/utils/logger";

function isPluginKey(v: string | null | undefined): v is PluginKey {
  return !!v && Object.prototype.hasOwnProperty.call(PLUGIN_DIST, v);
}

/** Verify the signed link and (best-effort) mark the contact unsubscribed. Returns whether the token was valid. */
async function processUnsubscribe(req: NextRequest): Promise<{ ok: boolean; plugin?: PluginKey }> {
  const url = new URL(req.url);
  let plugin: string | null = url.searchParams.get("plugin");
  let email: string | null = url.searchParams.get("email");
  let token: string | null = url.searchParams.get("t");

  // Gmail one-click POSTs application/x-www-form-urlencoded; our params may ride on the query or body.
  if (req.method === "POST") {
    try {
      const form = await req.formData();
      plugin = (form.get("plugin") as string) || plugin;
      email = (form.get("email") as string) || email;
      token = (form.get("t") as string) || token;
    } catch {
      // no form body — query params only
    }
  }

  if (!isPluginKey(plugin) || !email || !verifyUnsubscribeToken(plugin, email, token)) {
    return { ok: false };
  }

  await unsubscribePluginContact(plugin, email).catch((err) =>
    logger.error("[plugins/unsubscribe] contact update failed", { plugin, error: String(err) }),
  );
  return { ok: true, plugin };
}

export async function POST(req: NextRequest) {
  const { ok } = await processUnsubscribe(req);
  // RFC 8058: 200 on a valid one-click so the mail client doesn't keep retrying.
  return new Response(null, { status: ok ? 200 : 400 });
}

export async function GET(req: NextRequest) {
  const { ok } = await processUnsubscribe(req);
  const isEn = new URL(req.url).searchParams.get("locale") === "en";

  const { title, body } = ok
    ? isEn
      ? { title: "Unsubscribed", body: "You've been removed from this list — you won't receive these emails anymore." }
      : { title: "配信を解除しました", body: "このリストから解除しました。今後、この配信は届きません。" }
    : isEn
      ? { title: "Invalid link", body: "This unsubscribe link is invalid or expired. Email support@mued.jp and we'll remove you." }
      : { title: "リンクが無効です", body: "この配信解除リンクは無効または期限切れです。support@mued.jp までご連絡ください。" };

  const html =
    `<!doctype html><html lang="${isEn ? "en" : "ja"}"><head>` +
    `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<meta name="robots" content="noindex"><title>${title}</title>` +
    `<style>body{margin:0;background:#0a0a0a;color:#e5e5e5;font-family:system-ui,-apple-system,sans-serif;` +
    `display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}` +
    `.card{max-width:420px;text-align:center}h1{color:#f5a524;font-size:20px;margin:0 0 12px}` +
    `p{color:#a3a3a3;font-size:14px;line-height:1.6;margin:0}</style></head>` +
    `<body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;

  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
