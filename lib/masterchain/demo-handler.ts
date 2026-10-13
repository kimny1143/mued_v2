import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { addContactIfAbsent } from "@/lib/plugins/audience";
import { z } from "zod";
import { rateLimit, checkRateLimit } from "@/lib/middleware/rate-limit";
import { MUEDSP_AUDIENCE_ID, isHoneypotTripped } from "@/lib/plugins/registry";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_DOWNLOAD_URL, MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION } from "./config";
import { masterchainWindowsBuild } from "@/lib/plugins/windows-beta";
import { isDisposableEmail } from "./key-issuance";

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
  readonly live: boolean;
  readonly downloadUrl: string;
  /** The Windows build's URL, or null while that product has none. */
  readonly windowsUrl: string | null;
  sendReceipt(email: string, locale: "ja" | "en"): Promise<{ success: boolean; error?: string }>;
}

export const MASTERCHAIN_DEMO: DemoProduct = {
  tag: "masterchain/demo",
  get live() { return MASTERCHAIN_DEMO_LIVE; },
  get downloadUrl() { return MASTERCHAIN_DOWNLOAD_URL; },
  // ★windowsDownloadUrl only once masterchain for Windows ships; until then the response is exactly as before.
  get windowsUrl() { return masterchainWindowsBuild(MASTERCHAIN_WINDOWS_LIVE, MASTERCHAIN_WINDOWS_URL, MASTERCHAIN_WINDOWS_VERSION)?.url ?? null; },
  sendReceipt: (email, locale) => emailService.sendMasterchainDemoDownload({ email }, { locale, marketingOptIn: true }),
};

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  locale: z.enum(["ja", "en"]).default("en"),
  // Compatibility only: ignore client value. kimny 2026-10-04 reverted #1166 to "tell and send".
  marketingOptIn: z.boolean().optional(),
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
  const { email, locale, website } = parsed.data;
  if (isHoneypotTripped(website)) return success();
  if (isDisposableEmail(email)) return NextResponse.json({ error: "disposable_email" }, { status: 422 });

  const emailLimit = await checkRateLimit("plugin-email", `plugin-email:${email}`).catch(() => null);
  if (emailLimit && !emailLimit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Form notice + news and unsubscribe in every mail (kimny 2026-10-04).
  const captured = await addDemoContact(email, product.tag);
  // ★A subscriber who did not reach the list is a lost lead AND a promise we did not keep — alert
  //   the operator, like the free three (lib/plugins/subscribe-handler.ts). Configured-only: without the
  //   Resend key there is no list to reach, which is not a failure worth waking anyone for.
  const alertEmail = process.env.OPERATOR_ALERT_EMAIL;
  if (!captured && process.env.RESEND_API_KEY && alertEmail && emailService.isConfigured()) {
    void emailService
      .sendAdminAlert(alertEmail, `[${product.tag}] Resend audience add failed for a subscriber — lead not captured. Check Resend / MUEDsp audience.`)
      .catch((err) => logger.error(`[${product.tag}] operator alert failed`, { error: String(err) }));
  }
  // The browser receives the download directly; the receipt is best-effort, never an entitlement.
  try {
    const result = await product.sendReceipt(email, locale);
    if (!result.success) logger.error(`[${product.tag}] receipt failed`, { error: result.error });
  } catch (error) {
    logger.error(`[${product.tag}] receipt threw`, { error: String(error) });
  }
  return success();
}
