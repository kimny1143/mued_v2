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

/**
 * ★THREE OUTCOMES, NOT TWO — and the third is the one this page used to lie about.
 *
 *   "invalid"   the token is bad or expired. Nothing was attempted.
 *   "done"      the token was good AND Resend accepted the suppression.
 *   ★"failed"   the token was good and ★Resend REJECTED the suppression.
 *
 * ★WHY THE THIRD EXISTS (CCO review of #1002). `unsubscribePluginContact` was fixed in that PR to
 * return false when the API rejects — but this route discarded the value and returned `ok: true`
 * unconditionally, so the page still rendered 「配信を解除しました。今後、この配信は届きません。」
 * ★The library got honest and the screen did not: the person is told they are off a list they are
 * still on, which is the exact sentence that PR's own comment says must never be shown.
 *
 * ★The `.catch()` that used to sit here never fired: the Resend SDK resolves `{data, error}` instead
 * of throwing, so it was catching a case that does not occur while the real failure walked past it.
 *
 * ★POST STAYS 200 on a valid token (RFC 8058). A rejection is not something a retry fixes, and a
 * non-2xx makes one-click clients retry and render their own errors — the failure would get louder
 * without getting closer to the person's intent. ★What changes is that GET stops claiming success,
 * and the rejection is logged at error level so it is visible on our side.
 *
 * ★NOT DONE HERE: recording the withdrawal on our own side so the send path honours it even when
 * Resend refuses (CCO's option ③). ★Measured — there is no local suppression column in the schema
 * and no server-side recipient selection to consult one; Resend's audience IS the suppression list
 * today. ★That is a real change to how sending works, not a fix to this route, so it is not smuggled
 * in here.
 */
type UnsubscribeOutcome = "invalid" | "done" | "failed";

async function processUnsubscribe(
  req: NextRequest,
): Promise<{ outcome: UnsubscribeOutcome; plugin?: PluginKey }> {
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
    return { outcome: "invalid" };
  }

  // ★The return value is the point. A `.catch()` alone cannot see this failure — the SDK resolves
  //   `{data, error}` rather than throwing (see lib/plugins/audience.ts). The catch is kept for a
  //   genuine transport throw, and both paths land on "failed" rather than on silence.
  const suppressed = await unsubscribePluginContact(plugin, email).catch((err) => {
    logger.error("[plugins/unsubscribe] contact update threw", { plugin, error: String(err) });
    return false;
  });

  if (!suppressed) {
    // ★error, not warn: the person asked to stop receiving mail and we did not manage it. Nothing
    //   downstream retries this, so this log is the only place it can be caught.
    logger.error("[plugins/unsubscribe] suppression NOT applied — the person is still subscribed", {
      plugin,
    });
    return { outcome: "failed", plugin };
  }
  return { outcome: "done", plugin };
}

export async function POST(req: NextRequest) {
  const { outcome } = await processUnsubscribe(req);
  // ★RFC 8058: 200 on a VALID one-click so the mail client doesn't keep retrying — including when the
  //   suppression was rejected, because retrying does not fix a rejection and a non-2xx only makes
  //   the client noisy. Only a bad token is a 400.
  return new Response(null, { status: outcome === "invalid" ? 400 : 200 });
}

export async function GET(req: NextRequest) {
  const { outcome } = await processUnsubscribe(req);
  const isEn = new URL(req.url).searchParams.get("locale") === "en";

  // ★Three outcomes, three messages. ★The "failed" copy must NOT contain any form of "you won't
  //   receive these anymore" — that sentence is the defect. It says what actually happened and gives
  //   the one route that still works (a human), which is the same fallback the invalid-link case uses.
  const { title, body } =
    outcome === "done"
      ? isEn
        ? { title: "Unsubscribed", body: "You've been removed from this list — you won't receive these emails anymore." }
        : { title: "配信を解除しました", body: "このリストから解除しました。今後、この配信は届きません。" }
      : outcome === "failed"
        ? isEn
          ? {
              title: "We couldn't complete it",
              body: "Your link was valid, but the unsubscribe did not go through on our side — so you may still receive these emails. Email support@mued.jp and we'll remove you by hand.",
            }
          : {
              title: "解除できませんでした",
              body: "リンクは有効でしたが、こちら側で解除の処理が完了しませんでした。このままだと配信が届く可能性があります。support@mued.jp までご連絡ください。手作業で解除します。",
            }
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
    // ★A rejected suppression is 200: the page rendered, and its content is the honest report. A 400
    //   would say "your link was bad", which is a different (and false) statement — the link worked.
    //   ★Only an invalid token is 400, exactly as before.
    status: outcome === "invalid" ? 400 : 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
