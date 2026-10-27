import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { addContactIfAbsent } from "@/lib/plugins/audience";
import { alertAudienceAddFailed } from "@/lib/plugins/audience-alert";
import { z } from "zod";
import { rateLimit, checkRateLimit } from "@/lib/middleware/rate-limit";
import { MUEDSP_AUDIENCE_ID, isHoneypotTripped } from "@/lib/plugins/registry";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_DOWNLOAD_URL, MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION } from "./config";
import { masterchainWindowsBuild } from "@/lib/plugins/windows-beta";
import { isDisposableEmail } from "./key-issuance";
import { recordDemoSignup, type DemoProductKey } from "./demo-signups";

/**
 * What the demo entrance needs to know about the product it hands out (C9 PR-C). The flow is the same for every
 * paid product — email → the list → the public installer (no key = demo) → one receipt — so only these differ.
 * ★Getters, not copied values: the flags and URLs are read when a request arrives, as before.
 * ★Only masterchain has one today. Another product gets its own when its receipt mail exists, and its route
 *   answers 404 until its own DEMO_LIVE is on.
 */
export interface DemoProduct {
  /** Log / alert tag and the audience-add source, e.g. "masterchain/demo". */
  readonly tag: string;
  /** The product_key its sign-ups are recorded under in demo_signups (0065). */
  readonly key: DemoProductKey;
  /** The page its demo form is on, recorded as demo_signups.source. */
  readonly source: string;
  readonly live: boolean;
  readonly downloadUrl: string;
  /** The Windows build's URL, or null while that product has none. */
  readonly windowsUrl: string | null;
  /** ★marketingOptIn = the news checkbox: only then does the receipt carry news and the unsubscribe link. */
  sendReceipt(email: string, locale: "ja" | "en", marketingOptIn: boolean): Promise<{ success: boolean; error?: string }>;
}

export const MASTERCHAIN_DEMO: DemoProduct = {
  tag: "masterchain/demo",
  key: "masterchain",
  source: "muedsp_lp",
  get live() { return MASTERCHAIN_DEMO_LIVE; },
  get downloadUrl() { return MASTERCHAIN_DOWNLOAD_URL; },
  // ★windowsDownloadUrl only once masterchain for Windows ships; until then the response is exactly as before.
  get windowsUrl() { return masterchainWindowsBuild(MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION)?.url ?? null; },
  sendReceipt: (email, locale, marketingOptIn) => emailService.sendMasterchainDemoDownload({ email }, { locale, marketingOptIn }),
};

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  locale: z.enum(["ja", "en"]).default("en"),
  // The form's news checkbox (default off — kimny 2026-10-28 「B」). Only `true` is consent.
  marketingOptIn: z.boolean().default(false),
  website: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
});

/** true = the person is on the list. ★false is logged by the caller AND alerted (same as the free three). */
async function addDemoContact(email: string, tag: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  // ★Lookup first, never touching an existing (possibly unsubscribed) contact — see addContactIfAbsent.
  return addContactIfAbsent(new Resend(process.env.RESEND_API_KEY), MUEDSP_AUDIENCE_ID, email, tag);
}

export async function handleMasterchainDemo(request: NextRequest) {
  return handlePaidDemo(request, MASTERCHAIN_DEMO);
}

export async function handlePaidDemo(request: NextRequest, product: DemoProduct) {
  if (!product.live) return NextResponse.json({ error: "not_available" }, { status: 404 });
  const ipLimit = await rateLimit(request, "research");
  if (ipLimit) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const { downloadUrl, windowsUrl } = product;
  const success = () =>
    NextResponse.json(windowsUrl ? { ok: true, downloadUrl, windowsDownloadUrl: windowsUrl } : { ok: true, downloadUrl });
  const { email, locale, website, marketingOptIn } = parsed.data;
  if (isHoneypotTripped(website)) {
    // warn, not info: info is a no-op in production, and a real user caught here must leave a trace.
    logger.warn(`[${product.tag}] honeypot tripped — demo link not sent`);
    return success();
  }
  if (isDisposableEmail(email)) return NextResponse.json({ error: "disposable_email" }, { status: 422 });

  const emailLimit = await checkRateLimit("plugin-email", `plugin-email:${email}`).catch(() => null);
  if (emailLimit && !emailLimit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // On the list only with the news checkbox ticked; without it, the receipt is the only mail.
  const captured = marketingOptIn === true ? await addDemoContact(email, product.tag) : false;
  // ★A subscriber who did not reach the list is a lost lead AND a promise we did not keep — alert
  //   the operator, like the free three (lib/plugins/subscribe-handler.ts). Configured-only: without the
  //   Resend key there is no list to reach, which is not a failure worth waking anyone for.
  //   ★Every failure is logged here; the operator email is capped at one a day (lib/plugins/audience-alert.ts).
  if (marketingOptIn === true && !captured && process.env.RESEND_API_KEY) {
    logger.error(`[${product.tag}] audience add failed — lead not captured to Resend`);
    void alertAudienceAddFailed(product.tag);
  }
  // The browser receives the download directly; the receipt is best-effort, never an entitlement.
  try {
    const result = await product.sendReceipt(email, locale, marketingOptIn);
    if (!result.success) logger.error(`[${product.tag}] receipt failed`, { error: result.error });
  } catch (error) {
    logger.error(`[${product.tag}] receipt threw`, { error: String(error) });
  }
  // ★Our own record of the sign-up (0065) — the Resend list alone is not one once it is full. After the receipt,
  //   like the free three's entitlement: never affects the response (recordDemoSignup never throws).
  const utm = parsed.data;
  const firstTouch =
    utm.utm_source || utm.utm_medium || utm.utm_campaign || utm.utm_content || utm.utm_term
      ? {
          utmSource: utm.utm_source ?? null,
          utmMedium: utm.utm_medium ?? null,
          utmCampaign: utm.utm_campaign ?? null,
          utmContent: utm.utm_content ?? null,
          utmTerm: utm.utm_term ?? null,
        }
      : null;
  await recordDemoSignup({
    productKey: product.key, source: product.source, email, locale, firstTouch, newsConsent: marketingOptIn, audienceAdded: captured,
  }).catch(() => false);
  return success();
}
