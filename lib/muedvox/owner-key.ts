/**
 * kimny's own MUEDvox key — ONE key, not a sale (kimny 2026-10-07 「OKです」 via conductor, Tier 3; conductor's design OK).
 *
 * Issued server-side with the production signing key (K1 never leaves Vercel), downloaded once by kimny through
 * the admin-only route app/api/admin/license/owner-muedvox, then the route is retired (status.md blocked_by).
 * ★Not a purchase: nothing is written to masterchain_purchases, and the paid-products table's muedvox row stays
 *   disabled. The order id says so.
 * ★Deterministic: the order and issued_at are fixed, so opening the URL twice gives the same file (Ed25519
 *   signatures are deterministic), not a second, different key.
 */
import { evaluateLicense, issueLicense, licenseSigningPublicKeyPem } from "@/lib/masterchain/license";

export const OWNER_KEY_ORDER = "internal-owner-muedvox-20261007";
export const OWNER_KEY_ISSUED_AT = "2026-10-07T00:00:00.000Z";
export const OWNER_KEY_SCOPE = "muedvox";
export const OWNER_KEY_FILE_NAME = "MUEDvox.license.key";

/**
 * The keyfile for `ownerEmail`, or null when it cannot be issued OR when the issued key does not verify as
 * MUEDvox with the configured key's own public key (never hand over a key the plugin would reject).
 */
export function issueMuedvoxOwnerKey(ownerEmail: string): string | null {
  const owner = ownerEmail.trim().toLowerCase();
  if (!owner) return null;
  const keyfile = issueLicense({ owner, order: OWNER_KEY_ORDER, scope: OWNER_KEY_SCOPE, issuedAt: OWNER_KEY_ISSUED_AT });
  const publicPem = licenseSigningPublicKeyPem();
  if (!keyfile || !publicPem) return null;
  const { verdict, payload } = evaluateLicense(keyfile, publicPem, { product: "MUEDsp", scope: OWNER_KEY_SCOPE });
  if (verdict !== "accept" || payload?.owner !== owner || payload.order !== OWNER_KEY_ORDER) return null;
  return keyfile;
}
