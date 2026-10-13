// MUEDvox's demo entrance (server). Same flow as masterchain's (lib/masterchain/demo-handler.ts): email → the
// shared MUEDsp list → the public installer (no key = demo) → one receipt. Only what differs is here.
import type { DemoProduct } from "@/lib/masterchain/demo-handler";
import { emailService } from "@/lib/services/email.service";
import { MUEDVOX_DEMO_LIVE, MUEDVOX_DOWNLOAD_URL, MUEDVOX_WINDOWS_URL } from "./config";

export const MUEDVOX_DEMO: DemoProduct = {
  tag: "muedvox/demo",
  // ★Both, not either: with the flag on but no installer URL the handler would answer `downloadUrl: ""` and the
  //   form would "start" a download of nothing. tests/unit/muedvox-launch-gates.test.ts pins the same rule on the flags.
  get live() { return MUEDVOX_DEMO_LIVE && MUEDVOX_DOWNLOAD_URL !== ""; },
  get downloadUrl() { return MUEDVOX_DOWNLOAD_URL; },
  get windowsUrl() { return MUEDVOX_WINDOWS_URL || null; },
  sendReceipt: (email, locale) => emailService.sendMuedvoxDemoDownload({ email }, { locale }),
};
