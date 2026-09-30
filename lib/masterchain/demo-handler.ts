import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { rateLimit, checkRateLimit } from "@/lib/middleware/rate-limit";
import { MUEDSP_AUDIENCE_ID, isHoneypotTripped } from "@/lib/plugins/registry";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_DOWNLOAD_URL } from "./config";
import { isDisposableEmail } from "./key-issuance";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  locale: z.enum(["ja", "en"]).default("en"),
  marketingOptIn: z.boolean().default(false),
  website: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
});

/** true = the person is on the list. ★false is logged by the caller AND alerted (same as the free three). */
async function addDemoContact(email: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.contacts.create({
      audienceId: MUEDSP_AUDIENCE_ID,
      email,
      unsubscribed: false,
    });
    if (error) {
      logger.error("[masterchain/demo] Resend REJECTED the add", { error: error.message ?? String(error) });
      return false;
    }
    return true;
  } catch (error) {
    logger.error("[masterchain/demo] could not reach Resend to add", { error: String(error) });
    return false;
  }
}

export async function handleMasterchainDemo(request: NextRequest) {
  if (!MASTERCHAIN_DEMO_LIVE) return NextResponse.json({ error: "not_available" }, { status: 404 });
  const ipLimit = await rateLimit(request, "research");
  if (ipLimit) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  const success = () => NextResponse.json({ ok: true, downloadUrl: MASTERCHAIN_DOWNLOAD_URL });
  const { email, locale, marketingOptIn, website } = parsed.data;
  if (isHoneypotTripped(website)) return success();
  if (isDisposableEmail(email)) return NextResponse.json({ error: "disposable_email" }, { status: 422 });

  const emailLimit = await checkRateLimit("plugin-email", `plugin-email:${email}`).catch(() => null);
  if (emailLimit && !emailLimit.success) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  if (marketingOptIn) {
    const captured = await addDemoContact(email);
    // ★A consented person who did not reach the list is a lost lead AND a promise we did not keep — alert
    //   the operator, like the free three (lib/plugins/subscribe-handler.ts). Configured-only: without the
    //   Resend key there is no list to reach, which is not a failure worth waking anyone for.
    const alertEmail = process.env.OPERATOR_ALERT_EMAIL;
    if (!captured && process.env.RESEND_API_KEY && alertEmail && emailService.isConfigured()) {
      void emailService
        .sendAdminAlert(alertEmail, "[masterchain/demo] Resend audience add failed for a consenting person — lead not captured. Check Resend / MUEDsp audience.")
        .catch((err) => logger.error("[masterchain/demo] operator alert failed", { error: String(err) }));
    }
  }
  // The browser receives the download directly; the receipt is best-effort, never an entitlement.
  try {
    const result = await emailService.sendMasterchainDemoDownload({ email }, { locale, marketingOptIn });
    if (!result.success) logger.error("[masterchain/demo] receipt failed", { error: result.error });
  } catch (error) {
    logger.error("[masterchain/demo] receipt threw", { error: String(error) });
  }
  return success();
}
