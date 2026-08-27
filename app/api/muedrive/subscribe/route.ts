//
// MUEDrive free-download email gate — thin wrapper over the shared plugin subscribe handler
// (案A / registry). Same shape as /api/muedsat/subscribe and /api/muedlim/subscribe.
//
//   POST /api/muedrive/subscribe  { email, locale?, source?, utm_* }  → adds to the MUEDrive Resend
//   audience (RESEND_MUEDRIVE_AUDIENCE_ID) and (fail-open) sends the download-link email. Silent
//   no-op while staged (audience unconfigured) — ships before the audience is provisioned at unlock.
import { NextRequest } from "next/server";
import { handlePluginSubscribe } from "@/lib/plugins/subscribe-handler";

export async function POST(request: NextRequest) {
  return handlePluginSubscribe("muedrive", request);
}
