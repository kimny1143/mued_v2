"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  MASTERCHAIN_CHECKOUT_ENABLED,
  ORDER_COMPLETED_EVENT,
  QUOTE_EVENT,
  currentQuote,
  loadCheckoutScript,
  openCheckout,
  requestQuote,
  type CheckoutQuote,
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
 * The button sits right under masterchain's screen image and is always pressable while purchase is open. Pressing it
 * opens a two-column modal (kimny 10/1 「やってみよう」): the order on the right — what you get, $69, the EULA
 * consent check and 「購入へ進む」 (pressable once checked) straight to the FastSpring popup, passing the EULA version as before (the tag contract in
 * fastspring-checkout.ts) — and the EULA (2026.10) on the left, scrolling in its own column. On a phone the
 * order is on top and the EULA below it. The price is FastSpring's own figure for the buyer's session — their
 * currency, tax included where the country includes it (kimny 10/1) — so it matches the popup that follows.
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
    <div className="flex max-w-xl flex-col items-stretch gap-2 sm:items-start">
      {/* ★Same weight as the demo's Try and the free three's button (kimny 2026-10-04): filled orange, full width on a phone, its own width beside the text on a wider screen — exactly the free form's button. */}
      <button
        ref={opener}
        type="button"
        disabled={!PURCHASE_OPEN}
        aria-disabled={!PURCHASE_OPEN}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={
          PURCHASE_OPEN
            ? "w-full sm:w-auto rounded-[var(--radius-lg)] bg-[#f5a524] px-6 py-3.5 font-semibold text-black transition-colors hover:bg-[#ffb638]"
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

// The popup's own stack (FastSpring renders in system fonts), so the two screens read as one flow.
const FASTSPRING_LIKE_FONT =
  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif';

/** How long to wait for FastSpring's figure before falling back to "$69" + "confirmed on the next screen". */
export const QUOTE_WAIT_MS = 5000;

const JA_TAX_NAMES: Record<string, string> = { JCT: "消費税", VAT: "付加価値税（VAT）" };

/**
 * The price, as FastSpring will charge it (see CheckoutQuote in fastspring-checkout.ts). While the figure is on
 * its way: a placeholder, not "$69" (a Japanese buyer would see $69 flip to ¥12,364). If it never comes (script
 * blocked, store unreachable): "$69" and "tax and currency are confirmed on the next screen", as before.
 */
function OrderPrice({ checkoutReady }: { checkoutReady: boolean }) {
  const tb = useTranslations("muedsp.buyTry");
  const locale = useLocale();
  const [quote, setQuote] = useState<CheckoutQuote | null>(() => currentQuote());
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const onQuote = (e: Event) => setQuote((e as CustomEvent<CheckoutQuote>).detail);
    window.addEventListener(QUOTE_EVENT, onQuote);
    if (checkoutReady) requestQuote();
    const timer = window.setTimeout(() => setGaveUp(true), QUOTE_WAIT_MS);
    return () => {
      window.removeEventListener(QUOTE_EVENT, onQuote);
      window.clearTimeout(timer);
    };
  }, [checkoutReady]);

  if (quote) {
    const taxName = locale === "ja" ? (JA_TAX_NAMES[quote.taxType] ?? quote.taxType) : quote.taxType;
    return (
      <div data-testid="order-price">
        <p className="text-3xl font-semibold tabular-nums text-[#356eec]">{quote.total}</p>
        <p className="mt-1 text-xs text-[#767676]">
          {quote.taxPriceType === "included"
            ? tb("orderTaxIncluded", { taxName, tax: quote.tax, rate: quote.taxRate })
            : tb("orderTaxAdded")}
        </p>
      </div>
    );
  }
  if (gaveUp) {
    return (
      <div data-testid="order-price">
        <p className="text-3xl font-semibold tabular-nums text-[#356eec]">{tb("orderPrice")}</p>
        <p className="mt-1 text-xs text-[#767676]">{tb("orderTaxNote")}</p>
      </div>
    );
  }
  return (
    <div data-testid="order-price" aria-busy="true">
      <span className="sr-only">{tb("orderPriceLoading")}</span>
      <div aria-hidden className="h-9 w-32 animate-pulse rounded bg-[#eeeeee]" />
      <div aria-hidden className="mt-2 h-3 w-44 animate-pulse rounded bg-[#f3f3f3]" />
    </div>
  );
}

function EulaModal({ onClose, onAgree, checkoutReady }: { onClose: () => void; onAgree: () => void; checkoutReady: boolean }) {
  const t = useTranslations("eula");
  const tb = useTranslations("muedsp.buyTry");
  const locale = useLocale();
  const isJa = locale === "ja";
  const titleId = useId();
  const checkId = useId();
  // ★Consent is an explicit check (kimny 10/1: 「同意チェックありで」) — unchecked every time the modal opens.
  const [agreed, setAgreed] = useState(false);
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
      const focusables = [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
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
      {/* ★Light, in FastSpring's colours (kimny 10/1: 「購入ページのカラグレがこっち系だと違和感ある」): the next
          screen is FastSpring's white popup with a blue button, so this one hands over to it without a jump. The
          values are measured from the live popup (mued.jp, 2026-10-01): white panel, button #286090, total
          #356eec, secondary text #767676, input border #cccccc, divider #eeeeee; system fonts like the popup's.
          DOM order = the phone order (the order on top, the EULA below) and the focus order (× → purchase →
          the EULA's links); md:flex-row-reverse puts the EULA on the left on a wide screen. */}
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-md bg-white text-[#222] shadow-2xl md:h-[min(88vh,720px)] md:flex-row-reverse"
        style={{ fontFamily: FASTSPRING_LIKE_FONT }}
      >
        <section data-testid="order-panel" className="flex shrink-0 flex-col gap-4 border-b border-[#eeeeee] p-5 md:w-[340px] md:border-b-0 md:border-l md:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold leading-snug text-[#222]">
              {tb("orderProduct")}
            </h2>
            <button
              type="button"
              data-autofocus
              onClick={onClose}
              aria-label={tb("modalClose")}
              className="-mr-1 -mt-1 rounded p-1 text-2xl leading-none text-[#181818]/70 hover:text-[#181818]"
            >
              ×
            </button>
          </div>
          <p className="-mt-2 text-sm text-[#767676]">{tb("orderFormats")}</p>
          <OrderPrice checkoutReady={checkoutReady} />
          <p className="text-sm leading-relaxed text-[#444]">{tb("orderKeyNote")}</p>
          <div className="flex flex-col gap-3 md:mt-auto">
            {/* Where the EULA is depends on the layout: left on a wide screen, below on a phone. */}
            <label htmlFor={checkId} className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-[#222]">
              <input
                id={checkId}
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#286090]"
              />
              <span>
                <span className="md:hidden">{tb("agreeCheckBelow")}</span>
                <span className="hidden md:inline">{tb("agreeCheckLeft")}</span>
              </span>
            </label>
            <button
              type="button"
              onClick={onAgree}
              disabled={!checkoutReady || !agreed}
              aria-disabled={!checkoutReady || !agreed}
              className="w-full rounded bg-[#286090] px-5 py-3.5 text-base font-semibold text-white transition hover:bg-[#1f4d73] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {checkoutReady ? tb("continueToCheckout") : tb("checkoutLoading")}
            </button>
          </div>
        </section>
        <section className="flex min-h-0 flex-1 flex-col" aria-label={t("title")}>
          <div className="border-b border-[#eeeeee] bg-[#fafafa] px-5 py-3">
            <h3 className="text-sm font-semibold text-[#222]">{t("title")}</h3>
            <p className="mt-0.5 text-xs text-[#767676]">{meta.join(" · ")}</p>
          </div>
          {/* The EULA scrolls in its own column, in smaller type. The consent check sits with the order. ja: the
              title itself says （参考訳）; the English text governs (EULA §16) — no separate note box (kimny 10/1). */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-5 py-4 text-[13px] leading-relaxed [&_a]:text-[#356eec] [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:text-[#222] [&_ol]:text-[#555] [&_p]:mb-3 [&_p]:text-[#555] [&_section]:mb-5 [&_strong]:text-[#222] [&_ul]:text-[#555]" data-testid="eula-modal-body">
            <EulaBlocks blocks={content.intro} newTab />
            <EulaArticles articles={content.articles} newTab />
          </div>
        </section>
      </div>
    </div>
  );
}
