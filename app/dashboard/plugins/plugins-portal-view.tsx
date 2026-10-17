"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";
import { VERSION_NOTES_ID } from "@/components/features/plugins/plugin-version-notice";
import { useTranslations, useLocale } from "next-intl";
import styles from "./plugins-portal.module.css";
import type { PaidProductKey } from "@/lib/plugins/paid-products";
import { MASTERCHAIN_TRIAL_LIVE } from "@/lib/masterchain/config";
import { MUEDVOX_SCREENSHOT } from "@/lib/muedvox/config";
import { muedvoxManualPath } from "@/lib/muedvox/manual-path";
import { LicenseKeyActions } from "@/components/features/license/license-key-actions";
import { formatUtcMinute } from "@/lib/masterchain/format";

// Serializable portal item passed from the server page (PortalItem with claimedAt as an ISO string).
export interface PortalViewItem {
  pluginKey: string;
  i18nNamespace: string;
  version: string;
  downloadUrl: string;
  /** ★null = included with the family (see lib/plugins/portal.ts), never claimed. */
  claimedAtISO: string | null;
  /**
   * The Windows VST3 beta for this module (lib/plugins/windows-beta.ts). ★Absent/null while the beta is
   * not live. Shown here and ONLY here — the portal is behind the same email sign-up as the Mac build.
   */
  windows?: { url: string; version: string } | null;
  /**
   * The previous build kept beside the current one (lib/plugins/previous-versions.ts). ★Absent/null for a
   * module with none — the row then renders exactly as before.
   */
  previous?: { version: string; macUrl: string; windowsUrl: string | null; changedIn: string } | null;
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

// The artifact's FORMAT, never its name. ★The .pkg files keep their historical "-alpha" filenames on
// purpose (see lib/mued*/config.ts), so quoting the filename here would put a pre-release tag back on
// screen for a shipped product. Stripping "-alpha" out of the displayed filename was rejected as the
// alternative: it prints a name that does not exist, and the viewer can check it against their own
// Downloads folder. Derived from the URL rather than hardcoded so a future .zip/.dmg stays truthful.
function fileExt(url: string): string {
  try {
    const name = decodeURIComponent(url.split("/").pop() ?? "");
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(dot).toLowerCase() : "";
  } catch {
    return "";
  }
}

// A live free module the signed-in user does NOT own yet. ★lpPath, never a .pkg URL — the landing
// page carries the email gate that writes the entitlement, and a direct .pkg download would leave the
// shelf empty forever (see lib/plugins/portal.ts buildAvailableItems).
/**
 * A paid purchase belonging to the signed-in buyer. ★Reaches this component ONLY through
 * getPurchaseItemsForUser, which scopes the query to the caller's Clerk-VERIFIED emails.
 * ★licenseKey is verbatim — the keyfile is signed over its exact bytes, so nothing normalises it.
 */
export interface PurchaseViewItem {
  productKey: PaidProductKey;
  displayName: string;
  keyFileName: string;
  version: string | null;
  downloadUrl: string;
  /** ★null once the purchase was refunded — the key does not reach the client. */
  licenseKey: string | null;
  purchasedAtISO: string;
  /** Set when refunded in full / charged back (return.created). */
  refundedAtISO?: string | null;
  /** masterchain for Windows (VST3) — absent/null until it ships (MASTERCHAIN_WINDOWS_LIVE). */
  windows?: { url: string; version: string } | null;
}

export interface AvailableViewItem {
  pluginKey: string;
  lpPath: string;
}

/** A time-limited key we handed out (a tester's loan). ★No purchase date: this row never says "purchased". */
export interface GrantViewItem {
  productKey: string;
  displayName: string;
  keyFileName: string;
  version: string | null;
  downloadUrl: string;
  windows?: { url: string; version: string } | null;
  licenseKey: string;
  expiresAtISO: string;
  expired: boolean;
}

export interface TrialViewItem {
  licenseKey: string | null;
  expiresAtISO: string;
  expired: boolean;
}

export function PluginsPortalView({
  items,
  available = [],
  purchases = [],
  trial = null,
  grants = [],
}: {
  items: PortalViewItem[];
  available?: AvailableViewItem[];
  purchases?: PurchaseViewItem[];
  trial?: TrialViewItem | null;
  grants?: GrantViewItem[];
}) {
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

        {purchases.length > 0 && (
          <>
            <div className={styles.racklabel}>
              <span>{t("purchased.label")}</span>{" "}
              <span className={styles.count}>{purchases.length}</span>
            </div>
            <div className={styles.rack}>
              {purchases.map((p) => (
                <PurchaseCard key={p.licenseKey} item={p} fmtDate={fmtDate} />
              ))}
            </div>
          </>
        )}

        {grants.length > 0 && (
          <>
            <div className={styles.racklabel}>
              <span>{t("grant.label")}</span>{" "}
              <span className={styles.count}>{grants.length}</span>
            </div>
            <div className={styles.rack}>
              {grants.map((g) => (
                <GrantCard key={g.licenseKey} item={g} />
              ))}
            </div>
          </>
        )}

        {MASTERCHAIN_TRIAL_LIVE && trial && (
          <>
            <div className={styles.racklabel}>{t("trial.label")}</div>
            <section className={styles.module} aria-label={t("trial.label")}>
              <Faceplate pluginKey="masterchain" />
              <div className={styles.meta}>
                <div className={styles.name}><h3>masterchain</h3><span className={styles.kind}>{t("trial.label")}</span></div>
                {purchases.length > 0 ? <p className={styles.claimed}>{t("trial.replaced")}</p> : (
                  <>
                    {trial.licenseKey && <LicenseKeyActions licenseKey={trial.licenseKey} label={t("trial.keyLabel")} copyLabel={t("trial.copy")} copiedLabel={t("trial.copied")} failedLabel={t("trial.copyFailed")} downloadLabel={t("trial.download")} />}
                    <p className={styles.howto}>{t("trial.howto")}</p>
                    <p className={styles.claimed}>{t("trial.ends", { date: formatUtcMinute(trial.expiresAtISO) })}</p>
                    {trial.expired && <p className={styles.claimed}>{t("trial.ended")}</p>}
                    <p className={styles.howto}>{t("trial.bypass")}</p>
                  </>
                )}
              </div>
            </section>
          </>
        )}

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
                    {/* ★No claim date for a module included with the family — say that, rather than
                        printing a date nobody recorded. */}
                    <p className={styles.claimed}>
                      {it.claimedAtISO ? t("added", { date: fmtDate(it.claimedAtISO) }) : t("included")}
                    </p>
                  </div>
                  <div className={styles.action}>
                    <span className={styles.readout}>
                      <span className={styles.led} aria-hidden="true" />
                      <span className={styles.vlabel}>{t("versionLabel")}</span> {it.version}
                    </span>
                    <a className={styles.dl} href={it.downloadUrl} download>
                      {t("download")}
                      <small>{`${d.name} ${it.version}${fileExt(it.downloadUrl) ? ` · ${fileExt(it.downloadUrl)}` : ""}`}</small>
                    </a>
                    {it.windows && (
                      <a className={styles.dlAlt} href={it.windows.url} download data-testid="portal-windows-beta">
                        {t("windows.download")}
                        <small>{`${d.name} ${it.windows.version} · VST3 · ${fileExt(it.windows.url)}`}</small>
                      </a>
                    )}
                  </div>
                  {/* ★A new build that changes what an existing session plays: say what changed, and keep the
                      previous installer one click away (kimny 2026-10-09). Text links, so the current build
                      stays the one button. */}
                  {it.previous && (
                    <div className={styles.previous} data-testid="portal-previous-version">
                      <p className={styles.howto}>
                        {t(`changes.${it.pluginKey}.summary`, { version: it.version, previous: it.previous.version, since: it.previous.changedIn })}{" "}
                        {PLUGIN_DIST[it.pluginKey as PluginKey] && (
                          <Link href={`/${locale}${PLUGIN_DIST[it.pluginKey as PluginKey].lpPath}#${VERSION_NOTES_ID}`} data-testid="portal-version-notes-link">
                            {t(`changes.${it.pluginKey}.more`)}
                          </Link>
                        )}
                      </p>
                      <p className={styles.howto}>{t(`changes.${it.pluginKey}.revert`, { version: it.version, previous: it.previous.version })}</p>
                      <p className={styles.howto}>
                        {t("previous.label", { name: d.name, version: it.previous.version })}{" "}
                        <a href={it.previous.macUrl} download data-testid="portal-previous-mac">
                          {t("previous.mac", { ext: fileExt(it.previous.macUrl) })}
                        </a>
                        {it.previous.windowsUrl && (
                          <>
                            {" · "}
                            <a href={it.previous.windowsUrl} download data-testid="portal-previous-windows">
                              {t("previous.windows", { ext: fileExt(it.previous.windowsUrl) })}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {/* ★Same steps as the zip's INSTALL.txt — the one mistake it guards against is copying the
                outer folder that Windows "Extract All" creates. */}
            {items.some((it) => it.windows) && <p className={styles.howto}>{t("windows.howto")}</p>}
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyGlyph}>
              <EmptyGlyph />
            </div>
            <h3>{t("empty.title")}</h3>
            <p>{t("empty.body")}</p>
            {/* ★Locale-prefixed. The bare `/muedsp` 307s to /en unconditionally, ignoring the reader's
                locale — so a JA visitor with an empty shelf was sent to the English catalogue. This
                component already knows the locale (useLocale above); the non-locale pages under
                app/learn keep the bare form on purpose, since they have no locale to carry. */}
            <Link className={styles.emptyCta} href={`/${locale}/muedsp`}>
              {t("empty.cta")} →
            </Link>
          </div>
        )}

        {available.length > 0 && (
          <>
            <div className={styles.racklabel}>
              <span>{t("available.label")}</span> <span className={styles.count}>{available.length}</span>
            </div>
            <p className={styles.lede}>{t("available.body")}</p>
            <div className={styles.rack}>
              {available.map((a) => {
                const d = DISPLAY[a.pluginKey as PluginKey] ?? { name: a.pluginKey, formats: [] as string[] };
                return (
                  <div className={styles.module} key={a.pluginKey}>
                    <Faceplate pluginKey={a.pluginKey} />
                    <div className={styles.meta}>
                      <div className={styles.name}>
                        <h3>{d.name}</h3>
                        <span className={styles.kind}>{t(`kind.${a.pluginKey}`)}</span>
                      </div>
                      <div className={styles.formats}>
                        {d.formats.map((f) => (
                          <span className={styles.fmt} key={f}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.action}>
                      {/* ★Locale-prefixed LP, never `downloadUrl`. The gate on that page is what writes
                          the entitlement; linking the .pkg would download the plugin and leave this
                          shelf unchanged — the same failure this section exists to fix. */}
                      <Link className={styles.emptyCta} href={`/${locale}${a.lpPath}`}>
                        {t("available.cta")} →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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

function PurchaseCard({
  item,
  fmtDate,
}: {
  item: PurchaseViewItem;
  fmtDate: (iso: string) => string;
}) {
  const t = useTranslations("pluginPortal");
  return (
    <div className={styles.module}>
      <PaidPlate productKey={item.productKey} />
      <div className={styles.meta}>
        <div className={styles.name}>
          <h3>{item.displayName}</h3>
          <span className={styles.kind}>{item.productKey === "masterchain" ? t("purchased.kind") : t("purchased.kindMuedvox")}</span>
        </div>
        <p className={styles.claimed}>{t("purchased.purchasedOn", { date: fmtDate(item.purchasedAtISO) })}</p>
        {/* ★Refunded: the row stays (it happened), marked, with no Copy / Download of the key (conductor 2026-09-30). */}
        {item.refundedAtISO || !item.licenseKey ? (
          <p className={styles.claimed} data-testid="purchase-refunded">
            {t("purchased.refunded", { date: fmtDate(item.refundedAtISO ?? item.purchasedAtISO) })}
          </p>
        ) : (
          <>
            <LicenseKeyActions licenseKey={item.licenseKey} fileName={item.keyFileName} label={t("purchased.licenseLabel")} copyLabel={t("purchased.copy")} copiedLabel={t("purchased.copied")} failedLabel={t("purchased.copyFailed")} downloadLabel={t("purchased.download")} />
            <p className={styles.howto}>{t("purchased.howto", { product: item.displayName, masterchain: item.productKey === "masterchain" ? "yes" : "no" })}</p>
            {item.windows && (
              <>
                {item.productKey === "masterchain" && <p className={styles.howto} data-testid="portal-masterchain-windows-note">{t("windows.masterchainSameKey")}</p>}
                <p className={styles.howto}>{t("windows.howto")}</p>
              </>
            )}
            <ManualLink productKey={item.productKey} displayName={item.displayName} />
          </>
        )}
      </div>
      <div className={styles.action}>
        {item.version && (
          <span className={styles.readout}>
            <span className={styles.led} aria-hidden="true" />
            <span className={styles.vlabel}>{t("versionLabel")}</span> {item.version}
          </span>
        )}
        {item.downloadUrl && <a className={styles.dl} href={item.downloadUrl} download>
          {t("download")}
          <small>{`${item.displayName}${item.version ? ` ${item.version}` : ""}${fileExt(item.downloadUrl) ? ` · ${fileExt(item.downloadUrl)}` : ""}`}</small>
        </a>}
        {/* ★Windows: the same license key (conductor 2026-10-01). Shown only once it ships and while not refunded. */}
        {item.windows && (
          <a className={styles.dlAlt} href={item.windows.url} download data-testid="portal-masterchain-windows">
            {t("windows.masterchainDownload")}
            <small>{`${item.displayName} ${item.windows.version} · VST3 · ${fileExt(item.windows.url)}`}</small>
          </a>
        )}
      </div>
    </div>
  );
}

/** The product's manual, for the products that have one (MUEDvox: conductor 2026-10-16). */
function ManualLink({ productKey, displayName }: { productKey: string; displayName: string }) {
  const t = useTranslations("pluginPortal");
  const locale = useLocale();
  if (productKey !== "muedvox") return null;
  return (
    <p className={styles.howto}>
      <Link href={muedvoxManualPath(locale)} data-testid="portal-manual-link">{t("manualLink", { product: displayName })}</Link>
    </p>
  );
}

/** A tester's time-limited key. Same downloads and key actions as a purchase; its own words — no "purchased". */
function GrantCard({ item }: { item: GrantViewItem }) {
  const t = useTranslations("pluginPortal");
  return (
    <div className={styles.module} data-testid="portal-grant">
      <PaidPlate productKey={item.productKey} />
      <div className={styles.meta}>
        <div className={styles.name}>
          <h3>{item.displayName}</h3>
          <span className={styles.kind}>{t("grant.kind")}</span>
        </div>
        <p className={styles.claimed} data-testid="portal-grant-expiry">
          {item.expired ? t("grant.ended", { date: formatUtcMinute(item.expiresAtISO) }) : t("grant.ends", { date: formatUtcMinute(item.expiresAtISO) })}
        </p>
        <LicenseKeyActions licenseKey={item.licenseKey} fileName={item.keyFileName} label={t("purchased.licenseLabel")} copyLabel={t("purchased.copy")} copiedLabel={t("purchased.copied")} failedLabel={t("purchased.copyFailed")} downloadLabel={t("purchased.download")} />
        <p className={styles.howto}>{t("purchased.howto", { product: item.displayName, masterchain: item.productKey === "masterchain" ? "yes" : "no" })}</p>
        {item.windows && <p className={styles.howto}>{t("windows.howto")}</p>}
        <ManualLink productKey={item.productKey} displayName={item.displayName} />
      </div>
      <div className={styles.action}>
        {item.version && (
          <span className={styles.readout}>
            <span className={styles.led} aria-hidden="true" />
            <span className={styles.vlabel}>{t("versionLabel")}</span> {item.version}
          </span>
        )}
        {item.downloadUrl && <a className={styles.dl} href={item.downloadUrl} download>
          {t("download")}
          <small>{`${item.displayName}${item.version ? ` ${item.version}` : ""}${fileExt(item.downloadUrl) ? ` · ${fileExt(item.downloadUrl)}` : ""}`}</small>
        </a>}
        {item.windows && (
          <a className={styles.dlAlt} href={item.windows.url} download data-testid="portal-grant-windows">
            {t("windows.masterchainDownload")}
            <small>{`${item.displayName} ${item.windows.version} · VST3 · ${fileExt(item.windows.url)}`}</small>
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * The plate at the left of a paid product's card. ★Every card has one: the card is a three-column grid
 * (plate | text | actions), so a card without a plate puts its text in the 96px plate column — MUEDvox's purchase
 * row did exactly that on launch night (2026-10-13: the key wrapped every 8 characters). The CSS now pins the
 * columns too, so a missing plate can no longer move the text.
 * MUEDvox shows its own screen (the same image as its cart); it has no drawn faceplate.
 */
export function PaidPlate({ productKey }: { productKey: string }) {
  if (productKey === "muedvox" && MUEDVOX_SCREENSHOT) {
    return <Image src={MUEDVOX_SCREENSHOT} alt="" width={192} height={132} sizes="96px" className={`${styles.faceplate} ${styles.plateImage}`} data-testid="paid-plate-muedvox" />;
  }
  return <Faceplate pluginKey={productKey} />;
}

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
