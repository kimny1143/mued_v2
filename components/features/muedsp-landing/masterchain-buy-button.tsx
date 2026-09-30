"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  MASTERCHAIN_CHECKOUT_ENABLED,
  ORDER_COMPLETED_EVENT,
  loadCheckoutScript,
  openCheckout,
} from "@/lib/masterchain/fastspring-checkout";
import { MASTERCHAIN_PURCHASE_LIVE, MASTERCHAIN_VERSION } from "@/lib/masterchain/config";
import { EULA_VERSION } from "@/lib/legal/eula";
import { parseEulaContent } from "@/lib/legal/eula-content";
import { EulaArticles, EulaBlocks } from "@/components/legal/eula-body";

// Client gate: NEXT_PUBLIC_EULA_LIVE is read directly so Next.js inlines it at build time. Do not
// replace this with the server-only EULA_LIVE flag; both flags must be enabled for publication.
const EULA_CONSENT_LIVE = process.env.NEXT_PUBLIC_EULA_LIVE === "1";
// ★Purchase is open only when the code flag says so (lib/masterchain/config.ts) AND the EULA is live.
//   While closed: the button is the closed label, disabled; no FastSpring script, no modal.
const PURCHASE_OPEN = MASTERCHAIN_PURCHASE_LIVE && EULA_CONSENT_LIVE;

/**
 * masterchain's Buy (kimny 2026-10-01, verbatim: 「このエリアにもうmasterchainの購入ボタンが見えてないとダメだよね。
 * スクロールしてさ、しかもEULA押すまで暗転してるボタンなんて誰も押さないわ」).
 *
 * The button sits beside masterchain's heading and is always pressable while purchase is open. Pressing it
 * opens a two-column modal (kimny 10/1 「やってみよう」): the order on the right — what you get, $69, and
 * 「購入へ進む」 straight to the FastSpring popup, passing the EULA version as before (the tag contract in
 * fastspring-checkout.ts) — and the EULA (2026.10) on the left, scrolling in its own column. On a phone the
 * order is on top and the EULA below it. No totals: FastSpring's popup is where tax and currency are fixed.
 * Closing the modal (×, Esc, the backdrop) does nothing. After FastSpring reports a COMPLETED order, the
 * button becomes the thank-you + portal link.
 */
export function MasterchainBuyButton({ buyLabel }: { buyLabel: string }) {
  const t = useTranslations("muedsp.buyTry");
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [ordered, setOrdered] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

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

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  if (ordered) {
    return (
      <div role="status" data-testid="masterchain-thanks" className="flex max-w-xs flex-col items-start gap-3">
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
    <div className="flex max-w-xs flex-col items-start gap-2">
      <button
        ref={opener}
        type="button"
        disabled={!PURCHASE_OPEN}
        aria-disabled={!PURCHASE_OPEN}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={
          PURCHASE_OPEN
            ? "rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110"
            : "cursor-not-allowed rounded-[var(--radius-sm)] border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white/40"
        }
      >
        {buyLabel}
      </button>
      {PURCHASE_OPEN && (
        <p data-testid="masterchain-signin-note" className="text-xs leading-relaxed text-white/50">{t("signInNote")}</p>
      )}
      {PURCHASE_OPEN && open && (
        <EulaModal
          onClose={close}
          checkoutReady={checkoutReady}
          onAgree={() => {
            if (openCheckout({ eulaAccepted: true })) setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function EulaModal({ onClose, onAgree, checkoutReady }: { onClose: () => void; onAgree: () => void; checkoutReady: boolean }) {
  const t = useTranslations("eula");
  const tb = useTranslations("muedsp.buyTry");
  const locale = useLocale();
  const isJa = locale === "ja";
  const titleId = useId();
  const noteId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const content = parseEulaContent({
    intro: t.raw("intro"),
    articles: t.raw("articles"),
    effectiveDate: t.has("effectiveDate") ? t.raw("effectiveDate") : undefined,
    dateLabel: t.has("dateLabel") ? t.raw("dateLabel") : undefined,
  });
  const meta = [
    `${isJa ? "版" : "Version"}: ${EULA_VERSION}`,
    content.effectiveDate ? `${content.dateLabel ?? (isJa ? "施行日" : "Effective date")}: ${content.effectiveDate}` : null,
  ].filter((part): part is string => part !== null);

  // Esc closes; Tab stays inside the dialog (focus trap); the first focus lands on the close button.
  useEffect(() => {
    const root = dialog.current;
    root?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const focusables = [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="eula-modal-backdrop"
    >
      {/* DOM order = the phone order (the order on top, the EULA below) and the focus order (× → purchase →
          the EULA's links); md:flex-row-reverse puts the EULA on the left on a wide screen. */}
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/10 bg-[#141414] shadow-2xl md:h-[min(88vh,720px)] md:flex-row-reverse"
      >
        <section data-testid="order-panel" className="flex shrink-0 flex-col gap-4 border-b border-white/10 p-5 md:w-[340px] md:border-b-0 md:border-l md:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold leading-snug text-white">
              {tb("orderProduct", { version: MASTERCHAIN_VERSION })}
            </h2>
            <button
              type="button"
              data-autofocus
              onClick={onClose}
              aria-label={tb("modalClose")}
              className="-mr-1 -mt-1 rounded p-1 text-2xl leading-none text-white/60 hover:text-white"
            >
              ×
            </button>
          </div>
          <p className="-mt-2 text-sm text-white/60">{tb("orderFormats")}</p>
          <div>
            <p className="text-3xl font-semibold tabular-nums text-white">{tb("orderPrice")}</p>
            <p className="mt-1 text-xs text-white/50">{tb("orderTaxNote")}</p>
          </div>
          <p className="text-sm leading-relaxed text-white/75">{tb("orderKeyNote")}</p>
          <div className="flex flex-col gap-2 md:mt-auto">
            <button
              type="button"
              onClick={onAgree}
              disabled={!checkoutReady}
              aria-disabled={!checkoutReady}
              aria-describedby={noteId}
              className="w-full rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3.5 text-base font-semibold text-black transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            >
              {checkoutReady ? tb("continueToCheckout") : tb("checkoutLoading")}
            </button>
            {/* Where the EULA is depends on the layout: left on a wide screen, below on a phone. */}
            <p id={noteId} className="text-xs leading-relaxed text-white/50">
              <span className="md:hidden">{tb("agreeNoteBelow")}</span>
              <span className="hidden md:inline">{tb("agreeNoteLeft")}</span>
            </p>
          </div>
        </section>
        <section className="flex min-h-0 flex-1 flex-col" aria-label={t("title")}>
          <div className="border-b border-white/10 px-5 py-3">
            <h3 className="text-sm font-semibold text-white/85">{t("title")}</h3>
            <p className="mt-0.5 text-xs text-white/45">{meta.join(" · ")}</p>
          </div>
          {/* The EULA scrolls in its own column, in smaller type. No consent control here — pressing 「購入へ進む」
              is the consent (the note under the button says so). */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-[13px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-sm [&_p]:mb-3 [&_section]:mb-5" data-testid="eula-modal-body">
            {isJa && (
              <p data-testid="eula-modal-reference-note" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                {/* ★No link out of the modal (kimny 10/1: 「リンクつけちゃったらそれは離脱の扉」). The note stays: the
                    English text governs (EULA §16). */}
                {t("referenceNote")}
              </p>
            )}
            <EulaBlocks blocks={content.intro} newTab />
            <EulaArticles articles={content.articles} newTab />
          </div>
        </section>
      </div>
    </div>
  );
}
