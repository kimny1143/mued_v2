"use client";

// MUEDsat email gate. Submitting IS the opt-in ("your email is the price of the download").
// POSTs to /api/muedsat/subscribe (no-op-safe while staged) and shows an honest success state.
//
// Press design-room (dormant): if `?press=<token>` matches MUEDSAT_PRESS_TOKEN (empty by default,
// so the check is always false) AND a download URL exists, the direct download is revealed without
// the email gate. Costs nothing until a press push sets the token — no retrofit needed.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { MUEDSAT_DOWNLOAD_URL, MUEDSAT_PRESS_TOKEN } from "@/lib/muedsat/config";
import { trackCtaClick } from "@/lib/analytics/gtag";

type Status = "idle" | "submitting" | "success" | "error";

// Light client-side pre-check (the server's zod is authoritative).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Static shell rendered during the Suspense fallback (the form uses useSearchParams, which needs a
// Suspense boundary on a statically-prerendered page). Visually identical, non-interactive; the real
// interactive form swaps in on hydration.
export function MuedsatSignupFormFallback() {
  const t = useTranslations("muedsat.form");
  return (
    <div className="w-full" aria-hidden="true">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1 rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.04] px-4 py-3.5 font-mono text-white/30">
          {t("emailPlaceholder")}
        </div>
        <div className="shrink-0 rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3.5 text-center font-semibold text-black opacity-60">
          {t("submit")}
        </div>
      </div>
      <p className="mt-2.5 text-sm text-white/40">{t("note")}</p>
    </div>
  );
}

export function MuedsatSignupForm() {
  const t = useTranslations("muedsat.form");
  const locale = useLocale() as "ja" | "en";
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<"errorEmail" | "errorGeneric">("errorGeneric");

  // Dormant press bypass — false unless a token is provisioned.
  const pressUnlocked =
    !!MUEDSAT_PRESS_TOKEN &&
    searchParams.get("press") === MUEDSAT_PRESS_TOKEN &&
    !!MUEDSAT_DOWNLOAD_URL;

  if (pressUnlocked) {
    return (
      <a
        href={MUEDSAT_DOWNLOAD_URL}
        className="inline-flex items-center justify-center rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3.5 font-semibold text-black transition-colors hover:bg-[#ffb638]"
      >
        {t("submit")}
      </a>
    );
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-[var(--radius-lg)] border border-[#f5a524]/30 bg-[#f5a524]/[0.06] p-5"
      >
        <p className="text-base font-semibold text-[#f5a524]">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-white/70">{t("successBody")}</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setErrorKey("errorEmail");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    trackCtaClick("muedsat", "download_form");
    try {
      const res = await fetch("/api/muedsat/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          locale,
          source: "muedsat_lp",
          utm_source: searchParams.get("utm_source"),
          utm_medium: searchParams.get("utm_medium"),
          utm_campaign: searchParams.get("utm_campaign"),
          utm_content: searchParams.get("utm_content"),
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setStatus("success");
    } catch {
      setErrorKey("errorGeneric");
      setStatus("error");
    }
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="muedsat-email" className="sr-only">
          {t("emailLabel")}
        </label>
        <input
          id="muedsat-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder={t("emailPlaceholder")}
          aria-invalid={status === "error"}
          aria-describedby={status === "error" ? "muedsat-email-error" : "muedsat-email-note"}
          className="min-w-0 flex-1 rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.04] px-4 py-3.5 font-mono text-white placeholder:text-white/30 transition-colors focus:border-[#f5a524]/60 focus:outline-none focus:ring-1 focus:ring-[#f5a524]/40"
        />
        <button
          type="submit"
          disabled={submitting}
          className="shrink-0 rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3.5 font-semibold text-black transition-colors hover:bg-[#ffb638] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t("submitting") : t("submit")}
        </button>
      </div>

      {status === "error" ? (
        <p id="muedsat-email-error" role="alert" className="mt-2.5 text-sm text-red-400">
          {t(errorKey)}
        </p>
      ) : (
        <p id="muedsat-email-note" className="mt-2.5 text-sm text-white/40">
          {t("note")}
        </p>
      )}
    </form>
  );
}
