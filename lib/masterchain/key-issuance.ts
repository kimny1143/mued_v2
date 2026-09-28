// Server-only shared issuance primitives; no entry-point authentication or persistence here.
import { DISPOSABLE_EMAIL_DOMAINS_TXT } from "./data/disposable-email-domains";
import { issueLicense, licenseSigningPublicKeyHex } from "./license";

export function canonicalEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  return at >= 0 && (domain === "gmail.com" || domain === "googlemail.com")
    ? `${local.split("+")[0].replace(/\./g, "")}@gmail.com`
    : normalized;
}

let disposableDomains: ReadonlySet<string> | undefined;

function loadDisposableDomains(): ReadonlySet<string> {
  // Vendored CC0: disposable-email-domains/disposable-email-domains,
  // commit 0655284b6a0b5c674789756ce8b6b35441b800bc (2026-09-27), 9185 lines.
  // SHA256 b5493ea48624f28e09b2a25977c9319b78a6b59d59a017ff73b2aa6e5938e510.
  // Bundled via a static import (./data/disposable-email-domains.ts, generated from the .txt), so no
  // file tracing is involved. Parsed once on first use.
  disposableDomains ??= new Set(DISPOSABLE_EMAIL_DOMAINS_TXT
    .split(/\r?\n/).map((line) => line.trim().toLowerCase()).filter(Boolean));
  return disposableDomains;
}

/** Diagnostic count without exposing the mutable cached set. */
export function disposableEmailDomainCount(): number {
  return loadDisposableDomains().size;
}

export function isDisposableEmail(email: string): boolean {
  let domain = email.trim().toLowerCase().split("@").at(-1) ?? "";
  const domains = loadDisposableDomains();
  while (domain) {
    if (domains.has(domain)) return true;
    const dot = domain.indexOf(".");
    if (dot < 0) break;
    domain = domain.slice(dot + 1);
  }
  return false;
}

export function trialExpiry(now: Date, days: number): string {
  // The plugin parses exactly six fields: fractional seconds are not supported.
  return new Date(now.getTime() + days * 86_400_000).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export class KeyIssuanceError extends Error {
  constructor() {
    super("License signing key missing or invalid");
    this.name = "KeyIssuanceError";
  }
}

export function issueKey(input: { owner: string; order: string; expiresAt?: string }): string {
  try {
    if (!licenseSigningPublicKeyHex()) throw new KeyIssuanceError();
    const key = issueLicense(input);
    if (key) return key;
  } catch {
    // Discard underlying crypto errors: they can contain secret material.
  }
  throw new KeyIssuanceError();
}
