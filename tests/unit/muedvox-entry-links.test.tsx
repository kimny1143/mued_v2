/**
 * The ways into MUEDvox, and back to masterchain (#1308 · kimny 10/27 「LPのtopからの遷移、作ってなくない？」).
 *
 * Until #1308 the top page and /muedsp had no href to /muedvox at all — the product was LIVE and reachable only by URL.
 * This renders the three real components with the real message files and reads the hrefs and the words off the
 * markup, so removing a link (or its LIVE gate opening onto a missing key) fails here rather than on a phone.
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import enMain from "@/messages/en.json";
import jaMain from "@/messages/ja.json";
import enVox from "@/messages/muedvox.en.json";
import jaVox from "@/messages/muedvox.ja.json";

const MESSAGES = { en: { ...enMain, muedvox: enVox }, ja: { ...jaMain, muedvox: jaVox } } as const;
type Locale = keyof typeof MESSAGES;
let locale: Locale = "en";

function translator(namespace: string) {
  return (key: string, vars?: Record<string, unknown>) => {
    let node: unknown = MESSAGES[locale];
    for (const part of `${namespace}.${key}`.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
    if (typeof node !== "string") throw new Error(`missing message ${namespace}.${key} (${locale})`);
    return vars ? node.replace(/\{(\w+)\}/g, (_m, name: string) => String(vars[name])) : node;
  };
}
function withRaw(namespace: string) {
  const t = translator(namespace) as ReturnType<typeof translator> & { raw: (key: string) => unknown; rich: unknown };
  t.raw = (key: string) => {
    let node: unknown = MESSAGES[locale];
    for (const part of `${namespace}.${key}`.split(".")) node = (node as Record<string, unknown>)[part];
    return node;
  };
  t.rich = (key: string) => t(key);
  return t;
}

vi.mock("@/components/features/landing/studio-showroom.module.css", () => ({ default: new Proxy({}, { get: (_t, k) => String(k) }) }));
vi.mock("next-intl", () => ({
  useLocale: () => locale,
  useTranslations: (namespace: string) => withRaw(namespace),
  useMessages: () => MESSAGES[locale],
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { locale: string; namespace: string }) => withRaw(namespace),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  usePathname: () => `/${locale}`,
  useSearchParams: () => new URLSearchParams(),
}));

import { StudioShowroom } from "@/components/features/landing/studio-showroom";
import { MuedspLandingContent } from "@/components/features/muedsp-landing/muedsp-landing-content";
import { MuedvoxLandingContent } from "@/components/features/muedvox-landing/muedvox-landing-content";
import { MUEDVOX_VIDEO_ID } from "@/lib/muedvox/config";
import { contentSecurityPolicy } from "@/lib/security/content-security-policy";

beforeEach(() => {
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
});
afterEach(cleanup);

const hrefs = (root: HTMLElement) => [...root.querySelectorAll("a")].map((a) => a.getAttribute("href"));

describe.each(["en", "ja"] as const)("%s", (l) => {
  beforeEach(() => {
    locale = l;
  });

  it("the top page links to /muedvox, with MUEDvox's own line and price", async () => {
    const { container } = render(await StudioShowroom({ locale: l, preview: false }));
    expect(hrefs(container)).toContain(`/${l}/muedvox`);
    expect(container.textContent).toContain(MESSAGES[l].muedvox.hero.title);
    expect(container.textContent).toContain(MESSAGES[l].muedvox.buy.price);
    expect(container.textContent).toContain(MESSAGES[l].studioShowroom.voxCta);
  });

  it("/muedsp links to /muedvox?from=muedsp", () => {
    const { getByTestId } = render(<MuedspLandingContent />);
    const line = getByTestId("muedsp-related-vox");
    expect(hrefs(line)).toEqual([`/${l}/muedvox?from=muedsp`]);
    expect(line.textContent).toContain(MESSAGES[l].muedvox.hero.title);
    expect(line.textContent).toContain(MESSAGES[l].muedsp.related.vox);
  });

  it("/muedvox links back to /muedsp?from=muedvox", () => {
    const { getByTestId } = render(<MuedvoxLandingContent />);
    const line = getByTestId("muedvox-related-masterchain");
    expect(hrefs(line)).toEqual([`/${l}/muedsp?from=muedvox`]);
    expect(line.textContent).toContain(MESSAGES[l].muedsp.masterchain.eyebrow);
    expect(line.textContent).toContain(MESSAGES[l].muedsp.related.masterchain);
  });

  it("/muedvox keeps the EULA one click away — beside Buy and in the footer — without a section of its own", () => {
    const { container, getByTestId } = render(<MuedvoxLandingContent />);
    expect(getByTestId("muedvox-eula-link").getAttribute("href")).toBe(`/${l}/eula`);
    expect(getByTestId("muedvox-eula-link").textContent).toBe(MESSAGES[l].muedvox.legal.eulaLink);
    expect(hrefs(container.querySelector("footer")!)).toContain(`/${l}/eula`);
    expect(container.querySelector("footer")!.textContent).toContain(MESSAGES[l].muedvox.legal.thirdParty);
    expect(container.querySelector("#legal")).toBeNull();
  });

  it("/muedvox shows the how-to video as a still until play — then the youtube-nocookie player, and the CSP allows both", () => {
    const { getByTestId } = render(<MuedvoxLandingContent />);
    const box = getByTestId("muedvox-video");
    // ★Before play: nothing from YouTube at all — the still is our own file (CCO #1319) — and it is a real link (no JS).
    expect(box.querySelector("iframe")).toBeNull();
    expect(box.querySelector("a")!.getAttribute("href")).toBe(`https://youtu.be/${MUEDVOX_VIDEO_ID}`);
    const still = decodeURIComponent(box.querySelector("img")!.getAttribute("src")!);
    expect(still).toContain(`/muedvox/video-${MUEDVOX_VIDEO_ID}.webp`);
    expect(still).not.toMatch(/^https?:\/\//);
    expect(existsSync(join(process.cwd(), "public", "muedvox", `video-${MUEDVOX_VIDEO_ID}.webp`)), "the still for this ID is in public/").toBe(true);
    fireEvent.click(box.querySelector("a")!);
    const frame = box.querySelector("iframe")!;
    expect(new URL(frame.getAttribute("src")!).origin).toBe("https://www.youtube-nocookie.com");
    expect(frame.getAttribute("src")).toContain(`/embed/${MUEDVOX_VIDEO_ID}`);
    expect(frame.getAttribute("title")).toBe(MESSAGES[l].muedvox.video.title);
    const csp = contentSecurityPolicy({ isProduction: true });
    expect(csp).toMatch(/frame-src [^;]*https:\/\/www\.youtube-nocookie\.com/);
    expect(csp).not.toMatch(/ytimg|img-src [^;]*youtube/);
    expect(csp).not.toMatch(/frame-src [^;]*https:\/\/www\.youtube\.com/);
  });

  it("the privacy policy names YouTube in section 3, and the page renders that line (CCO #1319)", () => {
    const section3 = MESSAGES[l].privacy.section3 as Record<string, string>;
    expect(section3.youtube).toMatch(/^YouTube ?[（(]Google LLC[）)]/);
    expect(readFileSync(join(process.cwd(), "app/[locale]/privacy/page.tsx"), "utf8")).toContain('t("section3.youtube")');
  });
});
