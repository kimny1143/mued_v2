//
// Client-safe distribution registry for the MUEDsp free-download plugin family (MUEDsat, MUEDlim,
// + future modules). Centralizes per-plugin config so the shared email-gate form + subscribe
// pipeline can be reused (案A / registry — conductor-approved 2026-07-11). By-construction backward
// compatible: `muedsat` mirrors the exact current MUEDsat constants, so migrating MUEDsat to the
// registry does not change its runtime behavior (regression 0 — proven in the plugin-subscribe test).
//
// CLIENT-SAFE ONLY: no process.env secrets here (the form imports this). The Resend audience id is
// read server-side in lib/plugins/audience.ts via `audienceEnvName` (the env var NAME is not a value).
import { MUEDSAT_LIVE, MUEDSAT_DOWNLOAD_URL, MUEDSAT_PRESS_TOKEN } from "@/lib/muedsat/config";
import { MUEDLIM_LIVE, MUEDLIM_DOWNLOAD_URL, MUEDLIM_PRESS_TOKEN } from "@/lib/muedlim/config";

export type PluginKey = "muedsat" | "muedlim";

export interface PluginDist {
  key: PluginKey;
  /** staged flag — the section/discoverability is gated on this. */
  live: boolean;
  /** download URL for the welcome email + press bypass; empty until go-live (kimny gate). */
  downloadUrl: string;
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

// ── Honeypot (bot-trap) for the public email gate ─────────────────────────────
// The email gate is public and unauthenticated; a naive bot that POSTs to the subscribe endpoint (or
// autofills every field on the form) burns the Resend send quota one welcome email at a time. A
// honeypot is the cheapest defense with zero false positives and no infra: a decoy field hidden from
// humans (CSS off-screen + aria-hidden + tabindex -1 + autocomplete off) that real users never fill,
// but form-filling bots do. The server treats any non-empty value as a bot and SILENTLY no-ops (same
// 200 shape as the not-live path) — the bot can't tell it was blocked, and no email/quota is spent.
//
// CLIENT-SAFE: this constant + predicate are imported by both the client form and the server handler
// so the field name stays in one place (no drift). No secrets.
export const HONEYPOT_FIELD = "website" as const;

/** True when the honeypot decoy field carries a value — i.e. the submitter is (almost certainly) a bot. */
export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
