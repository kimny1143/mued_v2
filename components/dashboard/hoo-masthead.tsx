'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackMuednoteToDialCta } from '@/lib/analytics/gtag';

type BalanceSummary = {
  totalCredits: number;
  subscriptionCredits: number;
  packCredits: number;
  /** Launch-bonus packs only. `packCredits` also includes packs the user paid for. */
  bonusCredits: number;
  hasSubscription: boolean;
};

export function HooMasthead() {
  const { t } = useLocale();
  const [balance, setBalance] = useState<BalanceSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetch('/api/dial/credits/balance', { signal: controller.signal })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setBalance({
              totalCredits: res.data.totalCredits,
              subscriptionCredits: res.data.subscriptionCredits,
              packCredits: res.data.packCredits,
              bonusCredits: res.data.bonusCredits ?? 0,
              hasSubscription: !!res.data.subscription,
            });
          }
        })
        .catch((e) => { if (e?.name !== 'AbortError') console.error(e); });
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { controller.abort(); clearInterval(id); };
  }, []);

  // ★Credits, not subscription. MUEDial has had no purchasable subscription since Hoo Pass was
  // retired (2026-07, #650), so `hasSubscription` is false for everyone who does not already hold a
  // pre-existing row (the stripe webhook and analyze/route.ts still read `hoo_pass` for those) —
  // which meant this line returned "サブスク未加入" to all of them and the credit branches below
  // were unreachable. Both branches end up at the same place after this change: a pre-existing
  // subscriber saw the credit line before and still does.
  // Worse, the launch bonus IS being granted (lib/dial/bonus-campaign.ts, 400cr), so the people who
  // received it were the ones told they had nothing. The balance is what the user has; show that.
  // The "(N bonus)" variant names the launch bonus specifically, so it counts bonus packs only.
  // Keying it on `packCredits` (as #780 did) also counted packs the user had paid for, i.e. it
  // announced a bonus to people who had just bought credits.
  const statusLine = () => {
    if (!balance) return t.muednote.dashboardHub.hoo.statusLoading;
    const total = balance.totalCredits.toLocaleString();
    if (balance.bonusCredits > 0) {
      return t.muednote.dashboardHub.hoo.statusBonus
        .replace('{total}', total)
        .replace('{bonus}', balance.bonusCredits.toLocaleString());
    }
    // 0cr shows as "Hoo: 0cr" rather than being hidden: it is the true balance, it reads the same as
    // any other balance, and hiding it would leave the masthead silently different for some users.
    return t.muednote.dashboardHub.hoo.statusCredits.replace('{total}', total);
  };

  const hasBonusActive = (balance?.bonusCredits ?? 0) > 0;

  return (
    // min-w-0 so this may shrink. Without it the nowrap status line below sets a floor on
    // the whole header row, and the squeeze lands on the language switcher and sign-out
    // button instead — measured at 390px they collapsed to one character per line and
    // "ログアウト" was pushed off-screen entirely.
    <div className="flex items-center gap-2 min-w-0">
      <Link
        href="/dial"
        className="flex items-center gap-2 group min-w-0"
        onClick={() => trackMuednoteToDialCta('masthead', 'hoo_masthead')}
      >
        <div className="relative w-8 h-8 flex-shrink-0">
          <Image
            src="/hoo-animated.svg"
            alt="Hoo"
            fill
            className="object-contain"
            sizes="32px"
          />
        </div>
        {/* Hidden below sm rather than truncated: at 390px there is no slack left after the
            wordmark, language switcher and sign-out, and a balance clipped to "H.." is noise
            rather than information. The Hoo icon stays as the tap target, and the balance is
            still stated in full by CreditsLedger further down the dashboard. */}
        <span
          className={`hidden sm:inline text-xs font-mono tabular-nums truncate transition-colors ${
            hasBonusActive
              ? 'text-amber-400'
              : 'text-white/50 group-hover:text-white/80'
          }`}
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          {statusLine()}
        </span>
      </Link>
    </div>
  );
}
