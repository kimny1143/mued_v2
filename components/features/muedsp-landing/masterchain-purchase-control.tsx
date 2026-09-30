"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MASTERCHAIN_CHECKOUT_ENABLED,
  loadCheckoutScript,
  openCheckout,
} from "@/lib/masterchain/fastspring-checkout";
import { MASTERCHAIN_PURCHASE_LIVE } from "@/lib/masterchain/config";

// Client gate: NEXT_PUBLIC_EULA_LIVE is read directly so Next.js inlines it at build time. Do not
// replace this with the server-only EULA_LIVE flag; both flags must be enabled for publication.
const EULA_CONSENT_LIVE = process.env.NEXT_PUBLIC_EULA_LIVE === "1";
// ★Purchase is open only when the code flag says so (lib/masterchain/config.ts) AND the EULA is live.
//   While closed: no consent checkbox, no FastSpring script, Buy stays disabled.
const PURCHASE_OPEN = MASTERCHAIN_PURCHASE_LIVE && EULA_CONSENT_LIVE;

interface MasterchainPurchaseControlProps {
  locale: string;
  buyLabel: string;
  consentPrefix: string;
  eulaLabel: string;
  /** Shown under the consent while purchase is open: the portal finds the order by the checkout email. */
  signInNote?: string;
}

export function MasterchainPurchaseControl({
  locale,
  buyLabel,
  consentPrefix,
  eulaLabel,
  signInNote,
}: MasterchainPurchaseControlProps) {
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);

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

  return (
    <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
      {PURCHASE_OPEN && (
        <label className="flex max-w-sm items-start gap-2 text-sm leading-relaxed text-white/65 sm:max-w-xs">
          <input
            type="checkbox"
            checked={eulaAccepted}
            onChange={(event) => setEulaAccepted(event.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            {consentPrefix}{" "}
            <Link
              href={`/${locale}/eula`}
              className="text-[#f5a524] underline decoration-[#f5a524]/40 underline-offset-2 hover:text-[#ffc35a]"
            >
              {eulaLabel}
            </Link>
            .
          </span>
        </label>
      )}
      {/* ★The portal finds the order by the email typed at checkout; a buyer who signs in with another one
          sees no key (conductor 2026-09-30, a). Said BEFORE the purchase, not only in the mail after. */}
      {PURCHASE_OPEN && signInNote && (
        <p data-testid="masterchain-signin-note" className="max-w-sm text-xs leading-relaxed text-white/55 sm:max-w-xs sm:text-right">{signInNote}</p>
      )}

      <button
        type="button"
        disabled={!canPurchase}
        aria-disabled={!canPurchase}
        onClick={() => openCheckout({ eulaAccepted: true })}
        className={
          canPurchase
            ? "shrink-0 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110"
            : PURCHASE_OPEN
              ? // ★Open but not yet consented: still reads as THE primary action (amber, muted) — a grey box
                //   lost to the demo's button (kimny 10/1). Enabled the moment the EULA box is ticked.
                "shrink-0 cursor-not-allowed rounded-[var(--radius-sm)] border border-transparent bg-[var(--accent)]/45 px-5 py-3 font-semibold text-black/60"
              : "shrink-0 cursor-not-allowed rounded-[var(--radius-sm)] border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white/40"
        }
      >
        {buyLabel}
      </button>
    </div>
  );
}
