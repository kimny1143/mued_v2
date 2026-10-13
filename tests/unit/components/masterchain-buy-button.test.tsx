/**
 * masterchain's Buy beside the heading (kimny 2026-10-01): always pressable while purchase is open; opens the
 * CART (kimny 2026-10-04): the order — product image, name, formats, FastSpring's price, the total, where the key
 * comes from — the EULA as one line that opens in place, and 「EULA に同意して購入手続きに進む」, whose words are the
 * consent (no checkbox), straight to the FastSpring popup. ×, Esc and the backdrop close it.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadCheckoutScript, openCheckout, requestQuote, trackCtaClick, m } = vi.hoisted(() => ({
  loadCheckoutScript: vi.fn((_product?: string) => Promise.resolve(true)),
  openCheckout: vi.fn((_input: { eulaAccepted: boolean; marketingConsent?: boolean; product?: string }) => true),
  requestQuote: vi.fn((_product?: string) => true),
  trackCtaClick: vi.fn(),
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
  checkoutEnabled: () => true,
  ORDER_COMPLETED_EVENT: "muedsp:fastspring-order-completed",
  QUOTE_EVENT: "muedsp:fastspring-quote",
  currentQuote: () => m.quote,
  loadCheckoutScript,
  openCheckout,
  requestQuote,
}));

vi.mock("@/lib/analytics/gtag", () => ({ trackCtaClick }));

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

describe("the cart", () => {
  it("★opens on Buy; no checkbox — the button's words are the consent and it opens checkout with the EULA accepted", async () => {
    await renderButton();
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("cartTitle");
    expect(within(dialog).queryByRole("checkbox")).toBeNull();
    const go = await screen.findByRole("button", { name: "agreeAndContinue" });
    expect(go).toBeEnabled();
    // ★The button sits outside the EULA text — nothing has to be opened or scrolled to reach it.
    expect(screen.getByTestId("eula-modal-body")).not.toContainElement(go);
    // ★The news notice is on the screen the button is pressed from (kimny 10/4 「告げて送る」, 10/6) …
    expect(within(dialog).getByTestId("cart-audience-note")).toHaveTextContent("cartAudienceNote");
    fireEvent.click(go);
    // … and the order says so: marketingConsent true → the webhook adds the buyer to the MUEDsp news list.
    expect(openCheckout).toHaveBeenCalledWith({ eulaAccepted: true, marketingConsent: true, product: "masterchain" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("★the EULA is one line that opens in place (closed at first), with the full text inside", async () => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    const eula = screen.getByTestId("cart-eula");
    expect(eula.tagName).toBe("DETAILS");
    expect(eula).not.toHaveAttribute("open");
    expect(within(eula).getByText("cartEula").closest("summary")).not.toBeNull();
    expect(within(eula).getByText("Body text.")).toBeInTheDocument(); // the EULA text itself
    expect(eula).toHaveTextContent("Version: 2026.10");
  });

  it("the order says what you get — product, formats, the product's own screen, where the key is, the next screen", async () => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    const order = screen.getByTestId("order-panel");
    for (const key of ["orderProduct", "orderFormats", "orderKeyNote", "cartTotal", "cartNextScreen"]) expect(order).toHaveTextContent(key);
    expect(order.querySelector("img")?.getAttribute("src")).toContain("masterchain-1.0.1-licensed.webp");
    expect(screen.getByTestId("eula-modal-body")).not.toContainElement(screen.getByTestId("order-price"));
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
      expect(within(price).getAllByText("orderPrice")).toHaveLength(2); // the line and the total — exact, not "orderPriceLoading"
      expect(within(price).getByText("orderTaxNote")).toBeInTheDocument();
      expect(price).not.toHaveAttribute("aria-busy");
    } finally {
      vi.useRealTimers();
    }
  });

  it("★one figure — the line and the total are FastSpring's same number (masterchain × 1), no subtotal of our own", async () => {
    await open();
    act(() => void window.dispatchEvent(new CustomEvent("muedsp:fastspring-quote", { detail: JP_QUOTE })));
    const price = screen.getByTestId("order-price");
    expect(within(price).getAllByText("¥12,364")).toHaveLength(2);
    expect(price.textContent).not.toMatch(/subtotal|小計/i);
  });
});

describe("★the product the button sells, and the two clicks that are counted (C9 PR-C, conductor 10/13)", () => {
  it("★masterchain's button prices and checks out masterchain — the product is passed, not assumed", async () => {
    await renderButton();
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalledWith("masterchain"));
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    await waitFor(() => expect(requestQuote).toHaveBeenCalledWith("masterchain"));
    fireEvent.click(await screen.findByRole("button", { name: "agreeAndContinue" }));
    expect(openCheckout).toHaveBeenCalledWith({ eulaAccepted: true, marketingConsent: true, product: "masterchain" });
  });

  it("★pressing Buy is counted once, and the FastSpring step only when the popup really opened", async () => {
    await renderButton();
    expect(trackCtaClick).not.toHaveBeenCalled(); // rendering is not a click
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain" }));
    expect(trackCtaClick.mock.calls).toEqual([["masterchain", "buy_button", "checkout"]]);

    openCheckout.mockReturnValueOnce(false); // the popup did not open → the cart stays, nothing more is counted
    fireEvent.click(await screen.findByRole("button", { name: "agreeAndContinue" }));
    expect(trackCtaClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("cart")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "agreeAndContinue" }));
    expect(trackCtaClick.mock.calls[1]).toEqual(["masterchain", "cart_checkout", "checkout"]);
    expect(screen.queryByTestId("cart")).not.toBeInTheDocument();
  });

  it("★another product's button uses that product's flag, words, image and path — and stays shut while its flag is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_EULA_LIVE", "1");
    const { PaidBuyButton } = await import("@/components/features/muedsp-landing/masterchain-buy-button");
    const vox = { key: "muedvox" as const, purchaseLive: false, cartThumb: "/muedvox/screen.webp", messages: "muedvox.buy" };
    const closed = render(<PaidBuyButton product={vox} buyLabel="Buy MUEDvox" />);
    expect(screen.getByRole("button", { name: "Buy MUEDvox" })).toBeDisabled();
    expect(loadCheckoutScript).not.toHaveBeenCalled();
    closed.unmount();

    render(<PaidBuyButton product={{ ...vox, purchaseLive: true }} buyLabel="Buy MUEDvox" />);
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalledWith("muedvox"));
    fireEvent.click(screen.getByRole("button", { name: "Buy MUEDvox" }));
    expect(trackCtaClick).toHaveBeenCalledWith("muedvox", "buy_button", "checkout");
    expect(within(screen.getByTestId("cart")).getByRole("presentation", { hidden: true })).toHaveAttribute("src", expect.stringContaining("screen.webp"));
    fireEvent.click(await screen.findByRole("button", { name: "agreeAndContinue" }));
    expect(openCheckout).toHaveBeenCalledWith({ eulaAccepted: true, marketingConsent: true, product: "muedvox" });
  });
});
