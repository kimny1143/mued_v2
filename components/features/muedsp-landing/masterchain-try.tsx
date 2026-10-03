"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { MASTERCHAIN_DEMO_LIVE } from "@/lib/masterchain/config";
import { trackCtaClick } from "@/lib/analytics/gtag";
import { detectDemoOs, planDemoDownload, type DemoDownloadPlan } from "@/lib/masterchain/demo-download";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DemoError = "invalid_email" | "disposable_email" | "rate_limited" | "generic";

/**
 * masterchain's demo ("Try"). The purchase lives beside masterchain's heading (MasterchainBuyButton).
 * ★Same parts and order as the free three's form (components/features/muedsat-landing/muedsat-signup-form.tsx —
 *   kimny 2026-10-04: 「無料の方はデカいオレンジのボタンをただ押すだけなら赤いメッセージ…どっちがわかりやすいか、
 *   押しやすいか明白だ」): [email | filled orange Try] → the updates opt-in (default off) → one short line.
 *   Try is always pressable; a malformed email answers with the red message instead of a greyed-out button.
 *   Only once: no second receipt after a successful send.
 */
export function MasterchainTry() {
  const t = useTranslations("muedsp.buyTry");
  const td = useTranslations("muedsp.demo");
  const twin = useTranslations("muedsp.windows");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<DemoError>("generic");
  const [offer, setOffer] = useState<DemoDownloadPlan["offer"]>([]);
  // ★Once the demo has been sent, Try stays done (CCO #1187): a second press would send a second receipt.
  const busy = status === "submitting" || status === "success";

  if (!MASTERCHAIN_DEMO_LIVE) return null;

  async function tryDemo(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!EMAIL_RE.test(email.trim())) {
      setError("invalid_email");
      setStatus("error");
      return;
    }
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
      // ★Mac only until masterchain for Windows ships (no windowsDownloadUrl) — then the visitor's OS picks, the
      //   other is offered as a link, and an unknown OS gets both side by side (lib/masterchain/demo-download.ts).
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      const plan = planDemoDownload(
        detectDemoOs({ platform: nav.userAgentData?.platform, userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints }),
        data.downloadUrl,
        typeof data.windowsDownloadUrl === "string" ? data.windowsDownloadUrl : null,
      );
      if (plan.start) window.location.assign(plan.start);
      setOffer(plan.offer);
      setStatus("success");
    } catch {
      setError("generic");
      setStatus("error");
    }
  }

  return (
    <form id="demo" onSubmit={tryDemo} noValidate className="max-w-xl scroll-mt-20 space-y-4" aria-busy={status === "submitting"}>
      <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="masterchain-demo-website">{locale === "ja" ? "この欄は空欄のままにしてください" : "Leave this field empty"}</label>
        <input id="masterchain-demo-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      {status === "success" ? (
        <div role="status" className="space-y-2">
          {/* ★When the OS could not be told, nothing was started — so do not say it was (kimny: 「事実と違うことは
              書かないで」). Only then: "pick one below; the receipt has both links". */}
          <p className="text-sm text-[#f5a524]">{offer.length > 1 ? twin("demoChoose") : td("success")}</p>
          {offer.length > 0 && (
            <p className="flex flex-wrap gap-4 text-sm" data-testid="masterchain-demo-offer">
              {offer.map((o) => (
                <a key={o.os} href={o.url} className="text-[#f5a524] underline underline-offset-2">
                  {twin(o.os === "mac" ? "demoOtherMac" : "demoOtherWindows")}
                </a>
              ))}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="masterchain-demo-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-label={t("emailLabel")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder={t("emailPlaceholder")}
              aria-invalid={status === "error" && error === "invalid_email"}
              aria-describedby={status === "error" ? "masterchain-demo-error" : "masterchain-demo-note"}
              className="min-w-0 flex-1 rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.04] px-4 py-3.5 font-mono text-white placeholder:text-white/30 transition-colors focus:border-[#f5a524]/60 focus:outline-none focus:ring-1 focus:ring-[#f5a524]/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3.5 font-semibold text-black transition-colors hover:bg-[#ffb638] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("try")}
            </button>
          </div>
          {status === "error" && <p id="masterchain-demo-error" role="alert" className="text-sm text-red-400">{td(`errors.${error}`)}</p>}
          <label className="flex items-start gap-2 text-sm text-white/65">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1 accent-[#f5a524]" />
            {td("consent")}
          </label>
        </>
      )}
      <p id="masterchain-demo-note" className="text-xs leading-relaxed text-white/50">{t("demoNote")}</p>
    </form>
  );
}
