import { NextResponse } from "next/server";
import { licenseSigningPublicKeyHex } from "@/lib/masterchain/license";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";
import { pluginAudienceStatus } from "@/lib/plugins/audience";

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
    // Per plugin: does its configured Resend audience match the one the North Star counts?
    //   true     → yes; these registrations are in muedsp_reachable
    //   false    → env not set at all
    //   "<tail>" → set, but to a DIFFERENT audience (at most its last 4 characters)
    //
    // ★Only `true` is acceptable — the other two differ in cause, not in consequence. The tail is
    // there to answer the next question ("then where did the leads go?"), and appears ONLY when
    // something is already wrong, so nothing about a healthy deployment is disclosed.
    // ★The comparison is computed here rather than published as ids, which keeps this an instrument
    // instead of two strings a human has to diff. Safe unauthenticated for the same reason
    // licenseKeyPublic is: a fact about configuration, not a credential.
    //
    // ★This is the ONLY outside-visible signal for an otherwise silent failure: subscribe-handler
    // alerts on `audienceConfigured && !listCaptured`, so an unconfigured audience drops leads with
    // no log and no alert — see the note on pluginAudienceStatus.
    pluginAudiences: Object.fromEntries(
      (Object.keys(PLUGIN_DIST) as PluginKey[]).map((k) => [k, pluginAudienceStatus(k)]),
    ),
  });
}
