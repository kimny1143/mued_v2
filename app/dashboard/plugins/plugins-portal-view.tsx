"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import type { PluginKey } from "@/lib/plugins/registry";
import { useTranslations, useLocale } from "next-intl";
import styles from "./plugins-portal.module.css";

// Serializable portal item passed from the server page (PortalItem with claimedAt as an ISO string).
export interface PortalViewItem {
  pluginKey: string;
  i18nNamespace: string;
  version: string;
  downloadUrl: string;
  claimedAtISO: string;
}

// Fixed brand display names + shipped formats (technical labels — not translated). Both current free
// modules ship 3-format + macOS (lib/muedsat/config.ts, lib/muedlim/config.ts).
// ★Record<PluginKey, …>: a 4th free module fails tsc here instead of rendering its raw key as the
// product name (the `?? { name: pluginKey }` fallback below degrades silently — it cannot fail).
const DISPLAY: Record<PluginKey, { name: string; formats: string[] }> = {
  muedsat: { name: "MUEDsat", formats: ["VST3", "AU", "AAX", "macOS"] },
  muedlim: { name: "MUEDlim", formats: ["VST3", "AU", "AAX", "macOS"] },
  muedrive: { name: "MUEDrive", formats: ["VST3", "AU", "AAX", "macOS"] },
};

function fileStem(url: string): string {
  try {
    return decodeURIComponent(url.split("/").pop() ?? "").replace(/\.pkg$/i, "");
  } catch {
    return "";
  }
}

export function PluginsPortalView({ items }: { items: PortalViewItem[] }) {
  const t = useTranslations("pluginPortal");
  const locale = useLocale();
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));

  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1 className={styles.title}>{t("title")}</h1>
        <p className={styles.lede}>{t("lede")}</p>

        <div className={styles.racklabel}>
          <span>{t("owned")}</span> <span className={styles.count}>{items.length}</span>
        </div>

        {items.length > 0 ? (
          <div className={styles.rack}>
            {items.map((it) => {
              // pluginKey is a DB string; an unknown value still renders (degraded) rather than throwing.
                const d = DISPLAY[it.pluginKey as PluginKey] ?? { name: it.pluginKey, formats: [] as string[] };
              return (
                <div className={styles.module} key={it.pluginKey}>
                  <Faceplate pluginKey={it.pluginKey} />
                  <div className={styles.meta}>
                    <div className={styles.name}>
                      <h3>{d.name}</h3>
                      <span className={styles.kind}>{t(`kind.${it.pluginKey}`)}</span>
                    </div>
                    <div className={styles.formats}>
                      {d.formats.map((f) => (
                        <span className={styles.fmt} key={f}>
                          {f}
                        </span>
                      ))}
                    </div>
                    <p className={styles.claimed}>{t("added", { date: fmtDate(it.claimedAtISO) })}</p>
                  </div>
                  <div className={styles.action}>
                    <span className={styles.readout}>
                      <span className={styles.led} aria-hidden="true" />
                      <span className={styles.vlabel}>{t("versionLabel")}</span> {it.version}
                    </span>
                    <a className={styles.dl} href={it.downloadUrl} download>
                      {t("download")}
                      <small>{fileStem(it.downloadUrl)}</small>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyGlyph}>
              <EmptyGlyph />
            </div>
            <h3>{t("empty.title")}</h3>
            <p>{t("empty.body")}</p>
            <Link className={styles.emptyCta} href="/muedsp">
              {t("empty.cta")} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── faceplate thumbnails — evoke each plugin's real UI (SAT drive knob / LIM 2-knob + GR meter /
// DRIVE 3-position CHARACTER + drive knob). ★Record<PluginKey, …> so a 4th module fails tsc rather
// than silently inheriting another product's artwork — the old shape was `if (muedlim) … else muedsat`,
// which would have drawn aria-label="MUEDsat" on the MUEDrive row (product課 2026-08-27).
const FACEPLATE: Record<PluginKey, ReactElement> = {
  muedlim: (
      <svg className={styles.faceplate} viewBox="0 0 96 66" role="img" aria-label="MUEDlim">
    <rect x="8" y="8" width="80" height="50" rx="5" fill="#0d0d10" stroke="#2a2a30" />
    <circle cx="26" cy="30" r="10" fill="#161619" stroke="#3a3a42" />
    <line x1="26" y1="30" x2="26" y2="22" stroke="#e7e7ea" strokeWidth="1.6" strokeLinecap="round" />
    <text x="26" y="49" fill="#6b6b73" fontFamily="monospace" fontSize="5.2" textAnchor="middle">INPUT</text>
    <circle cx="52" cy="30" r="10" fill="#161619" stroke="#3a3a42" />
    <line x1="52" y1="30" x2="58" y2="25" stroke="#f5a524" strokeWidth="1.6" strokeLinecap="round" />
    <text x="52" y="49" fill="#6b6b73" fontFamily="monospace" fontSize="5.2" textAnchor="middle">CEIL</text>
    <rect x="70" y="16" width="10" height="34" rx="2" fill="#141417" stroke="#3a3a42" />
    <rect x="72" y="34" width="6" height="14" rx="1" fill="#f5a524" opacity="0.85" />
    <rect x="72" y="28" width="6" height="4" rx="1" fill="#f5a524" opacity="0.45" />
  </svg>
  ),
  muedsat: (
      <svg className={styles.faceplate} viewBox="0 0 96 66" role="img" aria-label="MUEDsat">
    <defs>
      <radialGradient id="satGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#f5a524" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#f5a524" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect x="8" y="8" width="80" height="50" rx="5" fill="#0d0d10" stroke="#2a2a30" />
    <circle cx="34" cy="33" r="19" fill="url(#satGlow)" />
    <circle cx="34" cy="33" r="13" fill="#161619" stroke="#3a3a42" />
    <line x1="34" y1="33" x2="34" y2="23" stroke="#f5a524" strokeWidth="2" strokeLinecap="round" />
    <text x="34" y="55" fill="#6b6b73" fontFamily="monospace" fontSize="6" textAnchor="middle">DRIVE</text>
    <rect x="60" y="20" width="20" height="9" rx="2" fill="#141417" stroke="#3a3a42" />
    <circle cx="65" cy="24.5" r="2.4" fill="#f5a524" />
    <text x="70" y="46" fill="#8a8a93" fontFamily="monospace" fontSize="8" textAnchor="middle" fontWeight="700">SAT</text>
  </svg>
  ),
  muedrive: (
    <svg className={styles.faceplate} viewBox="0 0 96 66" role="img" aria-label="MUEDrive">
      <rect x="8" y="8" width="80" height="50" rx="5" fill="#0d0d10" stroke="#2a2a30" />
      {/* 3-position CHARACTER selector (tube / warm / console) — the thing that makes it MUEDrive */}
      <circle cx="26" cy="31" r="11" fill="#161619" stroke="#3a3a42" />
      <circle cx="19.5" cy="26" r="1.5" fill="#f5a524" />
      <circle cx="26" cy="23.5" r="1.3" fill="#4a4a52" />
      <circle cx="32.5" cy="26" r="1.3" fill="#4a4a52" />
      <line x1="26" y1="31" x2="20.5" y2="26.6" stroke="#e7e7ea" strokeWidth="1.8" strokeLinecap="round" />
      <text x="26" y="50" fill="#6b6b73" fontFamily="monospace" fontSize="5" textAnchor="middle">CHAR</text>
      {/* DRIVE — the large knob, amber arc */}
      <circle cx="58" cy="30" r="13" fill="#161619" stroke="#3a3a42" />
      <path d="M 48.8 39.2 A 13 13 0 1 1 67.2 39.2" fill="none" stroke="#f5a524" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="58" y1="30" x2="58" y2="20" stroke="#e7e7ea" strokeWidth="1.8" strokeLinecap="round" />
      <text x="58" y="52" fill="#6b6b73" fontFamily="monospace" fontSize="5.6" textAnchor="middle">DRIVE</text>
    </svg>
  ),
};

function Faceplate({ pluginKey }: { pluginKey: string }) {
  // pluginKey comes from the DB row, so an unknown string is possible at runtime; fall back to the
  // saturation art rather than rendering nothing.
  return FACEPLATE[pluginKey as PluginKey] ?? FACEPLATE.muedsat;
}

function EmptyGlyph() {
  return (
    <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
      <rect x="1" y="1" width="24" height="16" rx="2" fill="none" stroke="#3a3a42" />
      <circle cx="8" cy="9" r="3.2" fill="none" stroke="#5a5a63" />
      <circle cx="18" cy="9" r="3.2" fill="none" stroke="#5a5a63" />
    </svg>
  );
}
