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
 * Add a contact to a masterchain audience. Returns true ONLY when Resend accepted the create;
 * false on no-op (unconfigured), an API rejection, or a thrown error. Never throws.
 *
 * ★WHY `try/catch` ALONE REPORTED SUCCESS FOREVER (freee measured 2026-09-10, resend@6.12.4;
 * confirmed here against the installed `node_modules/resend/dist/index.cjs`). The SDK does NOT throw
 * on an API error — `fetchRequest` catches a non-ok response and ★RETURNS `{ data: null, error }`:
 *
 *     if (!response.ok) { … return { data: null, error: JSON.parse(rawError), headers … }; }
 *
 * ★So the `catch` below is unreachable for every failure the API itself reports, and the `return true`
 * that used to sit under the bare `await` ran unconditionally. ★The failure mode was not a wrong
 * value — it was ★a value nobody could see was wrong: a rejected add reported as a completed one.
 *
 * ★WHY IT MATTERS HERE SPECIFICALLY: `which === "buyers"` is the $69 purchaser's list add, called
 * from the FastSpring webhook. ★A paid customer silently missing from the buyers list is exactly the
 * asymmetry that reaches a person — and Resend's 1,000-contact free tier does NOT block creates
 * (only broadcasts), so hitting the cap would not surface it either (freee, first-hand).
 */
export async function addMasterchainContact(
  which: MasterchainAudience,
  opts: { email: string; locale?: "ja" | "en" },
): Promise<boolean> {
  const audienceId = masterchainAudienceId(which);
  const resend = getClient();
  if (!resend || !audienceId || !opts.email) return false; // no-op when unconfigured
  try {
    // ★Read `error`. `const { error } =` and not `res?.error`: `?.` folds "no response object at all"
    //   into undefined → falsy → the SUCCESS side, which is the same silence being fixed here.
    //   A shape change then throws a TypeError into the catch below, where it is at least visible.
    //   (Same reasoning as lib/marketing/audience-sync.ts, product課 2026-08-05.)
    const { error } = await resend.contacts.create({
      audienceId,
      email: opts.email.trim().toLowerCase(),
      unsubscribed: false,
    });
    if (error) {
      // ★error-level, and worded as a REJECTION: distinct from the catch below, which means "we could
      //   not even ask". "Did not fail" and "did not see a failure" must not print the same.
      logger.error(`[masterchain/audience] Resend REJECTED the add (${which})`, {
        error: error.message ?? String(error),
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.error(`[masterchain/audience] could not reach Resend to add (${which})`, { err: String(err) });
    return false;
  }
}
