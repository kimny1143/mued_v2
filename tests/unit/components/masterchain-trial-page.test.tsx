import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import en from "@/messages/en.json";
import { EULA_VERSION } from "@/lib/legal/eula";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>,
}));

const m = vi.hoisted(() => ({ live: true, user: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/masterchain/config", () => ({
  get MASTERCHAIN_TRIAL_LIVE() { return m.live; },
  MASTERCHAIN_TRIAL_DAYS: 15, MASTERCHAIN_DOWNLOAD_URL: "/downloads/masterchain.pkg",
}));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.user }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: () => createTranslator({ locale: "en", messages: en, namespace: "muedsp.trial" }),
}));

import TrialPage, { metadata } from "@/app/[locale]/muedsp/trial/page";
import { MasterchainTrialForm } from "@/components/features/muedsp-landing/masterchain-trial-form";

const KEY = "MUEDSP-LICENSE-v2\nsig=SIGNED\n";
const props = {
  params: Promise.resolve({ locale: "en" }),
  searchParams: Promise.resolve({ utm_source: "newsletter", utm_campaign: ["one", "two"], email: "private@example.com", redirect_url: "https://external.example" }),
};
function view(node: ReactNode) {
  return render(<NextIntlClientProvider locale="en" messages={en}>{node}</NextIntlClientProvider>);
}
function form() {
  return view(<MasterchainTrialForm locale="en" firstTouch={{ utmSource: "newsletter" }} downloadUrl="/downloads/masterchain.pkg" />);
}
function submit() {
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  fireEvent.click(screen.getByRole("button", { name: "Start the 15-day trial" }));
}
beforeEach(() => {
  m.live = true;
  m.user.mockResolvedValue(null);
  vi.stubGlobal("fetch", m.fetch);
  m.fetch.mockResolvedValue({ status: 200, json: async () => ({ licenseKey: KEY, expiresAt: "2026-10-13T23:00:00-07:00" }) });
});
afterEach(() => vi.unstubAllGlobals());

describe("trial page", () => {
  it("returns notFound before auth when staged, and is always noindex", async () => {
    m.live = false;
    await expect(TrialPage(props)).rejects.toThrow("NOT_FOUND");
    expect(m.user).not.toHaveBeenCalled();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
  it("offers passwordless sign-in and preserves only campaign params on return", async () => {
    view(await TrialPage(props));
    const link = screen.getByRole("link", { name: "Start the 15-day trial" });
    const url = new URL(link.getAttribute("href")!, "https://mued.jp");
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("redirect_url")).toBe("/en/muedsp/trial?utm_source=newsletter&utm_campaign=one&utm_campaign=two");
    expect(screen.getByText(en.muedsp.trial.signInHint)).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  it("posts the expected consent body with page UTM params only", async () => {
    m.user.mockResolvedValue({ id: "user" });
    view(await TrialPage(props));
    const [eula, newsletter] = screen.getAllByRole("checkbox");
    expect(eula).toBeRequired();
    expect(newsletter).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Start the 15-day trial" })).toBeDisabled();
    expect(screen.getByRole("link", { name: en.muedsp.trial.eulaLabel })).toHaveAttribute("href", "/en/eula");
    submit();
    await screen.findByRole("heading", { name: "Your trial key" });
    expect(m.fetch).toHaveBeenCalledTimes(1);
    const [url, request] = m.fetch.mock.calls[0];
    expect(url).toBe("/api/masterchain/trial");
    expect(request.method).toBe("POST");
    expect(JSON.parse(request.body)).toEqual({
      eulaAccepted: true, eulaVersion: EULA_VERSION, marketingOptIn: false,
      firstTouch: { utmSource: "newsletter", utmCampaign: "one", landingPath: "/en/muedsp/trial" },
    });
    expect(document.querySelector("pre")?.textContent).toBe(KEY);
    expect(screen.getByText("Trial ends 2026-10-14 (UTC)")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Download masterchain" })).toHaveAttribute("href", "/downloads/masterchain.pkg");
    expect(screen.getByRole("link", { name: "Open your portal" })).toHaveAttribute("href", "/dashboard/plugins");
    expect(screen.getByText(en.muedsp.trial.emailed)).toBeTruthy();
  });
});

describe("trial form", () => {
  it("hides the form when staged", () => {
    m.live = false;
    form();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  it("sends newsletter consent only when checked", async () => {
    form();
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    submit();
    await screen.findByRole("heading", { name: "Your trial key" });
    expect(JSON.parse(m.fetch.mock.calls[0][1].body).marketingOptIn).toBe(true);
  });
  it.each([
    [409, "already_purchased"], [409, "trial_used"], [422, "disposable_email"],
    [429, "rate_limited"], [400, "eula_required"], [500, "generic"], [401, "generic"],
  ] as const)("maps %s / %s to a short error", async (status, code) => {
    m.fetch.mockResolvedValue({ status, json: async () => ({ error: code }) });
    form();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(en.muedsp.trial.errors[code]);
    if (code === "already_purchased") expect(screen.getByRole("link", { name: "Open your portal" })).toHaveAttribute("href", "/dashboard/plugins");
    expect(screen.getByRole("button", { name: "Start the 15-day trial" })).toBeEnabled();
  });
  it("handles a network failure and allows retry", async () => {
    m.fetch.mockRejectedValue(new Error("offline"));
    form();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(en.muedsp.trial.errors.generic);
    expect(screen.getByRole("button", { name: "Start the 15-day trial" })).toBeEnabled();
  });
  it("copies the exact key and reports success only when the clipboard resolves", async () => {
    let resolve!: () => void;
    const writeText = vi.fn(() => new Promise<void>((r) => { resolve = r; }));
    Object.assign(navigator, { clipboard: { writeText } });
    form();
    submit();
    fireEvent.click(await screen.findByRole("button", { name: "Copy key" }));
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
    resolve();
    await screen.findByRole("button", { name: "Copied" });
    expect(writeText).toHaveBeenCalledWith(KEY);
  });
  it("offers manual copy when the clipboard rejects", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    form();
    submit();
    fireEvent.click(await screen.findByRole("button", { name: "Copy key" }));
    await waitFor(() => expect(screen.getByText(en.muedsp.trial.copyFailed)).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
  });
});
