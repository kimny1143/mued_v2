"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
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
import { BUY_BUTTON_CLASS } from "./buy-button-style";

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
 * opens the CART (kimny 2026-10-04): the order — product image, name, formats, FastSpring's price, the total, where
 * the key comes from — with the EULA as one line that opens in place, and 「EULA に同意して購入手続きに進む」, whose
 * words are the consent (no checkbox), straight to the FastSpring popup, passing the EULA version as before (the tag
 * contract in fastspring-checkout.ts). The price is FastSpring's own figure for the buyer's session — their
 * currency, tax included where the country includes it (kimny 10/1) — so it matches the popup that follows.
 * Closing the cart (×, Esc, the backdrop) does nothing. After FastSpring reports a COMPLETED order, the
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
      {/* ★The free form's button shape (kimny 2026-10-04: filled, full width on a phone), but brighter and glowing so a purchase is told apart from the demo and the free downloads (kimny 2026-10-04 「購入とデモ（および無料）とで区別したい」) — BUY_BUTTON_CLASS. */}
      <button
        ref={opener}
        type="button"
        disabled={!PURCHASE_OPEN}
        aria-disabled={!PURCHASE_OPEN}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={
          PURCHASE_OPEN
            ? BUY_BUTTON_CLASS
            : "cursor-not-allowed rounded-[var(--radius-sm)] border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white/40"
        }
      >
        {buyLabel}
      </button>
      {PURCHASE_OPEN && (
        <p data-testid="masterchain-signin-note" className="text-xs leading-relaxed text-white/50">{t("signInNote")}</p>
      )}
      {PURCHASE_OPEN && open && (
        <CartModal
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

type QuoteState = { kind: "quote"; quote: CheckoutQuote } | { kind: "fallback" } | { kind: "loading" };

/**
 * The price, as FastSpring will charge it (see CheckoutQuote in fastspring-checkout.ts). While the figure is on
 * its way: a placeholder, not "$69" (a Japanese buyer would see $69 flip to ¥12,364). If it never comes (script
 * blocked, store unreachable): "$69" and "tax and currency are confirmed on the next screen", as before.
 * ★One figure for the line and the total: the cart holds masterchain × 1, so they are the same number by
 *   construction (readQuote returns null for anything else).
 */
function useOrderQuote(checkoutReady: boolean): QuoteState {
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

  if (quote) return { kind: "quote", quote };
  return gaveUp ? { kind: "fallback" } : { kind: "loading" };
}

// The product image is masterchain 1.0.1's own screen (kimny 10/4: 「製品の画像はUIスクショを使って欲しい」) — the
// same file the product page shows (2186×912), shown whole at thumbnail size.
const CART_THUMB = "/muedsp/masterchain-1.0.1-demo.webp";

/**
 * The cart (kimny 2026-10-04, Chief plan-cart-flow-20261004 + mock cart-mock/ @ _chief 01616db): the ORDER is the
 * screen — product (the UI screenshot, name, formats, price), the tax note, the total, where the key comes from —
 * and the EULA is one line that opens in place. Consent is the button's own words 「EULA に同意して購入手続きに進む」
 * (no checkbox: kimny 10/4). The EULA version still goes to FastSpring as the order tag (openCheckout → the tag
 * contract in fastspring-checkout.ts); the FastSpring popup and the quote are unchanged.
 * ★White, in FastSpring's colours (kimny 10/1 「購入ページのカラグレがこっち系だと違和感ある」, kept on 10/4 「モーダル
 *   からは白地でお願いします」): measured from the live popup (2026-10-01) — white panel, total #356eec, secondary
 *   #767676, divider #eeeeee, system fonts. Sizes are the mock's (cart-ja.html).
 */
function CartModal({ onClose, onAgree, checkoutReady }: { onClose: () => void; onAgree: () => void; checkoutReady: boolean }) {
  const t = useTranslations("eula");
  const tb = useTranslations("muedsp.buyTry");
  const locale = useLocale();
  const isJa = locale === "ja";
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const price = useOrderQuote(checkoutReady);
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
      const focusables = [
        ...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement);
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

  const figure =
    price.kind === "quote" ? price.quote.total : price.kind === "fallback" ? tb("orderPrice") : null;
  const taxNote =
    price.kind === "quote"
      ? price.quote.taxPriceType === "included"
        ? tb("orderTaxIncluded", {
            taxName: isJa ? (JA_TAX_NAMES[price.quote.taxType] ?? price.quote.taxType) : price.quote.taxType,
            tax: price.quote.tax,
            rate: price.quote.taxRate,
          })
        : tb("orderTaxAdded")
      : price.kind === "fallback"
        ? tb("orderTaxNote")
        : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 md:p-6"
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
        data-testid="cart"
        className="flex max-h-[92vh] w-full max-w-[656px] flex-col overflow-hidden rounded-[12px] bg-white text-[#222] shadow-2xl"
        style={{ fontFamily: FASTSPRING_LIKE_FONT }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#eeeeee] px-5 py-4">
          <h2 id={titleId} className="text-[17px] font-semibold leading-snug text-[#222]">
            {tb("cartTitle")}
          </h2>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label={tb("modalClose")}
            className="rounded px-1 text-[26px] leading-none text-[#181818]/60 hover:text-[#181818]"
          >
            ×
          </button>
        </header>
        <div data-testid="order-panel" className="min-h-0 overflow-y-auto p-5">
          <div data-testid="order-price" aria-busy={price.kind === "loading" ? "true" : undefined}>
            {price.kind === "loading" && <span className="sr-only">{tb("orderPriceLoading")}</span>}
            {/* ★Phone: name → price → formats under the image's right edge (Chief 10/4 (c): a yen figure beside the name
                squeezed the name to 2 lines and the formats to 3). From sm up: the price in its own column on the right,
                as in the mock. One price element, placed by the grid. */}
            <div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-x-3.5 gap-y-1 sm:grid-cols-[112px_minmax(0,1fr)_auto]">
              <Image
                src={CART_THUMB}
                alt=""
                width={112}
                height={47}
                className="row-span-3 h-[47px] w-[112px] rounded-[6px] border border-[#eeeeee] bg-[#0a0a0a] object-contain sm:row-span-2"
              />
              <p data-testid="cart-line-name" className="col-start-2 row-start-1 text-[15px] font-semibold leading-snug text-[#222]">
                {tb("orderProduct")}
              </p>
              {figure !== null ? (
                <p data-testid="cart-line-price" className="col-start-2 row-start-2 font-semibold tabular-nums text-[#222] sm:col-start-3 sm:row-start-1 sm:text-right">
                  {figure}
                </p>
              ) : (
                <div aria-hidden data-testid="cart-line-price" className="col-start-2 row-start-2 h-5 w-16 animate-pulse rounded bg-[#eeeeee] sm:col-start-3 sm:row-start-1" />
              )}
              <p className="col-start-2 row-start-3 font-mono text-[11px] tracking-[0.08em] text-[#767676] sm:row-start-2">{tb("orderFormats")}</p>
            </div>
            {taxNote !== null ? (
              <p className="mt-2.5 text-xs text-[#767676]">{taxNote}</p>
            ) : (
              <div aria-hidden className="mt-3 h-3 w-44 animate-pulse rounded bg-[#f3f3f3]" />
            )}
            <div className="mt-[18px] flex items-baseline justify-between border-t border-[#eeeeee] pt-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#767676]">{tb("cartTotal")}</span>
              {figure !== null ? (
                <span className="text-2xl font-semibold tabular-nums text-[#356eec]">{figure}</span>
              ) : (
                <div aria-hidden className="h-7 w-24 animate-pulse rounded bg-[#eeeeee]" />
              )}
            </div>
          </div>
          <p className="mt-3.5 text-[13px] leading-[1.7] text-[#444]">{tb("orderKeyNote")}</p>
          {/* ★The EULA is one line here and opens in place (kimny 10/4); the full text is the same as /eula. ja: the
              title itself says （参考訳）; the English text governs (EULA §16). */}
          <details data-testid="cart-eula" className="group mt-4 border-y border-[#eeeeee]">
            <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 text-sm text-[#222] [&::-webkit-details-marker]:hidden">
              {tb("cartEula")}
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#767676] transition-transform group-open:rotate-180">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div
              data-testid="eula-modal-body"
              className="max-h-[220px] overflow-y-auto pb-3.5 text-xs leading-[1.7] text-[#555] [&_a]:text-[#356eec] [&_h2]:mb-2 [&_h2]:text-[13px] [&_h2]:text-[#222] [&_ol]:mb-2.5 [&_ol]:text-[#555] [&_p]:mb-2.5 [&_p]:text-[#555] [&_section]:mb-4 [&_strong]:text-[#222] [&_ul]:mb-2.5 [&_ul]:text-[#555]"
            >
              <p className="font-semibold text-[#222]">{t("title")}</p>
              <p className="text-[#767676]">{meta.join(" · ")}</p>
              <EulaBlocks blocks={content.intro} newTab />
              <EulaArticles articles={content.articles} newTab />
            </div>
          </details>
          {/* ★The buy colour (BUY_BUTTON_CLASS: #ffbe3d — kimny 10/4 「購入とデモ（および無料）とで区別したい」), full width;
              no glow on the white panel. The words are the consent. */}
          <button
            type="button"
            onClick={onAgree}
            disabled={!checkoutReady}
            aria-disabled={!checkoutReady}
            className="mt-5 block w-full rounded-[6px] bg-[#ffbe3d] px-5 py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-[#ffc95e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffbe3d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checkoutReady ? tb("agreeAndContinue") : tb("checkoutLoading")}
          </button>
          <p className="mt-2.5 text-xs leading-[1.6] text-[#767676]">{tb("cartNextScreen")}</p>
        </div>
      </div>
    </div>
  );
}
