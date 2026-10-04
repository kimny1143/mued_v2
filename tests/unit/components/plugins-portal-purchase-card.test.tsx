/**
 * Unit (render) — the P-4 purchase card on /dashboard/plugins.
 *
 * ★This ticket exists because the flow was hostile to a non-technical buyer (kimny, 2026-09-22).
 * ★So the data-layer test is not enough: it proves the right rows are fetched, not that the buyer
 * can actually get their key off the screen. This renders the card and checks the things a buyer
 * would fail on — the key being present IN FULL, and the copy button telling the truth.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ★The CSS module is stubbed: vite tries to run the project's PostCSS/Tailwind pipeline on it and
// fails in this environment. Class names carry no behaviour we assert here — the layout rules
// (wrap-not-scroll, selectable) are in the stylesheet and reviewed there, not exercised by jsdom.
vi.mock("@/app/dashboard/plugins/plugins-portal.module.css", () => ({
  default: new Proxy({}, { get: (_t, k) => String(k) }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}));

// ★Return the key path itself, so an assertion cannot pass on a translated string that happens to
// contain the word we searched for. What we check is which key the component asked for.
vi.mock("next-intl", () => ({
  useTranslations: () => (k: string, vars?: Record<string, unknown>) =>
    vars ? `${k}:${JSON.stringify(vars)}` : k,
  useLocale: () => "ja",
}));

import { PluginsPortalView } from "@/app/dashboard/plugins/plugins-portal-view";

// ★A real-shaped keyfile: multi-line, ending in a long base64 sig line — the shape that makes
// "copy the whole thing" hard in a scrolling box.
const KEY = [
  "MUEDSP-LICENSE-v2",
  "product=MUEDsp",
  "scope=masterchain",
  "owner=buyer@example.com",
  "order=FS-TEST-0001",
  "issued_at=2026-09-22T00:00:00.000Z",
  "expires_at=",
  `sig=${"A".repeat(88)}`,
  "",
].join("\n");

const purchase = {
  productKey: "masterchain" as const,
  displayName: "masterchain",
  keyFileName: "MUEDsp-masterchain.license.key",
  version: "0.1.3",
  downloadUrl: "https://mued.jp/downloads/MUEDsp-masterchain-0.1.3-installer.pkg",
  licenseKey: KEY,
  purchasedAtISO: "2026-09-22T00:00:00.000Z",
};

const writeText = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(navigator, { clipboard: { writeText } });
});
afterEach(() => vi.restoreAllMocks());

describe("purchase card — the buyer can actually get the key", () => {
  it("★renders the key IN FULL (every line, including the long sig line)", () => {
    render(<PluginsPortalView items={[]} purchases={[purchase]} />);
    const pre = document.querySelector("pre");
    expect(pre, "the key must be rendered in a block, not a truncated span").not.toBeNull();
    // ★Byte-identical: the keyfile is signed over its exact bytes.
    expect(pre!.textContent).toBe(KEY);
    expect(screen.getByRole("button", { name: "purchased.copy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "purchased.download" })).toBeTruthy();
    for (const line of ["MUEDSP-LICENSE-v2", "scope=masterchain", `sig=${"A".repeat(88)}`]) {
      expect(pre!.textContent).toContain(line);
    }
  });

  it("★the copy button says 'copied' only AFTER the clipboard resolves", async () => {
    let resolve!: () => void;
    writeText.mockReturnValue(new Promise<void>((r) => { resolve = r; }));
    render(<PluginsPortalView items={[]} purchases={[purchase]} />);

    const btn = screen.getByRole("button", { name: "purchased.copy" });
    fireEvent.click(btn);
    // ★Still pending → must NOT claim success yet.
    expect(screen.getByRole("button", { name: "purchased.copy" })).toBeTruthy();
    resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "purchased.copied" })).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith(KEY); // ★verbatim, not trimmed
  });

  it("★★a clipboard failure says so — it never reports a copy that did not happen", async () => {
    writeText.mockRejectedValue(new Error("NotAllowedError"));
    render(<PluginsPortalView items={[]} purchases={[purchase]} />);
    fireEvent.click(screen.getByRole("button", { name: "purchased.copy" }));
    await waitFor(() => expect(screen.getByText("purchased.copyFailed")).toBeTruthy());
    expect(screen.queryByRole("button", { name: "purchased.copied" })).toBeNull();
  });

  it("★no purchases → no card, no empty key box, and no empty section heading", () => {
    render(<PluginsPortalView items={[]} purchases={[]} />);
    expect(document.querySelector("pre")).toBeNull();
    expect(screen.queryByRole("button", { name: "purchased.copy" })).toBeNull();
    // ★The heading too. Rendering "Purchased 0" to everyone who never bought advertises a section
    // they have no rows in — and an empty labelled rack reads like something went missing.
    // ★Asserted separately because the map alone yields nothing: dropping the length guard would
    // leave the heading behind while the two checks above still passed.
    expect(screen.queryByText("purchased.label")).toBeNull();
  });

  it("carries the download link and the version alongside the key", () => {
    render(<PluginsPortalView items={[]} purchases={[purchase]} />);
    const dl = screen.getByRole("link", { name: /purchased|download/i });
    expect(dl.getAttribute("href")).toBe(purchase.downloadUrl);
    expect(document.body.textContent).toContain("0.1.3");
  });

  it("★a refunded purchase: marked, no key text, no Copy / Download of the key (conductor 2026-09-30)", () => {
    const refunded = { ...purchase, licenseKey: null, refundedAtISO: "2026-10-02T00:00:00.000Z" };
    const { container } = render(<PluginsPortalView items={[]} purchases={[refunded]} />);
    expect(screen.getByTestId("purchase-refunded")).toBeTruthy();
    expect(container.textContent).not.toContain("MUEDSP-LICENSE");
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
    // ★Positive control: the same card unrefunded does render the key.
    const again = render(<PluginsPortalView items={[]} purchases={[purchase]} />);
    expect(again.container.textContent).toContain("MUEDSP-LICENSE");
  });
});

it("MUEDvox card uses its name and filename without a masterchain faceplate or Windows note", async () => {
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:key"), revokeObjectURL });
  try {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("MUEDvox.license.key");
    });
    const { container } = render(<PluginsPortalView items={[]} purchases={[{
      ...purchase, productKey: "muedvox", displayName: "MUEDvox", keyFileName: "MUEDvox.license.key",
      windows: { url: "https://mued.jp/vox.zip", version: "1.0.0" },
    }]} />);
    expect(screen.getByRole("heading", { name: "MUEDvox" })).toBeTruthy();
    expect(container.querySelector(".faceplate")).toBeNull();
    expect(screen.queryByTestId("portal-masterchain-windows-note")).toBeNull();
    expect(screen.getByTestId("portal-masterchain-windows")).toHaveTextContent("MUEDvox 1.0.0");
    fireEvent.click(screen.getByRole("button", { name: "purchased.download" }));
    expect(click).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:key"), { timeout: 2500 });
  } finally {
    vi.unstubAllGlobals();
  }
});

it("a recorded MUEDvox purchase with no installer URL keeps its key but has no empty download link", () => {
  render(<PluginsPortalView items={[]} purchases={[{
    ...purchase, productKey: "muedvox", displayName: "MUEDvox", keyFileName: "MUEDvox.license.key", downloadUrl: "", version: null,
  }]} />);
  expect(document.querySelector("pre")?.textContent).toBe(KEY);
  expect(document.querySelector('a[href=""]')).toBeNull();
});
