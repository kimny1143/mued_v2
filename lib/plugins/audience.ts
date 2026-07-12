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
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";

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
    await resend.contacts.create({
      audienceId,
      email: opts.email,
      unsubscribed: false,
    });
    return true;
  } catch (err) {
    // Best-effort: a duplicate (already subscribed) or transient error must not surface to the caller.
    logger.warn(`[plugins/audience] best-effort subscribe failed (${plugin})`, { err: String(err) });
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
    await resend.contacts.update({
      audienceId,
      email: email.trim().toLowerCase(),
      unsubscribed: true,
    });
    return true;
  } catch (err) {
    logger.warn(`[plugins/audience] best-effort unsubscribe failed (${plugin})`, { err: String(err) });
    return false;
  }
}
