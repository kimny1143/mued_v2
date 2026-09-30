"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  MASTERCHAIN_CHECKOUT_ENABLED,
  ORDER_COMPLETED_EVENT,
  loadCheckoutScript,
  openCheckout,
} from "@/lib/masterchain/fastspring-checkout";
import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_PURCHASE_LIVE } from "@/lib/masterchain/config";
import { trackCtaClick } from "@/lib/analytics/gtag";

// Client gate: NEXT_PUBLIC_EULA_LIVE is read directly so Next.js inlines it at build time. Do not
// replace this with the server-only EULA_LIVE flag; both flags must be enabled for publication.
const EULA_CONSENT_LIVE = process.env.NEXT_PUBLIC_EULA_LIVE === "1";
// ★Purchase is open only when the code flag says so (lib/masterchain/config.ts) AND the EULA is live.
//   While closed: no consent checkbox, no FastSpring script, BUY stays disabled.
const PURCHASE_OPEN = MASTERCHAIN_PURCHASE_LIVE && EULA_CONSENT_LIVE;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type DemoError = "invalid_email" | "disposable_email" | "rate_limited" | "generic";

/**
 * masterchain's buy + demo, in one block (kimny 2026-10-01, verbatim: 「買い切りの購入ボタンとデモDLボタンって、
 * 一列で並べちゃっていいと思うの。『BUY $69』と『TRY』でいいじゃん文字も。その下にアドレス入力バーがあって、
 * そこにアドレス入れてないとTRYボタン押しても効かないようにしておけばいいよね？？デモの説明はその下にもっと簡潔に」).
 *
 *   1. EULA consent — the condition for BUY
 *   2. [BUY $69] (amber fill) · [TRY] (outline) on one row
 *   3. email (for TRY) + the updates opt-in (default off)
 *   4. the short demo line + the sign-in note (small)
 *
 * BUY opens the FastSpring popup (after consent). TRY posts the email to /api/masterchain/demo and starts the
 * download — it only works once a well-formed email is in the field. After FastSpring reports a COMPLETED order,
 * the block becomes the thank-you + portal button.
 */
export function MasterchainBuyTry({ buyLabel }: { buyLabel: string }) {
  const t = useTranslations("muedsp.buyTry");
  const td = useTranslations("muedsp.demo");
  const locale = useLocale();
  const searchParams = useSearchParams();

  // purchase
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [ordered, setOrdered] = useState(false);
  useEffect(() => {
    const onDone = () => setOrdered(true);
    window.addEventListener(ORDER_COMPLETED_EVENT, onDone);
    return () => window.removeEventListener(ORDER_COMPLETED_EVENT, onDone);
  }, []);
  useEffect(() => {
    if (!MASTERCHAIN_CHECKOUT_ENABLED || !PURCHASE_OPEN) return;
    let alive = true;
    void loadCheckoutScript().then((ok) => {
      if (alive) setCheckoutReady(ok);
    });
    return () => {
      alive = false;
    };
  }, []);
  const canPurchase = checkoutReady && PURCHASE_OPEN && eulaAccepted;

  // demo
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<DemoError>("generic");
  const emailOk = EMAIL_RE.test(email.trim());
  const canTry = MASTERCHAIN_DEMO_LIVE && emailOk && status !== "submitting";

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

  if (ordered) {
    return (
      <div role="status" data-testid="masterchain-thanks" className="flex max-w-xl flex-col items-start gap-3">
        <p className="text-sm leading-relaxed text-white/80">{t("thanks")}</p>
        <Link
          href="/dashboard/plugins"
          className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110"
        >
          {t("thanksPortal")}
        </Link>
      </div>
    );
  }

  return (
    <form id="demo" onSubmit={tryDemo} noValidate className="max-w-xl scroll-mt-20 space-y-4" aria-busy={status === "submitting"}>
      {PURCHASE_OPEN && (
        <label className="flex items-start gap-2 text-sm leading-relaxed text-white/65">
          <input
            type="checkbox"
            checked={eulaAccepted}
            onChange={(event) => setEulaAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            {t("eulaConsentPrefix")}{" "}
            <Link
              href={`/${locale}/eula`}
              className="text-[#f5a524] underline decoration-[#f5a524]/40 underline-offset-2 hover:text-[#ffc35a]"
            >
              {t("eulaLabel")}
            </Link>
            .
          </span>
        </label>
      )}

      {/* One row from sm up; stacked on phones so the longer labels stay on one line (kimny 10/1 labels). */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!canPurchase}
          aria-disabled={!canPurchase}
          onClick={() => openCheckout({ eulaAccepted: true })}
          className={
            canPurchase
              ? "flex-1 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110 sm:flex-none"
              : PURCHASE_OPEN
                ? "flex-1 cursor-not-allowed rounded-[var(--radius-sm)] border border-transparent bg-[var(--accent)]/45 px-5 py-3 font-semibold text-black/60 sm:flex-none"
                : "flex-1 cursor-not-allowed rounded-[var(--radius-sm)] border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white/40 sm:flex-none"
          }
        >
          {buyLabel}
        </button>
        {MASTERCHAIN_DEMO_LIVE && (
          <button
            type="submit"
            disabled={!canTry}
            aria-disabled={!canTry}
            className={
              canTry
                ? "flex-1 rounded-[var(--radius-sm)] border border-[#f5a524]/60 px-5 py-3 font-semibold text-[#f5a524] transition hover:bg-[#f5a524]/10 sm:flex-none"
                : "flex-1 cursor-not-allowed rounded-[var(--radius-sm)] border border-white/15 px-5 py-3 font-semibold text-white/35 sm:flex-none"
            }
          >
            {t("try")}
          </button>
        )}
      </div>

      {MASTERCHAIN_DEMO_LIVE && (
        <>
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
        </>
      )}
      {PURCHASE_OPEN && (
        <p data-testid="masterchain-signin-note" className="text-xs leading-relaxed text-white/50">{t("signInNote")}</p>
      )}
    </form>
  );
}
