import type { AnchorHTMLAttributes } from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));

const m = vi.hoisted(() => ({ live: false }));
vi.mock("@/lib/masterchain/config", () => ({
  get MASTERCHAIN_TRIAL_LIVE() { return m.live; }, MASTERCHAIN_TRIAL_DAYS: 15,
  // The product page now also imports the (closed) demo flag; this test is about the trial CTA only.
  MASTERCHAIN_DEMO_LIVE: false,
  // …and the purchase flag (closed here: this test pins the closed-state purchase copy).
  MASTERCHAIN_PURCHASE_LIVE: false,
}));
vi.mock("@/components/brand/brand-header", () => ({ BrandHeader: () => null }));
vi.mock("@/components/features/muedsat-landing/muedsat-signup-form", () => ({
  MuedsatSignupForm: () => null, MuedsatSignupFormFallback: () => null,
}));
vi.mock("@/components/features/muedsp-landing/masterchain-buy-try", () => ({
  MasterchainBuyTry: ({ buyLabel }: { buyLabel: string }) => <button>{buyLabel}</button>,
}));

import { MuedspLandingContent } from "@/components/features/muedsp-landing/muedsp-landing-content";

describe("landing trial CTA", () => {
  it.each([false, true])("adds the CTA only when LIVE=%s while retaining purchase copy", (live) => {
    m.live = live;
    render(<NextIntlClientProvider locale="en" messages={en}><MuedspLandingContent /></NextIntlClientProvider>);
    const cta = screen.queryByRole("link", { name: "Try free for 15 days" });
    if (live) expect(cta).toHaveAttribute("href", "/en/muedsp/trial");
    else expect(cta).toBeNull();
    expect(screen.getByRole("button", { name: en.muedsp.masterchain.buyLabel })).toBeTruthy();
    expect(screen.getByText(en.muedsp.masterchain.priceNote)).toBeTruthy();
  });
  it("links to the Japanese trial from the Japanese landing page", () => {
    m.live = true;
    render(<NextIntlClientProvider locale="ja" messages={ja}><MuedspLandingContent /></NextIntlClientProvider>);
    expect(screen.getByRole("link", { name: "15日間無料で試す" })).toHaveAttribute("href", "/ja/muedsp/trial");
  });
});
