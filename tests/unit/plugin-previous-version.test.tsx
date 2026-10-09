/**
 * A previous build kept beside the current one (kimny 2026-10-09: 「既存バージョンのインストーラは維持」
 * 「既存セッションの値が変わることを…ダウンロードページで明記」).
 *
 * Properties: (1) a plugin with no entry renders exactly as before; (2) an entry shows only beside the
 * version it was written for; (3) every kept file is on the shelf, pinned, and not the current file;
 * (4) wherever an entry exists, the notice text exists in both languages.
 */
import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { PLUGIN_DIST, type PluginKey } from "@/lib/plugins/registry";
import { PREVIOUS_VERSIONS, previousVersionFor, type PreviousVersion } from "@/lib/plugins/previous-versions";
import { WINDOWS_BETA } from "@/lib/plugins/windows-beta";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

vi.mock("@/app/dashboard/plugins/plugins-portal.module.css", () => ({
  default: new Proxy({}, { get: (_t, k) => String(k) }),
}));
const hasKey = vi.hoisted(() => ({ added: true }));
vi.mock("next-intl", () => ({
  useTranslations: (ns?: string) =>
    Object.assign(
      (key: string, vars?: Record<string, unknown>) => `${ns ? `${ns}.` : ""}${key}${vars ? `:${JSON.stringify(vars)}` : ""}`,
      { has: (key: string) => !["added", "display", "addedImageAlt"].includes(key) || hasKey.added },
    ),
  useLocale: () => "ja",
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => <img src={src} alt={alt} data-testid={(rest as Record<string, string>)["data-testid"]} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { PluginsPortalView, type PortalViewItem } from "@/app/dashboard/plugins/plugins-portal-view";
import { PluginVersionDetails, PluginVersionNotice } from "@/components/features/plugins/plugin-version-notice";

const ROOT = join(__dirname, "..", "..");
const FIXTURE: PreviousVersion = {
  version: "1.0.0",
  macUrl: "https://mued.jp/downloads/eula-2026.10/MUEDlim-1.0.0-installer.pkg",
  windowsUrl: "https://mued.jp/downloads/MUEDlim-1.0.0-win-x64-7ca36065.zip",
  besideVersion: "9.9.9",
};
const row = (over: Partial<PortalViewItem> = {}): PortalViewItem => ({
  pluginKey: "muedlim",
  i18nNamespace: "muedlim",
  version: "9.9.9",
  downloadUrl: "https://mued.jp/downloads/MUEDlim-9.9.9-installer.pkg",
  claimedAtISO: "2026-10-01T00:00:00.000Z",
  windows: null,
  ...over,
});

describe("previousVersionFor", () => {
  it("returns the entry only beside the version it was written for", () => {
    const table = { muedlim: FIXTURE };
    expect(previousVersionFor("muedlim", "9.9.9", table)).toEqual(FIXTURE);
    expect(previousVersionFor("muedlim", "9.9.10", table)).toBeNull(); // a later build: the old notice does not carry over
    expect(previousVersionFor("muedsat", "9.9.9", table)).toBeNull();
    expect(previousVersionFor("masterchain", "9.9.9", table)).toBeNull();
  });
});

describe("portal row", () => {
  it("without a previous build: no note, no extra links (the row is what it was)", () => {
    const { container, queryByTestId } = render(<PluginsPortalView items={[row()]} />);
    expect(queryByTestId("portal-previous-version")).toBeNull();
    expect(container.querySelectorAll("a[download]")).toHaveLength(1);
    expect(container.textContent).not.toContain("changes.");
  });

  it("with one: the change note, and the previous Mac and Windows files as links — the current build stays the one button", () => {
    const { getByTestId, container } = render(
      <PluginsPortalView items={[row({ previous: FIXTURE, windows: { url: "https://mued.jp/downloads/MUEDlim-9.9.9-win-x64-abc.zip", version: "9.9.9" } })]} />,
    );
    const note = getByTestId("portal-previous-version");
    expect(note.textContent).toContain('changes.muedlim.summary:{"version":"9.9.9","previous":"1.0.0"}');
    expect(note.textContent).toContain('changes.muedlim.revert:{"version":"9.9.9","previous":"1.0.0"}');
    expect(getByTestId("portal-version-notes-link").getAttribute("href")).toBe("/ja/muedlim#version-notes");
    expect(getByTestId("portal-previous-mac").getAttribute("href")).toBe(FIXTURE.macUrl);
    expect(getByTestId("portal-previous-windows").getAttribute("href")).toBe(FIXTURE.windowsUrl);
    expect(container.querySelectorAll("a.dl")).toHaveLength(1);
    expect(container.querySelector("a.dl")?.getAttribute("href")).toContain("9.9.9");
  });

  it("a previous build with no Windows file shows only the Mac link", () => {
    const { queryByTestId } = render(<PluginsPortalView items={[row({ previous: { ...FIXTURE, windowsUrl: null } })]} />);
    expect(queryByTestId("portal-previous-mac")).not.toBeNull();
    expect(queryByTestId("portal-previous-windows")).toBeNull();
  });

  it("the note belongs to its own row — a sibling module is untouched", () => {
    const { getAllByTestId } = render(
      <PluginsPortalView items={[row({ previous: FIXTURE }), row({ pluginKey: "muedsat", i18nNamespace: "muedsat", downloadUrl: "https://mued.jp/downloads/MUEDsat-1.0.1-installer.pkg", version: "1.0.1" })]} />,
    );
    expect(getAllByTestId("portal-previous-version")).toHaveLength(1);
  });
});

describe("<PluginVersionNotice> on the product page", () => {
  it("renders nothing without a previous build", () => {
    const { container } = render(
      <>
        <PluginVersionNotice plugin="muedlim" previous={null} />
        <PluginVersionDetails plugin="muedlim" previous={null} />
      </>,
    );
    expect(container.innerHTML).toBe("");
  });

  it("with one: one line that links the full section — never a file", () => {
    const { getByTestId } = render(<PluginVersionNotice plugin="muedlim" previous={FIXTURE} />);
    const notice = getByTestId("plugin-version-notice");
    expect(notice.textContent).toContain("muedlim.versionNotice.line");
    const hrefs = Array.from(notice.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["#version-notes"]); // one line: the portal link lives in the section it points at
  });

  it("the full section carries the four points and is the anchor the links point at", () => {
    const { getByTestId } = render(<PluginVersionDetails plugin="muedlim" previous={FIXTURE} />);
    const details = getByTestId("plugin-version-details");
    expect(details.id).toBe("version-notes");
    for (const k of ["lead", "added", "display", "saved", "automation", "au", "revert"]) expect(details.textContent).toContain(`muedlim.versionNotice.${k}`);
    expect(Array.from(details.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual(["/dashboard/plugins"]);
  });

  it("MUEDlim: the 1:1-on screen sits in the section, with an alt that names the version — and the file exists", () => {
    const { getByTestId } = render(<PluginVersionDetails plugin="muedlim" previous={FIXTURE} />);
    const img = getByTestId("plugin-version-added-image");
    expect(existsSync(join(ROOT, "public", img.getAttribute("src")!))).toBe(true);
    expect(img.getAttribute("alt")).toContain("versionNotice.addedImageAlt");
    for (const m of [ja, en]) {
      expect(m.muedlim.versionNotice.addedImageAlt).toContain("MUEDlim {version}");
      expect(m.muedlim.versionNotice.addedImageAlt).toContain("GAIN REDUCTION −2.7 dB");
      expect(m.muedlim.visuals.faceplateAlt).toContain("MUEDlim 1.0.1"); // the hero image is the 1.0.1 screen too
    }
    // ★A new file name, not an overwrite of faceplate.webp: the image optimizer and browsers cache by URL, so the
    //   same path kept showing the 1.0.0 screen (seen locally 2026-10-09). MUEDsat names its faceplates by version too.
    for (const f of ["components/features/muedlim-landing/muedlim-landing-content.tsx", "components/features/muedsp-landing/muedsp-landing-content.tsx", "components/features/landing/studio-showroom.tsx"]) {
      const src = readFileSync(join(ROOT, f), "utf8");
      expect(src).toContain("/muedlim/faceplate-1.0.1.webp");
      expect(src).not.toContain("/muedlim/faceplate.webp");
    }
    expect(existsSync(join(ROOT, "public/muedlim/faceplate-1.0.1.webp"))).toBe(true);
  });

  it("a version with no added feature shows no \"added\" paragraph (the key is optional)", () => {
    hasKey.added = false;
    try {
      const { getByTestId } = render(<PluginVersionDetails plugin="muedlim" previous={FIXTURE} />);
      expect(getByTestId("plugin-version-details").textContent).not.toMatch(/versionNotice\.(added|display)/);
    } finally {
      hasKey.added = true;
    }
  });

  it("sits before the download form on /muedlim", () => {
    const src = readFileSync(join(ROOT, "components/features/muedlim-landing/muedlim-landing-content.tsx"), "utf8");
    const notice = src.indexOf('<PluginVersionNotice plugin="muedlim" />');
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(src.indexOf("<SignupForm />"));
    expect(src).toContain('<PluginVersionDetails plugin="muedlim" />');
  });
});

describe("the entries actually configured", () => {
  const entries = Object.entries(PREVIOUS_VERSIONS) as [PluginKey, PreviousVersion][];
  const pins = readFileSync(join(ROOT, "tests/unit/plugin-download-artifact-integrity.test.ts"), "utf8");
  const text = (o: unknown, path: string) => path.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], o);

  it("only free plugins in the registry have one", () => {
    for (const [key] of entries) expect(Object.keys(PLUGIN_DIST)).toContain(key);
  });

  it.each(entries)("%s: shown beside the current version, older than it, files on the shelf, pinned, and not the current files", (key, prev) => {
    const dist = PLUGIN_DIST[key];
    expect(prev.besideVersion).toBe(dist.version); // else the entry is configured but never shown
    expect(prev.version).not.toBe(dist.version);
    for (const url of [prev.macUrl, prev.windowsUrl].filter((u): u is string => !!u)) {
      expect(url).toMatch(/^https:\/\/mued\.jp\/downloads\//);
      expect(url).toContain(`-${prev.version}-`);
      expect(existsSync(join(ROOT, "public", new URL(url).pathname))).toBe(true);
      expect(pins).toContain(url); // the kept file stays sha256-pinned as a shelf row
      expect([dist.downloadUrl, WINDOWS_BETA[key].url]).not.toContain(url);
    }
  });

  it.each(entries)("%s: the change note exists in ja and en, on the portal and on the product page", (key) => {
    const ns = PLUGIN_DIST[key].i18nNamespace;
    for (const m of [ja, en]) {
      const notice = ["line", "detailsLink", "previousLink", "detailsHeading", "lead", "sessionsHeading", "saved", "automation", "au", "revert"];
      // "added" is optional per plugin (a feature that came with the version); PluginVersionDetails renders it when present.
      for (const path of [...["summary", "revert", "more"].map((k) => `pluginPortal.changes.${key}.${k}`), ...notice.map((k) => `${ns}.versionNotice.${k}`)]) {
        const v = text(m, path);
        expect(typeof v === "string" && v.trim().length > 0, `${path} missing`).toBe(true);
      }
    }
  });

  it("the one line before the form says who it is for and that a value changes (ja / en)", () => {
    // conductor 2026-10-09: both must be in the line itself, not only in the section it links.
    expect(ja.muedlim.versionNotice.line).toMatch(/\{previous\} のセッションをお持ちの方/);
    expect(ja.muedlim.versionNotice.line).toMatch(/値が変わります/);
    expect(en.muedlim.versionNotice.line).toMatch(/If you have \{previous\} sessions/);
    expect(en.muedlim.versionNotice.line).toMatch(/values change/);
  });

  it("MUEDlim: the 1:1 switch is named on the page and the portal, with what going back does to it (ja / en)", () => {
    // dsp 2026-10-09 (mued-dsp main 2955027f, release-note facts §3–4): a session saved with 1:1 on plays louder in 1.0.0.
    for (const m of [ja, en]) {
      expect(m.muedlim.versionNotice.added).toContain("1:1");
      expect(m.muedlim.versionNotice.added).toContain("Unity"); // the name a DAW's automation list shows (conductor 2026-10-09: the param name stays)
      expect(m.muedlim.versionNotice.revert).toContain("1:1");
      expect(m.pluginPortal.changes.muedlim.summary).toContain("1:1");
      expect(m.pluginPortal.changes.muedlim.revert).toContain("1:1");
    }
  });

  it("MUEDlim: the numbers are the shipped build's — CEILING to −18, automation × 6 (ja / en)", () => {
    // dsp 2026-10-09 13:12 JST (mued-dsp main 27284478 §2): new = old × 6. The −12 / × 4 of the earlier candidates must not survive anywhere.
    const all = (m: typeof ja) => [...Object.values(m.muedlim.versionNotice), ...Object.values(m.pluginPortal.changes.muedlim), m.muedlim.about.controls.ceiling.desc].join("\n");
    for (const m of [ja, en]) {
      expect(all(m)).toContain("−18");
      expect(all(m)).toContain("−6.0");
      expect(all(m)).not.toMatch(/−4\.0|−2\.0|4 倍|four times|−12〜0|−12 to 0/);
    }
  });

  it("the shared labels exist in both languages", () => {
    for (const m of [ja, en]) {
      for (const k of ["label", "mac", "windows"]) expect(typeof text(m, `pluginPortal.previous.${k}`)).toBe("string");
    }
  });
});
