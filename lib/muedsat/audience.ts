/**
 * MUEDsat email-capture → Resend Audience sync.
 *
 * A dedicated audience slot (RESEND_MUEDSAT_AUDIENCE_ID) keeps the MUEDsat free-download list
 * cleanly segmented from the general marketing list (RESEND_MARKETING_AUDIENCE_ID) — the "客は
 * 自前・list は segment" doctrine. Same shape as lib/marketing/audience-sync.ts.
 *
 * No-op-safe: when the audience id / API key are not configured (staged build, before the audience
 * is provisioned at unlock) this does nothing and returns `false` — so the capture endpoint can ship
 * and run BEFORE the Resend audience exists. Always best-effort: every call is caught and logged; a
 * sync failure must NEVER surface to the caller or block the response.
 *
 * NOTE: the repo is currently on the Resend *Audiences* model (resend.contacts.create({audienceId})),
 * matching lib/marketing/audience-sync.ts on main. If the account migrates to the segments-native
 * model, update this alongside audience-sync.ts and rename the env to RESEND_MUEDSAT_SEGMENT_ID.
 */
import { Resend } from "resend";
import { logger } from "@/lib/utils/logger";

const AUDIENCE_ID = process.env.RESEND_MUEDSAT_AUDIENCE_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!AUDIENCE_ID || !RESEND_API_KEY) return null; // audience not configured → no-op
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

/** True when the MUEDsat Resend audience is configured (env present) — sync will actually run. */
export function isMuedsatAudienceEnabled(): boolean {
  return !!AUDIENCE_ID && !!RESEND_API_KEY;
}

/**
 * Add a subscriber to the MUEDsat audience. Returns true if a create was attempted, false on no-op
 * (unconfigured). Never throws — a duplicate-on-create or transient Resend error is swallowed.
 */
export async function addMuedsatSubscriber(opts: {
  email: string;
  locale?: "ja" | "en";
}): Promise<boolean> {
  const resend = getClient();
  if (!resend || !opts.email) return false; // no-op when unconfigured
  try {
    await resend.contacts.create({
      audienceId: AUDIENCE_ID!,
      email: opts.email,
      unsubscribed: false,
    });
    return true;
  } catch (err) {
    // Best-effort: a duplicate (already subscribed) or transient error must not surface to the caller.
    logger.warn("[muedsat/audience] best-effort subscribe failed", { err: String(err) });
    return false;
  }
}
