//
// MUEDsp masterchain — Resend audience sync for the paid line (interest + buyers), kept SEPARATE
// from the free-module download audiences (RESEND_MUEDSAT/MUEDLIM_AUDIENCE_ID). Two dedicated lists:
//   - RESEND_MASTERCHAIN_INTEREST_AUDIENCE_ID (C2): pre-launch "notify me at launch" leads.
//   - RESEND_MASTERCHAIN_BUYERS_AUDIENCE_ID   (C+): $69 buyers (product updates — "客は所有する").
//
// Same doctrine as lib/plugins/audience.ts: server-only, no-op-safe (does nothing + returns false
// when the audience id / API key are unset, so the code ships BEFORE the audiences are provisioned),
// and ALWAYS best-effort — a sync failure is caught + logged and must NEVER surface to the caller.
import { Resend } from "resend";
import { logger } from "@/lib/utils/logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

export type MasterchainAudience = "interest" | "buyers";

const ENV_NAME: Record<MasterchainAudience, string> = {
  interest: "RESEND_MASTERCHAIN_INTEREST_AUDIENCE_ID",
  buyers: "RESEND_MASTERCHAIN_BUYERS_AUDIENCE_ID",
};

/** The configured Resend audience id (undefined => not provisioned yet). */
export function masterchainAudienceId(which: MasterchainAudience): string | undefined {
  return process.env[ENV_NAME[which]];
}

/** True when the audience is configured (env present) — a sync will actually run. */
export function isMasterchainAudienceEnabled(which: MasterchainAudience): boolean {
  return !!masterchainAudienceId(which) && !!RESEND_API_KEY;
}

/**
 * Add a contact to a masterchain audience. Returns true if a create was attempted, false on no-op
 * (unconfigured) or error. Never throws — a duplicate or transient Resend error is swallowed.
 */
export async function addMasterchainContact(
  which: MasterchainAudience,
  opts: { email: string; locale?: "ja" | "en" },
): Promise<boolean> {
  const audienceId = masterchainAudienceId(which);
  const resend = getClient();
  if (!resend || !audienceId || !opts.email) return false; // no-op when unconfigured
  try {
    await resend.contacts.create({
      audienceId,
      email: opts.email.trim().toLowerCase(),
      unsubscribed: false,
    });
    return true;
  } catch (err) {
    logger.warn(`[masterchain/audience] best-effort add failed (${which})`, { err: String(err) });
    return false;
  }
}
