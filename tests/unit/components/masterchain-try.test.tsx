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
  it("★TRY is always pressable (the free three's form — kimny 10/4); a malformed email answers in red and sends nothing", async () => {
    await renderBlock(true);
    const tryBtn = screen.getByRole("button", { name: "try" });
    expect(tryBtn).toBeEnabled(); // ★never greyed out before typing
    fireEvent.click(tryBtn); // empty
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.invalid_email");
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@" } });
    expect(screen.queryByRole("alert")).toBeNull(); // typing clears the red line
    fireEvent.click(tryBtn);
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.invalid_email");
    expect(m.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("checkbox", { name: "consent" })).not.toBeChecked();
    expect(screen.getByText("emailNotice")).toBeVisible();
  });

  it("TRY is the filled orange button of the free form, beside the email (not an outline above it)", async () => {
    await renderBlock(true);
    const tryBtn = screen.getByRole("button", { name: "try" });
    expect(tryBtn.className).toContain("bg-[#f5a524]");
    expect(tryBtn.className).not.toContain("border-[#f5a524]/60");
    const email = screen.getByLabelText("emailLabel");
    expect(email.parentElement).toBe(tryBtn.parentElement); // same row
    expect(email.compareDocumentPosition(tryBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // email first
  });

  // kimny 2026-10-28 「B」: [email | Try] → the news checkbox (default off) → what the email is for.
  it.each([false, true])("posts the demo with the checkbox as it stands (ticked: %s) and starts the download", async (tick) => {
    await renderBlock(true);
    const box = screen.getByRole("checkbox", { name: "consent" });
    expect(box).not.toBeChecked();
    expect(screen.getByLabelText("emailLabel").parentElement?.nextElementSibling).toBe(box.closest("label"));
    expect(box.closest("label")?.nextElementSibling).toBe(screen.getByText("emailNotice"));
    if (tick) fireEvent.click(box);
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "try" }));
    await waitFor(() => expect(m.assign).toHaveBeenCalledWith("https://mued.jp/downloads/demo.pkg"));
    expect(m.fetch.mock.calls[0][0]).toBe("/api/masterchain/demo");
    expect(JSON.parse(m.fetch.mock.calls[0][1].body)).toEqual({
      email: "person@example.com", locale: "en", marketingOptIn: tick, website: "",
      utm_source: "news", utm_term: "audio", utm_medium: "email", utm_campaign: "launch", utm_content: "cta",
    });
    expect(screen.getByRole("status")).toHaveTextContent("success");
    expect(screen.getByText("emailNotice")).toBeVisible();
    expect(screen.getByText("demoNote")).toBeVisible();
    expect(screen.queryByRole("button", { name: "try" })).toBeNull(); // ★no second send after success
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

describe("★which download starts — the visitor's OS (masterchain for Windows, 2026-10-01)", () => {
  const MAC = "https://mued.jp/downloads/demo.pkg";
  const WIN = "https://mued.jp/downloads/demo-win.zip";
  async function tryWith(userAgent: string, maxTouchPoints = 0) {
    vi.stubGlobal("navigator", { userAgent, maxTouchPoints });
    m.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, downloadUrl: MAC, windowsDownloadUrl: WIN }) });
    await renderBlock(true);
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "try" }));
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  }

  it("Windows: starts the zip, says it started, offers the Mac one", async () => {
    await tryWith("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect(m.assign).toHaveBeenCalledWith(WIN);
    expect(screen.getByRole("status")).toHaveTextContent("success");
    expect(screen.getByRole("link", { name: "demoOtherMac" })).toHaveAttribute("href", MAC);
  });

  it("★OS unknown (iPad: 'Macintosh' + touch): starts nothing and does NOT say it started — pick below, both links", async () => {
    await tryWith("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", 5);
    expect(m.assign).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("demoChoose");
    expect(screen.getByRole("status")).not.toHaveTextContent("success"); // kimny: 「事実と違うことは書かないで」
    expect(screen.getByRole("link", { name: "demoOtherMac" })).toHaveAttribute("href", MAC);
    expect(screen.getByRole("link", { name: "demoOtherWindows" })).toHaveAttribute("href", WIN);
  });
});

describe("the red line is the free form's wording (kimny 10/4「揃えて」)", () => {
  it.each(["ja", "en"] as const)("%s: muedsp.demo.errors.invalid_email === muedsat.form.errorEmail", async (locale) => {
    const messages = (await import(`@/messages/${locale}.json`)).default;
    expect(messages.muedsp.demo.errors.invalid_email).toBe(messages.muedsat.form.errorEmail);
  });
});

describe("★the demo form takes its product (C9 PR-C)", () => {
  const other = { key: "other", demoLive: true, endpoint: "/api/other/demo", messages: { form: "other.form", demo: "other.demo", windows: "other.windows" } };

  it("★posts to its own endpoint and is counted under its own name", async () => {
    const { PaidDemoForm } = await import("@/components/features/muedsp-landing/masterchain-try");
    const { trackCtaClick } = await import("@/lib/analytics/gtag");
    const { container } = render(<PaidDemoForm product={other} />);
    expect(container.querySelector("#other-demo-email")).not.toBeNull();
    expect(container.querySelector("#masterchain-demo-email")).toBeNull();
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "try" }));
    await waitFor(() => expect(m.fetch).toHaveBeenCalledTimes(1));
    expect(m.fetch.mock.calls[0][0]).toBe("/api/other/demo");
    expect(trackCtaClick).toHaveBeenCalledExactlyOnceWith("other", "demo_form", "download_form");
  });

  it("★its own flag off renders nothing, whatever masterchain's flag says", async () => {
    const { PaidDemoForm } = await import("@/components/features/muedsp-landing/masterchain-try");
    const { container } = render(<PaidDemoForm product={{ ...other, demoLive: false }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("masterchain's form is unchanged: its endpoint, its ids, its name", async () => {
    const { container } = await renderBlock(true);
    const { trackCtaClick } = await import("@/lib/analytics/gtag");
    expect(container.querySelector("#masterchain-demo-email")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("emailLabel"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "try" }));
    await waitFor(() => expect(m.fetch).toHaveBeenCalledTimes(1));
    expect(m.fetch.mock.calls[0][0]).toBe("/api/masterchain/demo");
    expect(trackCtaClick).toHaveBeenCalledExactlyOnceWith("masterchain", "demo_form", "download_form");
  });
});
