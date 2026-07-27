import { NextResponse } from "next/server";
import { licenseSigningPublicKeyHex } from "@/lib/masterchain/license";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "MUED LMS API",
    version: "1.0.0",
    // Which license-signing key this deployment holds, as its derived Ed25519 public key (hex), or
    // null when none is configured. ★Safe to serve unauthenticated: a public key is public, and it
    // is derived here — the secret is never read out. null is informative too ("no key registered").
    //
    // The point is identity, not presence: a boolean cannot distinguish K1 from K2, and a keyfile
    // signed by the wrong key fails in the buyer's plugin rather than here. dsp compares this string
    // against the bytes burned into plugin/MUEDsp/dsp/LicenseVerifier.h, so one curl closes the gap
    // between "kimny registered a key" and "the first paid order proves it works".
    masterchain: { licenseKeyPublic: licenseSigningPublicKeyHex() },
  });
}
