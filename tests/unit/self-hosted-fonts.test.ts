/**
 * Unit — the web fonts are served from this repo, and the build never asks Google for them.
 *
 * Why this exists: `next/font/google` downloads the fonts during every `next build`. Google sometimes answers
 * with a URL Next cannot parse (vercel/next.js#99114), and the build fails with a "Module not found" that says
 * nothing about fonts. That failed one CI Build on 2026-10-01 and, on 2026-10-08, one production deploy and one
 * more CI Build. The files now live in public/fonts (scripts/fonts/sync-google-fonts.mjs).
 *
 * What would bring the failure back, and what this test stops:
 *   - someone imports `next/font/google` again (anywhere in the app)        → the scan below
 *   - the CSS points at a font file that is not in the repo, or outside it  → every url() is resolved on disk
 *   - a file is edited or swapped without its name changing                 → the name carries the content hash,
 *     and those URLs are cached for a year as immutable (next.config.ts)
 *   - the generated files are edited by hand and drift from each other      → the generator's own --check
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FONT_PRELOADS, geistMono, jetbrainsMono, sora } from "@/lib/fonts/self-hosted.generated";
// @ts-expect-error — a plain .mjs script (scripts/ is outside tsconfig); its exports are checked by use below.
import { check, parseGoogleCss } from "../../scripts/fonts/sync-google-fonts.mjs";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const css = read("app/fonts.css");
const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, ""));

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) sourceFiles(rel, out);
    else if (/\.(ts|tsx|css)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("self-hosted fonts", () => {
  it("the generator's offline check passes: files, provenance, CSS and the generated module agree", () => {
    expect(check()).toEqual([]);
  });

  it("every font url() in the CSS is a file in public/fonts whose name carries its own sha256", () => {
    expect(urls.length).toBeGreaterThan(40); // 46 faces today; 0 would make the loop below prove nothing
    for (const url of urls) {
      expect(url).toMatch(/^\/fonts\/[a-z0-9-]+\.[0-9a-f]{16}\.woff2$/);
      const path = join(ROOT, "public", url);
      expect(existsSync(path), url).toBe(true);
      const hash = createHash("sha256").update(readFileSync(path)).digest("hex");
      expect(url, url).toContain(`.${hash.slice(0, 16)}.woff2`);
    }
  });

  it("nothing in the CSS points outside this site", () => {
    expect(css).not.toMatch(/https?:|\/\/fonts\.|gstatic|googleapis/);
  });

  it("no source file loads a font through next/font/google (that is what fetched from Google at build time)", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")];
    expect(files.length).toBeGreaterThan(300); // the scan saw the app, not an empty folder
    expect(files).toContain("app/layout.tsx");
    const offenders = files.filter((f) => /from\s+["']next\/font\/google["']/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("the layout keeps the three variable classes on <body>, and the CSS defines the variables Tailwind reads", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("${geistMono.variable} ${jetbrainsMono.variable} ${sora.variable}");
    expect(layout).toContain('import "./fonts.css"');
    for (const [cls, variable, family] of [
      [geistMono.variable, "--font-geist-mono", "Geist Mono"],
      [jetbrainsMono.variable, "--font-jetbrains", "JetBrains Mono"],
      [sora.variable, "--font-sora", "Sora"],
    ] as const) {
      expect(css).toContain(`.${cls} {\n  ${variable}: '${family}', '${family} Fallback';\n}`);
    }
    // globals.css still reads the same names (it was not touched): a renamed variable would silently fall back to system-ui.
    const globals = read("app/globals.css");
    expect(globals).toContain("var(--font-sora)");
    expect(globals).toContain("var(--font-geist-mono)");
    expect(globals).toContain("var(--font-jetbrains)");
  });

  it("preloads exactly the latin file of each family, and the layout sends them as CORS font preloads", () => {
    expect(FONT_PRELOADS).toHaveLength(3);
    for (const href of FONT_PRELOADS) {
      expect(href).toMatch(/^\/fonts\/(geist-mono|jetbrains-mono|sora)-latin\.[0-9a-f]{16}\.woff2$/);
      expect(urls).toContain(href);
    }
    expect(read("app/layout.tsx")).toContain('preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" })');
  });

  it("the font files are cached as immutable, and each family ships its OFL text", () => {
    const config = read("next.config.ts");
    expect(config).toMatch(/source: '\/fonts\/:path\*',\s*headers: \[\{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' \}\]/);
    for (const name of ["OFL-sora.txt", "OFL-jetbrainsmono.txt", "OFL-geistmono.txt"]) {
      expect(read(`public/fonts/${name}`)).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
  });
});

describe("parseGoogleCss — the reader used when the fonts are updated", () => {
  const block = (label: string, url: string) =>
    `/* ${label} */\n@font-face {\n  font-family: 'X';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url(${url}) format('woff2');\n  unicode-range: U+0000-00FF;\n}\n`;
  const ok = "https://fonts.gstatic.com/s/x/v1/abc.woff2";

  it("reads every block, including a subset label with a digit (Geist Mono's symbols2)", () => {
    const faces = parseGoogleCss(block("latin", ok) + block("symbols2", ok));
    expect(faces.map((f: { subset: string }) => f.subset)).toEqual(["latin", "symbols2"]);
  });

  it("refuses a stylesheet where a block could not be read, instead of dropping it", () => {
    expect(() => parseGoogleCss(block("latin", ok) + block("Latin Ext", ok))).toThrow(/read 1 of 2/);
  });

  it("refuses the extensionless URL shape that breaks next build (vercel/next.js#99114)", () => {
    expect(() => parseGoogleCss(block("latin", "https://fonts.gstatic.com/l/font?kit=abc&skey=1&v=v20"))).toThrow(/unexpected font URL shape/);
  });
});
