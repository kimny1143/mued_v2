"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { MASTERCHAIN_DEMO_LIVE } from "@/lib/masterchain/config";
import { trackCtaClick } from "@/lib/analytics/gtag";

export function MasterchainDemoForm() {
  if (!MASTERCHAIN_DEMO_LIVE) return null;
  return <DemoForm />;
}

function DemoForm() {
  const t = useTranslations("muedsp.demo");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<"invalid_email" | "disposable_email" | "rate_limited" | "generic">("generic");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    // ★Same GA4 event as the free three's forms (cta_click / download_form). GA4 attributes it to the
    //   session's utm, which is how the demo entry's utm is measured — the demo writes no DB row by design.
    trackCtaClick("masterchain", "demo_form", "download_form");
    try {
      const attribution = Object.fromEntries(
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
          .map((key) => [key, searchParams.get(key) ?? undefined]),
      );
      const response = await fetch("/api/masterchain/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, marketingOptIn, website, ...attribution }),
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

  if (status === "success") return <p role="status" className="text-sm text-[#f5a524]">{t("success")}</p>;

  return (
    <form onSubmit={submit} noValidate className="w-full space-y-3" aria-busy={status === "submitting"}>
      <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="masterchain-demo-website">{locale === "ja" ? "この欄は空欄のままにしてください" : "Leave this field empty"}</label>
        <input id="masterchain-demo-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label htmlFor="masterchain-demo-email" className="block text-sm text-white/70">{t("emailLabel")}</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input id="masterchain-demo-email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("emailPlaceholder")} aria-invalid={status === "error" && error === "invalid_email"} aria-describedby={status === "error" ? "masterchain-demo-error" : "masterchain-demo-note"} className="min-w-0 flex-1 rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-white focus:outline-none focus:ring-2 focus:ring-[#f5a524]" />
        <button type="submit" disabled={status === "submitting"} className="rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3 font-semibold text-black hover:bg-[#ffb638] disabled:opacity-60">{t("submit")}</button>
      </div>
      <label className="flex items-start gap-2 text-sm text-white/70">
        <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} className="mt-1 accent-[#f5a524]" />
        {t("consent")}
      </label>
      <p id="masterchain-demo-note" className="text-sm text-white/50">{t("note")}</p>
      {status === "error" && <p id="masterchain-demo-error" role="alert" className="text-sm text-red-400">{t(`errors.${error}`)}</p>}
    </form>
  );
}
