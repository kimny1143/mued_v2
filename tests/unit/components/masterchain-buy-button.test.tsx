/**
 * masterchain's Buy beside the heading (kimny 2026-10-01): always pressable while purchase is open; opens the
 * EULA in a modal; 「同意して購入へ進む」 is always shown below the text and pressable at once (kimny: forcing a
 * full read loses buyers), and goes straight to the FastSpring popup. ×, Esc and the backdrop close it.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadCheckoutScript, openCheckout, m } = vi.hoisted(() => ({
  loadCheckoutScript: vi.fn(() => Promise.resolve(true)),
  openCheckout: vi.fn(() => true),
  m: { purchaseLive: true, locale: "en" },
}));

vi.mock("@/lib/masterchain/config", () => ({ get MASTERCHAIN_PURCHASE_LIVE() { return m.purchaseLive; } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));
vi.mock("next-intl", () => {
  const t = (key: string) => key;
  const eula = Object.assign((key: string) => key, {
    raw: (key: string) =>
      key === "intro" ? ["Intro text."] : key === "articles" ? [{ heading: "1. Grant", blocks: ["Body text."] }] : key === "effectiveDate" ? "October 1, 2026" : "Last updated",
    has: () => true,
  });
  return { useLocale: () => m.locale, useTranslations: (ns?: string) => (ns === "eula" ? eula : t) };
});
vi.mock("@/lib/masterchain/fastspring-checkout", () => ({
  MASTERCHAIN_CHECKOUT_ENABLED: true,
  ORDER_COMPLETED_EVENT: "muedsp:fastspring-order-completed",
  loadCheckoutScript,
  openCheckout,
}));

async function renderButton(eulaLive = true) {
  vi.stubEnv("NEXT_PUBLIC_EULA_LIVE", eulaLive ? "1" : "");
  const { MasterchainBuyButton } = await import("@/components/features/muedsp-landing/masterchain-buy-button");
  return render(<MasterchainBuyButton buyLabel="Buy masterchain $69" />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  m.purchaseLive = true;
  m.locale = "en";
});
afterEach(() => vi.unstubAllEnvs());

describe("the Buy button", () => {
  it("★is pressable straight away while purchase is open (no consent box in front of it) and shows the sign-in note", async () => {
    await renderButton();
    expect(screen.getByRole("button", { name: "Buy masterchain $69" })).toBeEnabled();
    expect(screen.getByTestId("masterchain-signin-note")).toHaveTextContent("signInNote");
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalledTimes(1));
  });

  it("closed (code flag off or EULA not live): disabled, no script, no modal", async () => {
    m.purchaseLive = false;
    await renderButton();
    const b = screen.getByRole("button", { name: "Buy masterchain $69" });
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
  it("★opens on Buy; agree is pressable at once and sits OUTSIDE the scrolling text (always visible); it opens checkout", async () => {
    await renderButton();
    await waitFor(() => expect(loadCheckoutScript).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain $69" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Body text.")).toBeInTheDocument(); // the EULA text itself
    const agree = screen.getByRole("button", { name: "agreeAndBuy" });
    // ★kimny 10/1: no "read to the end first" — the button is always shown below the text and pressable.
    await waitFor(() => expect(agree).toBeEnabled());
    expect(screen.getByTestId("eula-modal-body")).not.toContainElement(agree);
    expect(screen.getByText("agreeNote")).toBeInTheDocument();
    fireEvent.click(agree);
    expect(openCheckout).toHaveBeenCalledWith({ eulaAccepted: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it.each(["close button", "Escape", "backdrop"])("%s closes it without opening checkout", async (how) => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain $69" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    if (how === "close button") fireEvent.click(screen.getByRole("button", { name: "modalClose" }));
    if (how === "Escape") fireEvent.keyDown(document, { key: "Escape" });
    if (how === "backdrop") fireEvent.mouseDown(screen.getByTestId("eula-modal-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(openCheckout).not.toHaveBeenCalled();
  });

  it("ja shows the reference-translation note with a link to the English text; en does not", async () => {
    m.locale = "ja";
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain $69" }));
    expect(screen.getByTestId("eula-modal-reference-note")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "modalEnglishLink" })).toHaveAttribute("href", "/en/eula");
  });

  it("the first focus lands inside the dialog (on the close button)", async () => {
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Buy masterchain $69" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "modalClose" }));
  });
});
