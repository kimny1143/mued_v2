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
import { MUEDRIVE_LIVE, MUEDRIVE_DOWNLOAD_URL, MUEDRIVE_PRESS_TOKEN, MUEDRIVE_VERSION } from "@/lib/muedrive/config";

export type PluginKey = "muedsat" | "muedlim" | "muedrive";

/**
 * ★The one Resend audience the North Star counts. `muedsp_reachable` is the distinct count of
 * subscribed contacts in THIS audience (scripts/aggregate-plugin-funnel-daily.ts), so a plugin whose
 * own audience env points anywhere else contributes nothing to it — silently.
 *
 * ★Declared here, once, and imported by both the app and the collector. The collector used to
 * hardcode this same literal; a second definition of a fact is how MUEDrive shipped counting zero
 * (see PLUGIN_KEYS in that file — the identical mistake, one type declaration earlier).
 */
export const MUEDSP_AUDIENCE_ID = "243e06eb-1ddc-441d-a241-1e2044ef4b5f";

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
  /**
   * Landing-page path (locale-prefixed at render: `/{locale}{lpPath}`) — the page that carries the
   * email gate. ★The portal's "not on your shelf yet" affordance links HERE and never at
   * `downloadUrl`: the direct .pkg bypasses the gate, so no entitlement row is written and the module
   * would never move onto the shelf — the same bug in a new shape.
   */
  lpPath: string;
  /**
   * NAME of the Resend audience env var — the VALUE is read server-side (lib/plugins/audience.ts).
   *
   * ★These names are per-product for historical reasons ONLY. They do not imply per-product lists.
   * kimny 2026-08-27: "MUEDsp はプラグイン全てを包括したブランド名" — there is ONE MUEDsp audience
   * and every module points at it. Measured the same day: the account holds two segments total
   * (MUEDsp, General); no per-product segment has ever existed.
   * ★Do not infer "a new module needs a new audience" from the fact that this name is new — that
   * inference was made here on 2026-08-27 from the variable names alone and was wrong.
   */
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
    lpPath: "/muedsat",
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
    lpPath: "/muedlim",
    audienceEnvName: "RESEND_MUEDLIM_AUDIENCE_ID",
  },
  // muedrive — third free module. Started outside MUEDsp masterchain (standalone), unlike the first two.
  muedrive: {
    key: "muedrive",
    live: MUEDRIVE_LIVE,
    downloadUrl: MUEDRIVE_DOWNLOAD_URL,
    version: MUEDRIVE_VERSION,
    pressToken: MUEDRIVE_PRESS_TOKEN,
    source: "muedrive_lp",
    i18nNamespace: "muedrive",
    subscribeEndpoint: "/api/muedrive/subscribe",
    lpPath: "/muedrive",
    audienceEnvName: "RESEND_MUEDRIVE_AUDIENCE_ID",
  },
};

export function getPluginDist(plugin: PluginKey): PluginDist {
  return PLUGIN_DIST[plugin];
}

// ── Honeypot (bot-trap) for the public email gate ─────────────────────────────
// The email gate is public and unauthenticated; a naive bot that POSTs to the subscribe endpoint (or
// autofills every text field on the form) burns the Resend send quota one welcome email at a time. A
// honeypot is the cheapest defense with no infra: a decoy field hidden from humans (CSS off-screen +
// tabindex -1 + autocomplete off, labeled "leave empty") that real users never fill, but form-filling
// bots do (naive bots fill EVERY text input regardless of name). The server treats any non-empty value
// as a bot and SILENTLY no-ops (same 200 shape as the not-live path) — the bot can't tell it was
// blocked, and no email/quota is spent.
//
// Field name is deliberately OUTSIDE the browser-autofill vocabulary (not "url"/"website"/"email"/
// "phone"/"address"/…) so a real user's autofill / password manager won't fill it and get silently
// dropped (autocomplete="off" is not universally honored — product課 review #687 ③). It is still a
// plain text input, so naive form-fillers still trip it.
//
// CLIENT-SAFE: this constant + predicate are the SINGLE SOURCE for the field name, imported by the
// client form, the server handler + zod schema, and the tests (no drift). No secrets.
export const HONEYPOT_FIELD = "contact_ref" as const;

/** True when the honeypot decoy field carries a value — i.e. the submitter is (almost certainly) a bot. */
export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
