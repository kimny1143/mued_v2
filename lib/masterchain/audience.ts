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
import { addContactIfAbsent } from "@/lib/plugins/audience";
import { MUEDSP_AUDIENCE_ID } from "@/lib/plugins/registry";

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
 * Add a contact to a masterchain audience. Returns true when the person is on the list (added now, or already
 * there and left untouched); false on no-op (unconfigured), an API rejection, or a thrown error. Never throws.
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
  // ★Lookup first (addContactIfAbsent): a person already on the list — including one who unsubscribed — is left
  //   untouched. A bare create with `unsubscribed: false` could re-subscribe someone who opted out; it was harmless
  //   only while the buyers add never ran (the consent tag was always "false" until 2026-10-06).
  return addContactIfAbsent(resend, audienceId, opts.email.trim().toLowerCase(), `masterchain/audience ${which}`);
}

/**
 * A new buyer onto the MUEDsp news list — the shared audience the free downloads and the demo use
 * (MUEDSP_AUDIENCE_ID). kimny 2026-10-06 (conductor relay): 「購入者をメールに入れます。」 — told and sent: the cart
 * shows the notice (muedsp.buyTry.cartAudienceNote) and sends marketingConsent "true" only from that screen, so
 * orders from before it (no notice) are not added. Lookup first: an unsubscribed person stays unsubscribed.
 * Returns false when unconfigured or on failure. Never throws.
 */
export async function addBuyerToMuedspNews(email: string): Promise<boolean> {
  const resend = getClient();
  if (!resend || !email) return false;
  return addContactIfAbsent(resend, MUEDSP_AUDIENCE_ID, email.trim().toLowerCase(), "masterchain/buyer-news");
}
