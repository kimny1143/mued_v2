//
// Shared email-gate subscribe handler for the MUEDsp free-download plugin family (案A / registry).
// Extracted from app/api/muedsat/subscribe/route.ts — for plugin="muedsat" it is byte-for-byte
// equivalent to the old route (same rate-limit bucket, same zod schema incl. source default, same
// Resend audience env, same welcome email, same fail-open after()). The per-plugin subscribe routes
// (/api/muedsat, /api/muedlim) are thin wrappers around this. Regression 0 for MUEDsat is proven in
// tests/unit/plugin-subscribe.test.ts.
//
// Everything after validation is fail-open: a Resend outage (audience add or email) still returns
// 200 so the UI shows success — the subscriber is never blocked by a downstream failure, and while
// staged (audience id unset) both side effects are silent no-ops.
import { NextRequest, after } from "next/server";
import { z } from "zod";
import { apiSuccess, apiValidationError } from "@/lib/api-response";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { addPluginSubscriber } from "@/lib/plugins/audience";
import { emailService } from "@/lib/services/email.service";
import { logger } from "@/lib/utils/logger";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";

function schemaFor(plugin: PluginKey) {
  return z.object({
    email: z.string().email().transform((e) => e.toLowerCase().trim()),
    locale: z.enum(["ja", "en"]).default("en"),
    source: z.string().max(64).default(PLUGIN_DIST[plugin].source),
    utm_source: z.string().max(128).nullable().optional(),
    utm_medium: z.string().max(128).nullable().optional(),
    utm_campaign: z.string().max(128).nullable().optional(),
    utm_content: z.string().max(128).nullable().optional(),
  });
}

// Per-plugin welcome email — kept as separate email-service methods so each plugin's copy is
// independent (MUEDsat's email is untouched by the MUEDlim add).
async function sendWelcome(plugin: PluginKey, email: string, locale: "ja" | "en") {
  if (plugin === "muedsat") {
    return emailService.sendMuedsatDownloadWelcome({ email }, { locale });
  }
  return emailService.sendMuedlimDownloadWelcome({ email }, { locale });
}

/** POST handler for a plugin's free-download email gate. Used by the per-plugin route wrappers. */
export async function handlePluginSubscribe(plugin: PluginKey, request: NextRequest) {
  // Reuse the "research" bucket (5 req/min/IP) — same shape of sensitive public submit.
  const rateLimitResponse = await rateLimit(request, "research");
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError("Invalid JSON");
  }

  const parsed = schemaFor(plugin).safeParse(body);
  if (!parsed.success) {
    return apiValidationError("Validation failed", parsed.error.flatten());
  }

  const { email, locale } = parsed.data;

  // Add to the plugin's Resend audience — best-effort, no-op-safe while staged.
  await addPluginSubscriber(plugin, { email, locale }).catch((err) =>
    logger.error(`[${plugin}/subscribe] audience add failed`, { error: String(err) })
  );

  // Send the download-link email in after() so the serverless function stays alive to deliver it
  // after the 200 (this email carries the DL link = the deliverable — product review #591). fail-open.
  if (emailService.isConfigured()) {
    after(async () => {
      try {
        await sendWelcome(plugin, email, locale);
      } catch (err) {
        logger.error(`[${plugin}/subscribe] welcome email failed`, { error: String(err) });
      }
    });
  }

  return apiSuccess({ subscribed: true });
}
