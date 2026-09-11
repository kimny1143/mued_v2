//
// Plugin email-capture → Resend Audience sync (generalized from lib/muedsat/audience.ts for the
// MUEDsp free-download family). Server-only: reads the per-plugin Resend audience id from
// process.env by the NAME in the registry (RESEND_MUEDSAT_AUDIENCE_ID / RESEND_MUEDLIM_AUDIENCE_ID),
// keeping each free-download list cleanly segmented ("客は自前・list は segment" doctrine).
//
// No-op-safe: when the audience id / API key are not configured (staged build, before the audience
// is provisioned at unlock) this does nothing and returns `false` — so the capture endpoint ships
// and runs BEFORE the Resend audience exists. Always best-effort: every call is caught and logged; a
// sync failure must NEVER surface to the caller or block the response.
//
// muedsat behavior is byte-for-byte unchanged: addPluginSubscriber("muedsat") reads the same
// RESEND_MUEDSAT_AUDIENCE_ID and calls resend.contacts.create identically to the old
// addMuedsatSubscriber (proven in tests/unit/plugin-subscribe.test.ts).
import { Resend } from "resend";
import { logger } from "@/lib/utils/logger";
import { PLUGIN_DIST, MUEDSP_AUDIENCE_ID, type PluginKey } from "@/lib/plugins/registry";

const RESEND_API_KEY = process.env.RESEND_API_KEY;

let client: Resend | null = null;

function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

/** The configured Resend audience id for a plugin (undefined => audience not provisioned yet). */
export function pluginAudienceId(plugin: PluginKey): string | undefined {
  return process.env[PLUGIN_DIST[plugin].audienceEnvName];
}

/** True when the plugin's Resend audience is configured (env present) — sync will actually run. */
export function isPluginAudienceEnabled(plugin: PluginKey): boolean {
  return !!pluginAudienceId(plugin) && !!RESEND_API_KEY;
}

/**
 * ★True when this plugin's configured audience IS the audience the North Star counts.
 *
 * ★Deliberately stronger than isPluginAudienceEnabled, and deliberately NOT the id itself. "Is it
 * configured" cannot distinguish "points at the North Star audience" from "points at some other
 * valid audience" — both are `true`, and only one of them gets counted. Emitting the id (or a
 * fragment of it) would leave the comparison to a human reading two strings; computing it here makes
 * it an instrument that keeps working when nobody is looking. (insight課's design, 2026-09-05.)
 *
 * ★Both failure modes collapse to false ON PURPOSE — unset and set-to-something-else have the same
 * consequence: registrations for this plugin are not in the North Star denominator.
 *
 * ★Why this exists at all: lib/plugins/subscribe-handler.ts only alerts when
 * `audienceConfigured && !listCaptured`, so an UNCONFIGURED audience drops leads with no log and no
 * operator alert. That scoping was right when "unconfigured" meant "staged, not provisioned yet";
 * it now cannot be told apart from "misconfigured in production".
 */
export function isPluginAudienceUnified(plugin: PluginKey): boolean {
  return pluginAudienceId(plugin) === MUEDSP_AUDIENCE_ID;
}

/**
 * ★Three-valued report for /api/health. The machine renders the verdict; a human only needs to read
 * anything when the verdict is bad, and only then is any part of the id disclosed.
 *
 *   true      → configured AND equal to MUEDSP_AUDIENCE_ID (counted by the North Star)
 *   false     → not configured at all
 *   "<tail>"  → configured, but pointing at a DIFFERENT audience — AT MOST its last 4 characters,
 *               so whoever is debugging can tell which one without the endpoint publishing ids in
 *               the clear. ★"At most": `slice(-4)` returns the whole string when it is shorter than
 *               four, so this is a ceiling, not a fixed width (product課, #978). That case only
 *               arises for a value too short to be a Resend id at all — i.e. already malformed —
 *               and the whole of such a value discloses nothing, but the doc should not claim an
 *               invariant the code does not have.
 *
 * ★Both non-true cases mean the same thing operationally (these registrations are not in
 * muedsp_reachable), which is why the verdict is not three equal citizens: `true` is the only shape
 * a caller should accept. The tail exists to answer the NEXT question, not this one.
 * (conductor's arbitration, 2026-09-05, combining insight課's server-side comparison with the
 * observation that a bare boolean tells a debugger nothing about where the leads actually went.)
 */
export function pluginAudienceStatus(plugin: PluginKey): boolean | string {
  const id = pluginAudienceId(plugin);
  if (!id) return false;
  if (id === MUEDSP_AUDIENCE_ID) return true;
  return id.slice(-4);
}

/**
 * Add a subscriber to the plugin's Resend audience. Returns true if a create was attempted, false on
 * no-op (unconfigured). Never throws — a duplicate-on-create or transient Resend error is swallowed.
 */
export async function addPluginSubscriber(
  plugin: PluginKey,
  opts: { email: string; locale?: "ja" | "en" }
): Promise<boolean> {
  const audienceId = pluginAudienceId(plugin);
  const resend = getClient();
  if (!resend || !audienceId || !opts.email) return false; // no-op when unconfigured
  try {
    // ★The SDK RETURNS `{ data, error }` on an API failure rather than throwing (resend@6.12.4 —
    //   see lib/masterchain/audience.ts for the measurement and the source line). Without reading
    //   `error`, the `catch` never fires for an API rejection and `return true` runs regardless.
    const { error } = await resend.contacts.create({
      audienceId,
      email: opts.email,
      unsubscribed: false,
    });
    if (error) {
      logger.error(`[plugins/audience] Resend REJECTED the subscribe (${plugin})`, {
        error: error.message ?? String(error),
      });
      return false;
    }
    return true;
  } catch (err) {
    // ★Distinct from the rejection above: this is "could not reach Resend", not "Resend said no".
    logger.error(`[plugins/audience] could not reach Resend to subscribe (${plugin})`, { err: String(err) });
    return false;
  }
}

/**
 * Mark a plugin subscriber as unsubscribed in its Resend audience (one-click List-Unsubscribe /
 * withdrawal path). Returns true if an update was attempted, false on no-op (unconfigured) or error.
 * Never throws. Uses contacts.update({ unsubscribed: true }) so the contact stays on the audience for
 * suppression rather than being deleted (same pattern as lib/marketing/audience-sync.ts).
 */
export async function unsubscribePluginContact(plugin: PluginKey, email: string): Promise<boolean> {
  const audienceId = pluginAudienceId(plugin);
  const resend = getClient();
  if (!resend || !audienceId || !email) return false; // no-op when unconfigured
  try {
    // ★★The same SDK shape, and the consequence here is the worst of the four sites: a person clicks
    //   one-click unsubscribe, Resend rejects the update, and the old code reported success — so the
    //   mail keeps arriving and nothing anywhere says the withdrawal did not take. ★A silent failure
    //   on a consent-withdrawal path is not "best-effort"; it is telling someone they are off a list
    //   they are still on.
    const { error } = await resend.contacts.update({
      audienceId,
      email: email.trim().toLowerCase(),
      unsubscribed: true,
    });
    if (error) {
      logger.error(`[plugins/audience] Resend REJECTED the unsubscribe (${plugin})`, {
        error: error.message ?? String(error),
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.error(`[plugins/audience] could not reach Resend to unsubscribe (${plugin})`, { err: String(err) });
    return false;
  }
}
