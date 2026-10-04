import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MasterchainTry } from "@/components/features/muedsp-landing/masterchain-try";
import { trackCtaClick } from "@/lib/analytics/gtag";
const flags = vi.hoisted(() => ({ demo: true, windows: true }));
vi.mock("@/lib/masterchain/config", () => ({
  get MASTERCHAIN_DEMO_LIVE() { return flags.demo; },
  get MASTERCHAIN_WINDOWS_LIVE() { return flags.windows; },
  MASTERCHAIN_DOWNLOAD_URL: "https://mued.jp/downloads/demo.pkg",
  MASTERCHAIN_WINDOWS_URL: "https://mued.jp/downloads/demo.zip",
  MASTERCHAIN_WINDOWS_VERSION: "1.0.1",
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/lib/analytics/gtag", () => ({ trackCtaClick: vi.fn() }));
beforeEach(() => { flags.demo = true; flags.windows = true; });
it("offers native one-click download links with no form, registration or network prerequisite", () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  const { container } = render(<MasterchainTry />);
  expect(container.querySelector("form, input")).toBeNull();
  const mac = screen.getByRole("link", { name: "downloadMac" });
  expect(mac).toHaveAttribute("href", "https://mued.jp/downloads/demo.pkg");
  expect(mac).toHaveAttribute("download");
  expect(screen.getByRole("link", { name: "downloadWindows" })).toHaveAttribute("href", "https://mued.jp/downloads/demo.zip");
  expect(screen.getByText("Windows · VST3")).toBeVisible();
  fireEvent.click(mac);
  expect(trackCtaClick).toHaveBeenCalledWith("masterchain", "demo_direct_mac", "download_link");
  expect(fetch).not.toHaveBeenCalled();
});
it("respects the demo and Windows publication gates", () => {
  flags.windows = false;
  const view = render(<MasterchainTry />);
  expect(screen.queryByRole("link", { name: "downloadWindows" })).toBeNull();
  flags.demo = false;
  view.rerender(<MasterchainTry />);
  expect(view.container).toBeEmptyDOMElement();
});
