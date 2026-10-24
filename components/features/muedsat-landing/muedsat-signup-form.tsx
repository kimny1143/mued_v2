"use client";

// Plugin email-gate form. Form notice + news and unsubscribe in every mail (kimny 2026-10-04).
// POSTs to the plugin's subscribe endpoint and shows an honest success state.
//
// Parameterized by `plugin` (default "muedsat" → 100% unchanged for the existing MUEDsat usages =
// regression 0). All plugin-specific config (endpoint, download URL, press token, i18n namespace,
// source, form id) comes from lib/plugins/registry. Kept in the muedsat-landing folder + named
// MuedsatSignupForm to avoid churning the live MUEDsat imports (it is generic despite the name).
//
// Press design-room (dormant): `?press=<token>` matching the plugin's press token (empty by default,
// so the check is always false) AND a download URL exists → the direct download is revealed.
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PLUGIN_DIST, HONEYPOT_FIELD, HONEYPOT_INPUT_PROPS, type PluginKey } from "@/lib/plugins/registry";
import { trackCtaClick } from "@/lib/analytics/gtag";

type Status = "idle" | "submitting" | "success" | "error";

// Light client-side pre-check (the server's zod is authoritative).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Static shell rendered during the Suspense fallback (the form uses useSearchParams, which needs a
// Suspense boundary on a statically-prerendered page). Visually identical, non-interactive.
export function MuedsatSignupFormFallback({ plugin = "muedsat" as PluginKey } = {}) {
  const t = useTranslations(`${PLUGIN_DIST[plugin].i18nNamespace}.form`);
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

export function MuedsatSignupForm({ plugin = "muedsat" as PluginKey } = {}) {
  const dist = PLUGIN_DIST[plugin];
  const t = useTranslations(`${dist.i18nNamespace}.form`);
  const locale = useLocale() as "ja" | "en";
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  // Honeypot decoy — a hidden field real users never see/fill. A non-empty value on submit is a bot;
  // the server silently no-ops it (protects the shared Resend send quota). See lib/plugins/registry.
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<"errorEmail" | "errorGeneric" | "errorEmailFailed">("errorGeneric");

  const inputId = `${plugin}-email`;

  // Dormant press bypass — false unless a token is provisioned.
  const pressUnlocked =
    !!dist.pressToken &&
    searchParams.get("press") === dist.pressToken &&
    !!dist.downloadUrl;

  if (pressUnlocked) {
    return (
      <a
        href={dist.downloadUrl}
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
        <p id={`${inputId}-note`} className="mt-2.5 text-sm text-white/40">{t("note")}</p>
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
    trackCtaClick(plugin, "download_form", "download_form");
    try {
      const res = await fetch(dist.subscribeEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          locale,
          source: dist.source,
          utm_source: searchParams.get("utm_source"),
          utm_medium: searchParams.get("utm_medium"),
          utm_campaign: searchParams.get("utm_campaign"),
          utm_content: searchParams.get("utm_content"),
          [HONEYPOT_FIELD]: honeypot,
        }),
      });
      if (!res.ok) {
        // The email carries the download link (the deliverable). A delivery failure now returns a
        // non-2xx with code EMAIL_DELIVERY_FAILED — tell the user their download didn't go out and to
        // retry, instead of a vague generic error (or, worse, a false "sent").
        let code: string | undefined;
        try {
          code = (await res.json())?.code;
        } catch {
          /* body not JSON — fall back to generic */
        }
        setErrorKey(code === "EMAIL_DELIVERY_FAILED" ? "errorEmailFailed" : "errorGeneric");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorKey("errorGeneric");
      setStatus("error");
    }
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full">
      {/*
        Honeypot decoy — off-screen + tabindex -1 + autocomplete off + a clear "leave empty" label. Not
        aria-hidden (a focusable input inside an aria-hidden subtree trips axe `aria-hidden-focus`); the
        input stays in the a11y tree but off-screen and out of tab order, and the LABEL tells any
        screen-reader user in browse mode to leave it blank (so reaching it is not a false-positive —
        the axe-clean standard honeypot, product課 review #687 ②). Not display:none (some bots skip it).
        A non-empty value on submit makes the server silently no-op (protects the Resend send quota).
      */}
      <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor={`${inputId}-hp`}>Leave this field empty</label>
        <input
          id={`${inputId}-hp`}
          name={HONEYPOT_FIELD}
          {...HONEYPOT_INPUT_PROPS}
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          {t("emailLabel")}
        </label>
        <input
          id={inputId}
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
          aria-describedby={status === "error" ? `${inputId}-error` : `${inputId}-note`}
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

      {status === "error" && (
        <p id={`${inputId}-error`} role="alert" className="mt-2.5 text-sm text-red-400">
          {t(errorKey)}
        </p>
      )}
      <p id={`${inputId}-note`} className="mt-2.5 text-sm text-white/40">
        {t("note")}
      </p>
    </form>
  );
}
