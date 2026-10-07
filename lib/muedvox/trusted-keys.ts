/**
 * The public keys the plugins TRUST (conductor 2026-10-07, #1245): the owner-key route hands over a key only if it
 * was signed by one of these — "a key that really opens on kimny's Mac", not merely "a key that matches itself".
 * Public keys are not secret.
 *
 * Raw Ed25519 public keys (the last 32 bytes of the SPKI), hex. Measured 2026-10-07 — all three agree:
 *   - mued-dsp origin/main 2c992786  plugin/MUEDsp/dsp/LicenseVerifier.h  TrustedKeys() { K1, K2 }
 *   - mued-vox origin/main 582222e   plugin/MUEDvox/license/muedsp/LicenseVerifier.h (MUEDvox's copy, same bytes)
 *   - mued-dsp plugin/MUEDsp/tests/license-keys/{K1,K2}.pub.pem (last 32 bytes of the DER)
 * K1 = the operating key (its private half is the Vercel env); K2 = the spare (private half offline with kimny).
 * ★If dsp ever rotates the trusted set, change this list in the same breath — a stale list makes the route
 *   refuse (500), which is the safe direction.
 */
export const TRUSTED_PLUGIN_PUBLIC_KEYS_HEX: readonly string[] = [
  "54a6246f7103387e4e72adf44b4c2c5f5607c82e4db198416088e5a7be1d1d41", // K1
  "fea9d3b3d56bd42721ec0ae75840acf38fefab43fe89f1c1eeb1b05a6b81f69a", // K2
];
