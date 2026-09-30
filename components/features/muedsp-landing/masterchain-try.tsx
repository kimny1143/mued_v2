"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { MASTERCHAIN_DEMO_LIVE } from "@/lib/masterchain/config";
import { trackCtaClick } from "@/lib/analytics/gtag";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DemoError = "invalid_email" | "disposable_email" | "rate_limited" | "generic";

/**
 * masterchain's demo ("Try"). The purchase lives beside masterchain's heading (MasterchainBuyButton —
 * kimny 2026-10-01); this block is the demo only: [Try masterchain] → the email it needs → the updates
 * opt-in (default off) → one short line. Try works only once a well-formed email is in the field, and only
 * once (no second receipt after a successful send).
 */
export function MasterchainTry() {
  const t = useTranslations("muedsp.buyTry");
  const td = useTranslations("muedsp.demo");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<DemoError>("generic");
  const emailOk = EMAIL_RE.test(email.trim());
  // ★Once the demo has been sent, Try stays done (CCO #1187): a second press would send a second receipt.
  const canTry = MASTERCHAIN_DEMO_LIVE && emailOk && status !== "submitting" && status !== "success";

  if (!MASTERCHAIN_DEMO_LIVE) return null;

  async function tryDemo(event: React.FormEvent) {
    event.preventDefault();
    if (!canTry) return;
    setStatus("submitting");
    // ★Same GA4 event as the free three's forms (cta_click / download_form); GA4 ties it to the session's utm.
    trackCtaClick("masterchain", "demo_form", "download_form");
    try {
      const attribution = Object.fromEntries(
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].map((key) => [key, searchParams.get(key) ?? undefined]),
      );
      const response = await fetch("/api/masterchain/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale, marketingOptIn, website, ...attribution }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || typeof data.downloadUrl !== "string") {
        setError(["invalid_email", "disposable_email", "rate_limited"].includes(data.error) ? data.error : "generic");
        setStatus("error");
        return;
      }
      window.location.assign(data.downloadUrl);
      setStatus("success");
    } catch {
      setError("generic");
      setStatus("error");
    }
  }

  return (
    <form id="demo" onSubmit={tryDemo} noValidate className="max-w-xl scroll-mt-20 space-y-4" aria-busy={status === "submitting"}>
      <button
        type="submit"
        disabled={!canTry}
        aria-disabled={!canTry}
        className={
          canTry
            ? "rounded-[var(--radius-sm)] border border-[#f5a524]/60 px-5 py-3 font-semibold text-[#f5a524] transition hover:bg-[#f5a524]/10"
            : "cursor-not-allowed rounded-[var(--radius-sm)] border border-white/15 px-5 py-3 font-semibold text-white/35"
        }
      >
        {t("try")}
      </button>
      <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="masterchain-demo-website">{locale === "ja" ? "この欄は空欄のままにしてください" : "Leave this field empty"}</label>
        <input id="masterchain-demo-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {status === "success" ? (
        <p role="status" className="text-sm text-[#f5a524]">{td("success")}</p>
      ) : (
        <>
          <input
            id="masterchain-demo-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-label={t("emailLabel")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            aria-invalid={status === "error" && error === "invalid_email"}
            aria-describedby={status === "error" ? "masterchain-demo-error" : "masterchain-demo-note"}
            className="w-full rounded-[var(--radius-sm)] border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#f5a524]"
          />
          <label className="flex items-start gap-2 text-sm text-white/65">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1 accent-[#f5a524]" />
            {td("consent")}
          </label>
          {status === "error" && <p id="masterchain-demo-error" role="alert" className="text-sm text-red-400">{td(`errors.${error}`)}</p>}
        </>
      )}
      <p id="masterchain-demo-note" className="text-xs leading-relaxed text-white/50">{t("demoNote")}</p>
    </form>
  );
}
