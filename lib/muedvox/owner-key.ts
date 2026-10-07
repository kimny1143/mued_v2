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
import { createPublicKey } from "node:crypto";
import { evaluateLicense, issueLicense, licenseSigningPublicKeyHex } from "@/lib/masterchain/license";
import { TRUSTED_PLUGIN_PUBLIC_KEYS_HEX } from "@/lib/muedvox/trusted-keys";

export const OWNER_KEY_ORDER = "internal-owner-muedvox-20261007";
export const OWNER_KEY_ISSUED_AT = "2026-10-07T00:00:00.000Z";
export const OWNER_KEY_SCOPE = "muedvox";
export const OWNER_KEY_FILE_NAME = "MUEDvox.license.key";

/** SPKI DER for Ed25519 = this fixed 12-byte prefix + the 32 raw key bytes. */
const ED25519_SPKI_PREFIX = "302a300506032b6570032100";

function pemFromRawHex(hex: string): string | null {
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  try {
    return createPublicKey({ key: Buffer.from(ED25519_SPKI_PREFIX + hex, "hex"), format: "der", type: "spki" })
      .export({ format: "pem", type: "spki" })
      .toString();
  } catch {
    return null;
  }
}

/**
 * The keyfile for `ownerEmail`, or null — when it cannot be issued, when the configured signing key is NOT one the
 * plugins trust (conductor 10/7: a key that verifies only against itself proves nothing about kimny's Mac), or when
 * the issued key does not verify as MUEDvox against that TRUSTED public key. Never hand over a key the plugin
 * would reject.
 */
export function issueMuedvoxOwnerKey(ownerEmail: string): string | null {
  const owner = ownerEmail.trim().toLowerCase();
  if (!owner) return null;
  const signer = licenseSigningPublicKeyHex();
  if (!signer || !TRUSTED_PLUGIN_PUBLIC_KEYS_HEX.includes(signer)) return null;
  const trustedPem = pemFromRawHex(signer); // built from the trusted constant's bytes (equal to the signer's)
  const keyfile = issueLicense({ owner, order: OWNER_KEY_ORDER, scope: OWNER_KEY_SCOPE, issuedAt: OWNER_KEY_ISSUED_AT });
  if (!keyfile || !trustedPem) return null;
  const { verdict, payload } = evaluateLicense(keyfile, trustedPem, { product: "MUEDsp", scope: OWNER_KEY_SCOPE });
  if (verdict !== "accept" || payload?.owner !== owner || payload.order !== OWNER_KEY_ORDER) return null;
  return keyfile;
}
