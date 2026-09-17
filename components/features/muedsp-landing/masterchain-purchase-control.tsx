"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MASTERCHAIN_CHECKOUT_ENABLED,
  loadCheckoutScript,
  openCheckout,
} from "@/lib/masterchain/fastspring-checkout";

interface MasterchainPurchaseControlProps {
  locale: string;
  buyLabel: string;
  consentPrefix: string;
  eulaLabel: string;
  eulaLive: boolean;
}

export function MasterchainPurchaseControl({
  locale,
  buyLabel,
  consentPrefix,
  eulaLabel,
  eulaLive,
}: MasterchainPurchaseControlProps) {
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [eulaAccepted, setEulaAccepted] = useState(false);

  useEffect(() => {
    if (!MASTERCHAIN_CHECKOUT_ENABLED || !eulaLive) return;
    let alive = true;
    void loadCheckoutScript().then((ok) => {
      if (alive) setCheckoutReady(ok);
    });
    return () => {
      alive = false;
    };
  }, [eulaLive]);

  const canPurchase = checkoutReady && eulaLive && eulaAccepted;

  return (
    <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
      <label className="flex max-w-sm items-start gap-2 text-sm leading-relaxed text-white/65 sm:max-w-xs">
        <input
          type="checkbox"
          checked={eulaAccepted}
          disabled={!eulaLive}
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

      <button
        type="button"
        disabled={!canPurchase}
        aria-disabled={!canPurchase}
        onClick={() => openCheckout({ eulaAccepted: true })}
        className={
          canPurchase
            ? "shrink-0 rounded-[var(--radius-sm)] border border-[var(--accent)]/40 bg-[var(--accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110"
            : "shrink-0 cursor-not-allowed rounded-[var(--radius-sm)] border border-white/15 bg-white/[0.04] px-5 py-3 font-semibold text-white/40"
        }
      >
        {buyLabel}
      </button>
    </div>
  );
}
