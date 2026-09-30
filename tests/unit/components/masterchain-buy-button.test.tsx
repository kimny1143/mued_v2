/**
 * masterchain's Buy beside the heading (kimny 2026-10-01): always pressable while purchase is open; opens a
 * two-column modal — the order (version, formats, $69, the EULA consent check, 「購入へ進む」) and the EULA
 * scrolling in its own column. No scroll condition (kimny: forcing a full read loses buyers); the check is the
 * consent (kimny 10/1 「同意チェックありで」) and 「購入へ進む」 goes straight to the FastSpring popup. No totals.
 * ×, Esc and the backdrop close it.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadCheckoutScript, openCheckout, requestQuote, m } = vi.hoisted(() => ({
  loadCheckoutScript: vi.fn(() => Promise.resolve(true)),
  openCheckout: vi.fn(() => true),
  requestQuote: vi.fn(() => true),
  m: { purchaseLive: true, locale: "en", quote: null as Record<string, string> | null },
}));

vi.mock("@/lib/masterchain/config", () => ({ get MASTERCHAIN_PURCHASE_LIVE() { return m.purchaseLive; } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));
vi.mock("next-intl", () => {
  const t = (key: string, values?: Record<string, string>) => (values ? `${key}:${JSON.stringify(values)}` : key);
  const eula = Object.assign((key: string) => key, {
    raw: (key: string) =>
      key === "intro" ? ["Intro text. See https://mued.jp/ja/refund and https://fastspring.com/privacy/ ."] : key === "articles" ? [{ heading: "1. Grant", blocks: ["Body text."] }] : key === "effectiveDate" ? "October 1, 2026" : "Last updated",
    has: () => true,
  });
  return { useLocale: () => m.locale, useTranslations: (ns?: string) => (ns === "eula" ? eula : t) };
});
vi.mock("@/lib/masterchain/fastspring-checkout", () => ({
  MASTERCHAIN_CHECKOUT_ENABLED: true,
  ORDER_COMPLETED_EVENT: "muedsp:fastspring-order-completed",
  QUOTE_EVENT: "muedsp:fastspring-quote",
  currentQuote: () => m.quote,
  loadCheckoutScript,
  openCheckout,
  requestQuote,
}));

const JP_QUOTE = { total: "¥12,364", currency: "JPY", taxPriceType: "included", tax: "¥1,124", taxRate: "10%", taxType: "JCT" };
const US_QUOTE = { total: "$69.00", currency: "USD", taxPriceType: "added", tax: "$0.00", taxRate: "0%", taxType: "US" };

async function renderButton(eulaLive = true) {
  vi.stubEnv("NEXT_PUBLIC_EULA_LIVE", eulaLive ? "1" : "");
  const { MasterchainBuyButton } = await import("@/components/features/muedsp-landing/masterchain-buy-button");
  return render(<MasterchainBuyButton buyLabel="Buy masterchain" />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  m.purchaseLive = true;
  m.locale = "en";
  m.quote = null;
});
afterEach(() => vi.unstubAllEnvs());

describe("the Buy button", () => {
  it("★is pressable straight away while purchase is open (no consent box in front of it) and shows the sign-in note", async () => {
    await renderButton();
    expect(screen.getByRole("button", { name: "Buy masterchain" })).toBeEnabled();
    expect(screen.getByTestId("masterchain-signin-note")).toHaveTextContent("signInNote");
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalledTimes(1));
  });

  it("closed (code flag off or EULA not live): disabled, no script, no modal", async () => {
    m.purchaseLive = false;
    await renderButton();
    const b = screen.getByRole("button", { name: "Buy masterchain" });
    expect(b).toBeDisabled();
    fireEvent.click(b);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loadCheckoutScript).not.toHaveBeenCalled();
  });

  it("after a COMPLETED order it becomes the thank-you + portal link", async () => {
    await renderButton();
    window.dispatchEvent(new CustomEvent("muedsp:fastspring-order-completed"));
    await waitFor(() => expect(screen.getByTestId("masterchain-thanks")).toHaveTextContent("thanks"));
    expect(screen.getByRole("link", { name: "thanksPortal" })).toHaveAttribute("href", "/dashboard/plugins");
  });
});

describe("the EULA modal", () => {
  it("★opens on Buy; 「購入へ進む」 waits for the consent check (no scroll condition), then opens checkout with consent", async () => {
    await renderButton();
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Body text.")).toBeInTheDocument(); // the EULA text itself
    const go = await screen.findByRole("button", { name: "continueToCheckout" });
    // The check is labelled for both layouts (left on a wide screen, below on a phone) and starts unchecked.
    const check = screen.getByRole("checkbox");
    // (jsdom has no CSS, so both spans count; in a browser one of them is display:none.)
    expect(check).toHaveAccessibleName(/agreeCheckBelow/);
    expect(check).toHaveAccessibleName(/agreeCheckLeft/);
    expect(check).not.toBeChecked();
    expect(go).toBeDisabled();
    fireEvent.click(go);
    expect(openCheckout).not.toHaveBeenCalled();
    // ★Both controls sit outside the scrolling EULA — nothing has to be scrolled to reach them.
    expect(screen.getByTestId("eula-modal-body")).not.toContainElement(go);
    expect(screen.getByTestId("eula-modal-body")).not.toContainElement(check);
    fireEvent.click(check);
    expect(go).toBeEnabled();
    fireEvent.click(go);
    expect(openCheckout).toHaveBeenCalledWith({ eulaAccepted: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the check is fresh every time the modal opens", async () => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("the order panel says what you get — product (no version: kimny 10/1), formats, where the key is", async () => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    const order = screen.getByTestId("order-panel");
    expect(screen.getByRole("dialog")).toHaveAccessibleName("orderProduct");
    for (const key of ["orderFormats", "orderKeyNote"]) expect(order).toHaveTextContent(key);
    expect(screen.getByTestId("eula-modal-body")).not.toContainElement(order);
  });
  it("while the checkout script loads, the button says so and waits", async () => {
    loadCheckoutScript.mockImplementationOnce(() => new Promise(() => {}));
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    expect(screen.getByRole("button", { name: "checkoutLoading" })).toBeDisabled();
  });

  it.each(["close button", "Escape", "backdrop"])("%s closes it without opening checkout", async (how) => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    if (how === "close button") fireEvent.click(screen.getByRole("button", { name: "modalClose" }));
    if (how === "Escape") fireEvent.keyDown(document, { key: "Escape" });
    if (how === "backdrop") fireEvent.mouseDown(screen.getByTestId("eula-modal-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(openCheckout).not.toHaveBeenCalled();
  });

  it("★ja: no separate reference-translation box — the EULA title (（参考訳）) says it; no link to /en/eula (kimny 10/1)", async () => {
    m.locale = "ja";
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("title"); // the EULA's own title (ja: 「…使用許諾契約（参考訳）」)
    expect(dialog).not.toHaveTextContent("referenceNote");
    expect(dialog.querySelector('a[href="/en/eula"]')).toBeNull();
  });

  it("★every link inside the modal opens in a new tab — same-site ones too — so the purchase flow stays", async () => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    const links = [...screen.getByRole("dialog").querySelectorAll("a")];
    // ★Positive control: both a mued.jp link and an external one are there.
    expect(links.map((a) => a.getAttribute("href"))).toEqual(
      expect.arrayContaining(["https://mued.jp/ja/refund", "https://fastspring.com/privacy/"]),
    );
    for (const a of links) expect(a).toHaveAttribute("target", "_blank");
  });

  it("the first focus lands inside the dialog (on the close button)", async () => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "modalClose" }));
  });
});

describe("★the price — FastSpring's own figure for this session (kimny 10/1: 「ドルだけしかも税計算なしだと違和感」)", () => {
  const open = async () => {
    await renderButton();
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
  };

  it("asks FastSpring to price masterchain when the modal opens, and shows a placeholder — not $69 — meanwhile", async () => {
    await open();
    await waitFor(() => expect(requestQuote).toHaveBeenCalled());
    const price = screen.getByTestId("order-price");
    expect(price).toHaveAttribute("aria-busy", "true");
    expect(price).toHaveTextContent("orderPriceLoading");
    // The $69 fallback is not shown yet (exact match: "orderPrice" is a prefix of "orderPriceLoading").
    expect(within(price).queryByText("orderPrice")).toBeNull();
    expect(within(price).queryByText("orderTaxNote")).toBeNull();
  });

  it("★JP: the yen total with the consumption tax it includes (ja names it 消費税)", async () => {
    m.locale = "ja";
    await open();
    act(() => void window.dispatchEvent(new CustomEvent("muedsp:fastspring-quote", { detail: JP_QUOTE })));
    const price = screen.getByTestId("order-price");
    expect(price).toHaveTextContent("¥12,364");
    expect(price).toHaveTextContent('orderTaxIncluded:{"taxName":"消費税","tax":"¥1,124","rate":"10%"}');
    expect(price).not.toHaveAttribute("aria-busy");
  });

  it("US: the dollar price, and that sales tax (if any) comes on the next screen from the address", async () => {
    await open();
    act(() => void window.dispatchEvent(new CustomEvent("muedsp:fastspring-quote", { detail: US_QUOTE })));
    const price = screen.getByTestId("order-price");
    expect(price).toHaveTextContent("$69.00");
    expect(price).toHaveTextContent("orderTaxAdded");
  });

  it("a figure the page already has shows at once (the modal opened a second time)", async () => {
    m.quote = JP_QUOTE;
    await open();
    expect(screen.getByTestId("order-price")).toHaveTextContent("¥12,364");
  });

  it("★no figure from FastSpring within the wait → $69 and 「税・通貨は次の画面で確定します」, as before", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await open();
      act(() => void vi.advanceTimersByTime(5000));
      const price = screen.getByTestId("order-price");
      expect(within(price).getByText("orderPrice")).toBeInTheDocument(); // exact — not "orderPriceLoading"
      expect(within(price).getByText("orderTaxNote")).toBeInTheDocument();
      expect(price).not.toHaveAttribute("aria-busy");
    } finally {
      vi.useRealTimers();
    }
  });

  it("★no total or subtotal wording of our own — the figure is FastSpring's", async () => {
    await open();
    act(() => void window.dispatchEvent(new CustomEvent("muedsp:fastspring-quote", { detail: JP_QUOTE })));
    expect(screen.getByTestId("order-panel").textContent).not.toMatch(/total|合計|小計/i);
  });
});
