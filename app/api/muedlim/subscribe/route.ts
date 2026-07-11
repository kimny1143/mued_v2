//
// MUEDlim free-download email gate — thin wrapper over the shared plugin subscribe handler
// (案A / registry). Same shape as /api/muedsat/subscribe.
//
//   POST /api/muedlim/subscribe  { email, locale?, source?, utm_* }  → adds to the MUEDlim Resend
//   audience (RESEND_MUEDLIM_AUDIENCE_ID) and (fail-open) sends the download-link email. Silent
//   no-op while staged (audience unconfigured) — ships before the audience is provisioned at unlock.
import { NextRequest } from "next/server";
import { handlePluginSubscribe } from "@/lib/plugins/subscribe-handler";

export async function POST(request: NextRequest) {
  return handlePluginSubscribe("muedlim", request);
}
