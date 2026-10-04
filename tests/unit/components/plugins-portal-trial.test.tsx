import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));

const m = vi.hoisted(() => ({ live: true, trial: vi.fn(), purchases: vi.fn() }));
vi.mock("@/lib/masterchain/config", () => ({ get MASTERCHAIN_TRIAL_LIVE() { return m.live; } }));
vi.mock("@/lib/plugins/portal-data", () => ({
  getTrialItemForUser: m.trial, getPurchaseItemsForUser: m.purchases,
  getPortalItemsForUser: async () => [], markPortalRegistered: vi.fn(),
}));
vi.mock("@/lib/plugins/portal", () => ({ buildAvailableItems: () => [] }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: async () => ({ id: "user", emailAddresses: [] }) }));
vi.mock("@/components/layouts/muednote-layout", () => ({ MuednoteLayout: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/app/dashboard/plugins/plugins-portal.module.css", () => ({ default: new Proxy({}, { get: (_t, k) => String(k) }) }));

import PortalPage from "@/app/dashboard/plugins/page";
import { PluginsPortalView } from "@/app/dashboard/plugins/plugins-portal-view";

const KEY = "TRIAL-SIGNED-KEY\n";
const PURCHASE = {
  productKey: "masterchain", displayName: "masterchain", keyFileName: "MUEDsp-masterchain.license.key",
  licenseKey: "PURCHASED-KEY", purchasedAt: new Date("2026-09-20Z"),
  version: "0.1.3", downloadUrl: "/downloads/masterchain.pkg",
};
beforeEach(() => {
  m.live = true;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-28T00:00:00Z"));
  m.purchases.mockResolvedValue([]);
  m.trial.mockResolvedValue({ licenseKey: KEY, expiresAt: new Date("2026-10-01T00:00:00Z") });
});
afterEach(() => vi.useRealTimers());
async function page() {
  return render(<NextIntlClientProvider locale="en" messages={en}>{await PortalPage()}</NextIntlClientProvider>);
}

describe("portal trial card", () => {
  it("does not fetch or render trials while staged", async () => {
    m.live = false;
    await page();
    expect(m.trial).not.toHaveBeenCalled();
    expect(screen.queryByRole("region", { name: "Trial" })).toBeNull();
  });
  it("also gates trial props supplied to the view while staged", () => {
    m.live = false;
    render(<NextIntlClientProvider locale="en" messages={en}><PluginsPortalView items={[]} trial={{ licenseKey: KEY, expiresAtISO: "2026-10-01Z", expired: false }} /></NextIntlClientProvider>);
    expect(document.body.textContent).not.toContain(KEY.trim());
    expect(screen.queryByRole("region", { name: "Trial" })).toBeNull();
  });
  it("has no empty trial section when no trial exists", async () => {
    m.trial.mockResolvedValue(null);
    await page();
    expect(screen.queryByRole("region", { name: "Trial" })).toBeNull();
  });
  it("shows the key and UTC expiry and copies the exact bytes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await page();
    expect(document.querySelector("pre")?.textContent).toBe(KEY);
    expect(screen.getByRole("button", { name: "Download license.key" })).toBeTruthy();
    expect(screen.getByText(en.pluginPortal.trial.howto)).toBeTruthy();
    expect(screen.getByText("Trial ends 2026-10-01 00:00 (UTC)")).toBeTruthy();
    expect(screen.queryByText("Trial ended")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Copy key" }));
    await screen.findByRole("button", { name: "Copied" });
    expect(writeText).toHaveBeenCalledWith(KEY);
  });
  it.each(["2026-09-27T23:59:59Z", "2026-09-28T00:00:00Z"])("shows Trial ended at or after expiry %s", async (expiresAt) => {
    m.trial.mockResolvedValue({ licenseKey: KEY, expiresAt: new Date(expiresAt) });
    await page();
    expect(screen.getByText("Trial ended")).toBeTruthy();
    expect(screen.getByText(en.pluginPortal.trial.bypass)).toBeTruthy();
  });
  it("replaces the trial with the purchase and never serializes the trial key", async () => {
    m.purchases.mockResolvedValue([PURCHASE]);
    const tree = await PortalPage();
    expect(tree.props.children.props.trial.licenseKey).toBeNull();
    render(<NextIntlClientProvider locale="en" messages={en}>{tree}</NextIntlClientProvider>);
    expect(screen.getByText("Replaced by your license")).toBeTruthy();
    expect(document.body.textContent).not.toContain(KEY.trim());
    expect(document.querySelector("pre")?.textContent).toBe(PURCHASE.licenseKey);
    expect(screen.getAllByRole("button", { name: "Copy key" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Download your key file (.key)" })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Trial" }).querySelector("button")).toBeNull();
  });
});


it.each([["en", en], ["ja", ja]] as const)("renders product-specific paid instructions in %s", (locale, messages) => {
  const { container } = render(<NextIntlClientProvider locale={locale} messages={messages}>
    <PluginsPortalView items={[]} purchases={[{
      productKey: "muedvox", displayName: "MUEDvox", keyFileName: "MUEDvox.license.key",
      licenseKey: "VOX-KEY", purchasedAtISO: "2026-10-01T00:00:00Z", downloadUrl: "", version: null,
    }]} />
  </NextIntlClientProvider>);
  expect(screen.getByRole("heading", { name: "MUEDvox" })).toBeTruthy();
  expect(container.textContent).toContain(locale === "ja" ? "MUEDvox の画面にドラッグ" : "drag it onto MUEDvox.");
  expect(container.textContent).not.toContain("Drop license.key here");
  expect(container.textContent).not.toContain("masterchain");
});
