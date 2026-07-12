/**
 * Per-(plugin, email) HMAC token for the plugin free-download email's one-click List-Unsubscribe.
 *
 * The DL welcome email (MUEDsat / MUEDlim) carries a link to
 *   /api/plugins/unsubscribe?plugin=<key>&email=<email>&t=<token>
 * Signing `${plugin}:${email}` with a server-only secret makes the link a per-recipient capability
 * that reveals nothing reusable and can't be trivially forged to unsubscribe an arbitrary address.
 * verify recomputes and compares in constant time. Mirrors lib/advisory/booking-token.ts.
 *
 * Secret = PLUGIN_UNSUBSCRIBE_TOKEN_SECRET (server-only). Deliberately SELF-CONSISTENT when unset
 * (sign + verify use the same empty key) so the one-click List-Unsubscribe works the moment the code
 * ships — before the secret is provisioned. Set the secret in prod before the external blast to make
 * the token unforgeable.
 */
import { createHmac, timingSafeEqual } from "crypto";
import type { PluginKey } from "@/lib/plugins/registry";

function secret(): string {
  return process.env.PLUGIN_UNSUBSCRIBE_TOKEN_SECRET ?? "";
}

/** Normalize so sign/verify agree regardless of casing/whitespace (the subscribe zod lowercases too). */
function payload(plugin: PluginKey, email: string): string {
  return `${plugin}:${email.trim().toLowerCase()}`;
}

/** hex HMAC-SHA256(`plugin:email`) truncated to 32 chars — a per-recipient unsubscribe capability. */
export function signUnsubscribeToken(plugin: PluginKey, email: string): string {
  return createHmac("sha256", secret()).update(payload(plugin, email)).digest("hex").slice(0, 32);
}

/**
 * Constant-time verify. Returns false when the token is missing or doesn't match. Note: unlike the
 * advisory token, this does NOT require the secret to be set — an empty secret is self-consistent, so
 * unsubscribe works before the secret is provisioned (compliance first; forgery-resistance once set).
 */
export function verifyUnsubscribeToken(
  plugin: PluginKey,
  email: string,
  token: string | null | undefined,
): boolean {
  if (!token) return false;
  const expected = signUnsubscribeToken(plugin, email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
