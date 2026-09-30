/**
 * masterchain's demo block (kimny 2026-10-01): [Try masterchain] needs a well-formed email in the field below,
 * and sends only once. The purchase is MasterchainBuyButton (its own test).
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { loadCheckoutScript, openCheckout, m } = vi.hoisted(() => ({
  loadCheckoutScript: vi.fn(() => Promise.resolve(true)),
  openCheckout: vi.fn(() => true),
  m: { purchaseLive: true, demoLive: true, assign: vi.fn(), fetch: vi.fn() },
}));

vi.mock("@/lib/masterchain/config", () => ({
  get MASTERCHAIN_PURCHASE_LIVE() { return m.purchaseLive; },
  get MASTERCHAIN_DEMO_LIVE() { return m.demoLive; },
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));
vi.mock("next-intl", () => ({ useLocale: () => "en", useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("utm_source=news&utm_term=audio&utm_medium=email&utm_campaign=launch&utm_content=cta"),
}));
vi.mock("@/lib/analytics/gtag", () => ({ trackCtaClick: vi.fn() }));
vi.mock("@/lib/masterchain/fastspring-checkout", () => ({
  MASTERCHAIN_CHECKOUT_ENABLED: true,
  ORDER_COMPLETED_EVENT: "muedsp:fastspring-order-completed",
  loadCheckoutScript,
  openCheckout,
}));

async function renderBlock(eulaLive: boolean) {
  vi.stubEnv("NEXT_PUBLIC_EULA_LIVE", eulaLive ? "1" : "");
  const { MasterchainTry } = await import("@/components/features/muedsp-landing/masterchain-try");
  return render(<MasterchainTry />);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  m.purchaseLive = true;
  m.demoLive = true;
  vi.stubGlobal("fetch", m.fetch);
  vi.stubGlobal("location", { assign: m.assign });
  m.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, downloadUrl: "https://mued.jp/downloads/demo.pkg" }) });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("TRY — works only with a well-formed email", () => {
  it("★TRY is disabled until the email is well formed; the consent to updates defaults off", async () => {
    await renderBlock(true);
    const tryBtn = screen.getByRole("button", { name: "try" });
    expect(tryBtn).toBeDisabled();
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@" } });
    expect(tryBtn).toBeDisabled();
    fireEvent.click(tryBtn);
    expect(m.fetch).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
    expect(tryBtn).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "consent" })).not.toBeChecked();
  });

  it.each([false, true])("posts the demo with explicit consent (ticked: %s) and starts the download", async (tick) => {
    await renderBlock(true);
    if (tick) fireEvent.click(screen.getByRole("checkbox", { name: "consent" }));
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "try" }));
    await waitFor(() => expect(m.assign).toHaveBeenCalledWith("https://mued.jp/downloads/demo.pkg"));
    expect(m.fetch.mock.calls[0][0]).toBe("/api/masterchain/demo");
    expect(JSON.parse(m.fetch.mock.calls[0][1].body)).toEqual({
      email: "person@example.com", locale: "en", marketingOptIn: tick, website: "",
      utm_source: "news", utm_term: "audio", utm_medium: "email", utm_campaign: "launch", utm_content: "cta",
    });
    expect(screen.getByRole("status")).toHaveTextContent("success");
    expect(screen.getByRole("button", { name: "try" })).toBeDisabled(); // ★no second send after success
  });

  it.each(["invalid_email", "disposable_email", "rate_limited", "unexpected"])("maps API error %s", async (error) => {
    m.fetch.mockResolvedValue({ ok: false, json: async () => ({ error }) });
    await renderBlock(true);
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "try" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(`errors.${error === "unexpected" ? "generic" : error}`);
    expect(m.assign).not.toHaveBeenCalled();
  });

  it("the demo closed: renders nothing", async () => {
    m.demoLive = false;
    const { container } = await renderBlock(true);
    expect(container).toBeEmptyDOMElement();
  });
});
