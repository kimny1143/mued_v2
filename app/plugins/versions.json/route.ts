import { NextResponse } from "next/server";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";

//
// GET /plugins/versions.json — the in-plugin update-check manifest (Road to 10k #1, dsp↔mued contract
// 2026-07-19). The free MUEDsp plugins fetch this once at startup, compare `latest` to their built-in
// version (semver), and — fail-silent — surface a "update available" banner linking to `url`. No PII,
// no auth, no auto-update; the plugin only ever shows a notification + link.
//
// Driven by lib/plugins/registry.ts (PLUGIN_DIST) — the SAME source that ships the download page + the
// portal version. So the manifest auto-syncs at every ship (the config VERSION bump that already lands
// with the new downloadUrl); there is NO separate manifest to hand-maintain (drift-free). Only `live`
// plugins are listed. `latest` is PLAIN numeric semver (the pre-release "-alpha" suffix is a display-only
// tag the plugin does not compare on), so it lines up with the plugin's PLUG_VERSION_STR.
//
export const dynamic = "force-static";

const BASE = "https://mued.jp";

/** "0.1.0-alpha" / "v0.1.0" → "0.1.0" — the comparable numeric semver (drop pre-release + any v-prefix). */
function plainSemver(v: string): string {
  return v.trim().replace(/^v/i, "").split("-")[0];
}

export function GET() {
  const manifest: Record<string, { latest: string; url: string; downloadUrl: string }> = {};
  for (const key of Object.keys(PLUGIN_DIST) as PluginKey[]) {
    const dist = PLUGIN_DIST[key];
    if (!dist.live) continue; // staged (not-yet-live) plugins are not advertised
    manifest[key] = {
      latest: plainSemver(dist.version), // plain semver for the plugin's comparison
      url: `${BASE}/${key}`, // product page (banner default — transparent, no auto-update)
      downloadUrl: dist.downloadUrl, // direct .pkg (optional affordance; may be "" until go-live)
    };
  }
  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" },
  });
}
