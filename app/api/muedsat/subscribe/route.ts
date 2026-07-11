//
// MUEDsat free-download email gate — thin wrapper over the shared plugin subscribe handler
// (案A / registry, 2026-07-11). Behavior is byte-for-byte unchanged from the previous inline route:
// handlePluginSubscribe("muedsat", …) reuses the same rate-limit bucket ("research"), the same zod
// schema (incl. source default "muedsat_lp"), the same RESEND_MUEDSAT_AUDIENCE_ID Resend audience,
// and the same muedsatDownloadWelcome email — all fail-open and no-op-safe while staged. Proven in
// tests/unit/plugin-subscribe.test.ts.
//
//   POST /api/muedsat/subscribe  { email, locale?, source?, utm_* }  → adds to the MUEDsat audience
//   and (fail-open) sends the download-link email.
import { NextRequest } from "next/server";
import { handlePluginSubscribe } from "@/lib/plugins/subscribe-handler";

export async function POST(request: NextRequest) {
  return handlePluginSubscribe("muedsat", request);
}
