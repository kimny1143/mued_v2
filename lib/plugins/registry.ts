//
// Client-safe distribution registry for the MUEDsp free-download plugin family (MUEDsat, MUEDlim,
// + future modules). Centralizes per-plugin config so the shared email-gate form + subscribe
// pipeline can be reused (案A / registry — conductor-approved 2026-07-11). By-construction backward
// compatible: `muedsat` mirrors the exact current MUEDsat constants, so migrating MUEDsat to the
// registry does not change its runtime behavior (regression 0 — proven in the plugin-subscribe test).
//
// CLIENT-SAFE ONLY: no process.env secrets here (the form imports this). The Resend audience id is
// read server-side in lib/plugins/audience.ts via `audienceEnvName` (the env var NAME is not a value).
import { MUEDSAT_LIVE, MUEDSAT_DOWNLOAD_URL, MUEDSAT_PRESS_TOKEN, MUEDSAT_VERSION } from "@/lib/muedsat/config";
import { MUEDLIM_LIVE, MUEDLIM_DOWNLOAD_URL, MUEDLIM_PRESS_TOKEN, MUEDLIM_VERSION } from "@/lib/muedlim/config";

export type PluginKey = "muedsat" | "muedlim";

export interface PluginDist {
  key: PluginKey;
  /** staged flag — the section/discoverability is gated on this. */
  live: boolean;
  /** download URL for the welcome email + press bypass; empty until go-live (kimny gate). */
  downloadUrl: string;
  /** current build version shown in the user portal (P-2); updated with downloadUrl in the same PR. */
  version: string;
  /** press/reviewer bypass token (dormant when empty). */
  pressToken: string;
  /** capture source label (analytics + the subscribe payload's `source`). */
  source: string;
  /** i18n namespace for the form + section copy ("muedsat" | "muedlim"). */
  i18nNamespace: string;
  /** POST target for the email-gate form. */
  subscribeEndpoint: string;
  /** NAME of the Resend audience env var — the VALUE is read server-side (lib/plugins/audience.ts). */
  audienceEnvName: string;
}

export const PLUGIN_DIST: Record<PluginKey, PluginDist> = {
  // muedsat — mirrors the exact current MUEDsat constants (byte-for-byte; runtime unchanged).
  muedsat: {
    key: "muedsat",
    live: MUEDSAT_LIVE,
    downloadUrl: MUEDSAT_DOWNLOAD_URL,
    version: MUEDSAT_VERSION,
    pressToken: MUEDSAT_PRESS_TOKEN,
    source: "muedsat_lp",
    i18nNamespace: "muedsat",
    subscribeEndpoint: "/api/muedsat/subscribe",
    audienceEnvName: "RESEND_MUEDSAT_AUDIENCE_ID",
  },
  muedlim: {
    key: "muedlim",
    live: MUEDLIM_LIVE,
    downloadUrl: MUEDLIM_DOWNLOAD_URL,
    version: MUEDLIM_VERSION,
    pressToken: MUEDLIM_PRESS_TOKEN,
    source: "muedlim_lp",
    i18nNamespace: "muedlim",
    subscribeEndpoint: "/api/muedlim/subscribe",
    audienceEnvName: "RESEND_MUEDLIM_AUDIENCE_ID",
  },
};

export function getPluginDist(plugin: PluginKey): PluginDist {
  return PLUGIN_DIST[plugin];
}
