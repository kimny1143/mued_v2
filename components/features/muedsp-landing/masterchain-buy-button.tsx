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
import { MASTERCHAIN_PURCHASE_LIVE } from "@/lib/masterchain/config";
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
 * opens the EULA (2026.10) in a modal; the button below the text — 「同意して購入へ進む」 — goes straight to
 * the FastSpring popup, passing the EULA version as before (the tag contract in fastspring-checkout.ts).
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="eula-modal-backdrop"
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-lg border border-white/10 bg-[#141414] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-white">{t("title")}</h2>
            <p className="mt-1 text-xs text-white/45">{meta.join(" · ")}</p>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label={tb("modalClose")}
            className="rounded p-1 text-2xl leading-none text-white/60 hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm" data-testid="eula-modal-body">
          {isJa && (
            <p data-testid="eula-modal-reference-note" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
              {/* ★No link out of the modal (kimny 10/1: 「リンクつけちゃったらそれは離脱の扉」). The note stays: the
                  English text governs (EULA §16). */}
              {t("referenceNote")}
            </p>
          )}
          <EulaBlocks blocks={content.intro} newTab />
          <EulaArticles articles={content.articles} newTab />
        </div>
        {/* ★Always visible under the text and pressable at once (kimny 10/1: 「全部読まないとボタン押せない、に
            しちゃうと絶対離脱する…ボタンは常時下に表示しておいて押せるようにした方がいい」). The text stays
            one scroll away above it. */}
        <div className="flex flex-col items-start gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">{checkoutReady ? tb("agreeNote") : tb("checkoutLoading")}</p>
          <button
            type="button"
            onClick={onAgree}
            disabled={!checkoutReady}
            aria-disabled={!checkoutReady}
            className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            {tb("agreeAndBuy")}
          </button>
        </div>
      </div>
    </div>
  );
}
