/**
 * License grants — time-limited keys we hand out ourselves (testers). Not sales.
 * kimny 2026-10-13 (MUED window): 「テスター向けに期限つきの MUEDvox の鍵を出す道を作って良い」.
 *
 * One grant = one signed keyfile with an `expires_at`, stored in plugin_license_grants (db/schema/masterchain.ts)
 * and shown in the recipient's portal. The key is never mailed: the recipient signs in with the address it was
 * issued to, exactly as a buyer does.
 * ★An extension is another grant (a new key with a later expiry). Keys are offline signatures: nothing issued
 *   here can be taken back, so the expiry is the only limit — it is required and capped (MAX_GRANT_MINUTES).
 * ★Never a purchase: nothing is written to masterchain_purchases, and the keyfile's `order=` line starts with
 *   "grant-" so a grant can always be told from a FastSpring order.
 */
import { createPublicKey, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pluginLicenseGrants } from "@/db/schema";
import { trialExpiry } from "@/lib/masterchain/key-issuance";
import { evaluateLicense, issueLicense, licenseSigningPublicKeyHex, LICENSE_VERSION } from "@/lib/masterchain/license";
import { PAID_PRODUCTS, type PaidProduct, type PaidProductKey } from "@/lib/plugins/paid-products";

/**
 * Who may issue a grant: kimny only, AND the admin role (the route checks both). Same rule and the same two ids as
 * the one-off owner key of 2026-10-07 (#1245, conductor: "admin なら誰でも" is too wide). Both are kimny's Clerk
 * user ids — the production DB is shared by the development and production Clerk instances, one id per instance.
 * Ids are not secret. Anyone else, admin or not, gets 404.
 */
export const GRANT_ISSUER_USER_IDS: readonly string[] = [
  "user_38Ke5H6xPB9tm7M2J2fxP082fP5",
  "user_33EiZv982KTQ6s6AfTCkbaYqkpR",
];

/** Products a grant can be issued for. masterchain has its own trial; add it here only by a reviewed change. */
export const GRANTABLE_PRODUCTS: readonly PaidProductKey[] = ["muedvox"];

export const MIN_GRANT_MINUTES = 1;
/** 90 days. A longer loan is a decision, not a form value. */
export const MAX_GRANT_MINUTES = 90 * 24 * 60;

export type GrantRequest = { email: string; product: PaidProduct; minutes: number; reason: string };
export type GrantRequestResult = { ok: true; value: GrantRequest } | { ok: false; error: string };

/**
 * The request as an admin typed it → a checked request, or the reason it is refused. Pure.
 * `days` and `minutes` are alternatives (exactly one): days for real loans, minutes to watch a key expire.
 */
export function parseGrantRequest(body: unknown): GrantRequestResult {
  const input = (body ?? {}) as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  // One address, no whitespace or control characters (a newline would inject a line into the signed keyfile;
  // issueLicense refuses it too — this is the readable refusal).
  if (!/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/.test(email) || email.length > 254) {
    return { ok: false, error: "email: one valid address is required" };
  }
  const productKey = typeof input.product === "string" ? input.product : "";
  if (!(GRANTABLE_PRODUCTS as readonly string[]).includes(productKey)) {
    return { ok: false, error: `product: one of ${GRANTABLE_PRODUCTS.join(", ")}` };
  }
  const hasDays = input.days !== undefined && input.days !== null && input.days !== "";
  const hasMinutes = input.minutes !== undefined && input.minutes !== null && input.minutes !== "";
  if (hasDays === hasMinutes) return { ok: false, error: "give exactly one of days or minutes" };
  // A number, or a string of digits only (CCO #1276: Number() also reads true, [5] and "0x10").
  const raw = hasDays ? input.days : input.minutes;
  const amount = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  if (!Number.isInteger(amount)) return { ok: false, error: "days / minutes must be a whole number" };
  const minutes = hasDays ? amount * 24 * 60 : amount;
  if (minutes < MIN_GRANT_MINUTES || minutes > MAX_GRANT_MINUTES) {
    return { ok: false, error: `the period must be between ${MIN_GRANT_MINUTES} minute and ${MAX_GRANT_MINUTES / 1440} days` };
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300 || /[\r\n]/.test(reason)) {
    return { ok: false, error: "reason: one line, 3–300 characters (who this is and why)" };
  }
  return { ok: true, value: { email, product: PAID_PRODUCTS[productKey as PaidProductKey], minutes, reason } };
}

/** SPKI DER for Ed25519 = this fixed 12-byte prefix + the 32 raw key bytes. */
const ED25519_SPKI_PREFIX = "302a300506032b6570032100";

function signerPem(): string | null {
  const hex = licenseSigningPublicKeyHex();
  if (!hex || !/^[0-9a-f]{64}$/.test(hex)) return null;
  try {
    return createPublicKey({ key: Buffer.from(ED25519_SPKI_PREFIX + hex, "hex"), format: "der", type: "spki" })
      .export({ format: "pem", type: "spki" })
      .toString();
  } catch {
    return null;
  }
}

export interface SignedGrant {
  orderRef: string;
  licenseKey: string;
  issuedAt: Date;
  expiresAt: Date;
}

/**
 * Sign one grant. Returns null when the key cannot be issued, or when the issued key does not read back as this
 * product, this owner, this order and this expiry — never hand over (or store) a key we could not verify ourselves.
 * ★This proves the keyfile is well-formed and carries the right scope and expiry. It does NOT prove the plugin
 *   trusts the signing key (the plugin's own list is the authority) — a purchase has the same limit.
 */
export function signGrant(request: GrantRequest, now: Date = new Date()): SignedGrant | null {
  const orderRef = `grant-${request.product.key}-${randomUUID()}`;
  const issuedAtIso = now.toISOString();
  const expiresAtIso = trialExpiry(now, request.minutes / 1440); // whole seconds: the plugin parses no fractions
  let licenseKey: string | null = null;
  try {
    licenseKey = issueLicense({
      owner: request.email, order: orderRef, scope: request.product.scope, issuedAt: issuedAtIso, expiresAt: expiresAtIso,
    });
  } catch {
    licenseKey = null; // never surface crypto errors: they can carry key material
  }
  const pem = signerPem();
  if (!licenseKey || !pem) return null;
  const { verdict, payload } = evaluateLicense(licenseKey, pem, { product: "MUEDsp", scope: request.product.scope }, now);
  if (verdict !== "accept" || !payload) return null;
  if (payload.owner !== request.email || payload.order !== orderRef || payload.expiresAt !== expiresAtIso) return null;
  // And it must stop being accepted once the period is over (an expiry the verifier cannot read would be perpetual
  // in a plugin that reads it differently — refuse to issue rather than find out).
  const after = new Date(Date.parse(expiresAtIso) + 1000);
  if (evaluateLicense(licenseKey, pem, { product: "MUEDsp", scope: request.product.scope }, after).verdict !== "unlicensed") return null;
  return { orderRef, licenseKey, issuedAt: new Date(issuedAtIso), expiresAt: new Date(expiresAtIso) };
}

/** What the admin screen and the log may see of a grant: everything except the key itself. */
export interface GrantRecord {
  id: string;
  email: string;
  productId: string;
  orderRef: string;
  issuedAt: string;
  expiresAt: string;
  reason: string;
  grantedBy: string;
}

/** Issue and record one grant. Null when signing is unavailable or the key failed its own check. */
export async function createGrant(request: GrantRequest, grantedBy: string, now: Date = new Date()): Promise<GrantRecord | null> {
  const signed = signGrant(request, now);
  if (!signed) return null;
  const [row] = await db
    .insert(pluginLicenseGrants)
    .values({
      email: request.email,
      productId: request.product.productId,
      orderRef: signed.orderRef,
      licenseKey: signed.licenseKey,
      licenseVersion: LICENSE_VERSION,
      issuedAt: signed.issuedAt,
      expiresAt: signed.expiresAt,
      reason: request.reason,
      grantedBy,
    })
    .returning({ id: pluginLicenseGrants.id });
  if (!row) return null;
  return {
    id: row.id, email: request.email, productId: request.product.productId, orderRef: signed.orderRef,
    issuedAt: signed.issuedAt.toISOString(), expiresAt: signed.expiresAt.toISOString(), reason: request.reason, grantedBy,
  };
}

/** The grants recorded for one address, newest first — without the keys. */
export async function listGrantsForEmail(email: string): Promise<GrantRecord[]> {
  const address = email.trim().toLowerCase();
  if (!address) return [];
  const rows = await db
    .select({
      id: pluginLicenseGrants.id, email: pluginLicenseGrants.email, productId: pluginLicenseGrants.productId,
      orderRef: pluginLicenseGrants.orderRef, issuedAt: pluginLicenseGrants.issuedAt, expiresAt: pluginLicenseGrants.expiresAt,
      reason: pluginLicenseGrants.reason, grantedBy: pluginLicenseGrants.grantedBy,
    })
    .from(pluginLicenseGrants)
    .where(eq(pluginLicenseGrants.email, address))
    .orderBy(desc(pluginLicenseGrants.expiresAt));
  return rows.map((r) => ({ ...r, issuedAt: r.issuedAt.toISOString(), expiresAt: r.expiresAt.toISOString() }));
}
