/**
 * Unit — every locale page either has a bare-path redirect or is exempt for a written reason.
 *
 * ★This exists because the previous version of the same idea was too narrow. `plugin-bare-path-redirects`
 * derives its population from `PLUGIN_DIST` — 3 of the 10 locale pages. It closed /muedrive and left
 * /advisory, /muedial and /redesign bare-404 with a 200 locale page (product課 measured 2026-08-29,
 * the day after that test shipped). ★The property is "a locale page's bare path does not 404"; the
 * population that matches it is the FILESYSTEM, and a registry can only ever be a subset of it.
 *
 * ★So the population here is `app/[locale]/*​/page.tsx` and nothing is narrowed away silently:
 * a page is either covered by a redirect or named in EXEMPT with the reason. Excluding something
 * quietly is the same as not checking it.
 *
 * ★Reads next.config.ts as SOURCE TEXT, not by importing it — only one test file may import it
 * (`legal-pages-locale-links.test.ts` does). Two importers load @parcel/watcher in two vitest workers
 * and the second load fails on Linux CI with `Module did not self-register`; that is how #928 broke an
 * unrelated test file while its own tests passed. Measured, not theorised.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const LOCALE_DIR = join(process.cwd(), "app", "[locale]");

/**
 * Locale pages that intentionally have NO bare-path entry, each with the reason. ★A reason, not just a
 * name: the next person has to be able to tell a deliberate exemption from a forgotten one.
 */
const EXEMPT: Record<string, string> = {
  eula:
    "staged locale-only legal route — purchase consent and legal sibling links always carry /{locale}; " +
    "a bare redirect is intentionally omitted because next.config.ts is out of scope for this scaffold",
  redesign:
    "noindex preview route for the kimny 現物 gate — its own header says 'never a public surface', " +
    "so a bare entry would advertise something not meant to be found",
};

function localePages(): string[] {
  return readdirSync(LOCALE_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(LOCALE_DIR, d.name, "page.tsx")))
    .map((d) => d.name)
    .sort();
}

function redirectSources(): string[] {
  const src = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
  return [...src.matchAll(/\{\s*source:\s*['"]([^'"]+)['"]\s*,\s*destination:/g)].map((m) => m[1]);
}

describe("locale pages — bare paths", () => {
  it("★finds the pages and the redirects (either being empty would pass everything below)", () => {
    expect(localePages().length).toBeGreaterThanOrEqual(8);
    expect(redirectSources().length).toBeGreaterThan(5);
    // ★Positive control on both readers at once: a page and a redirect that certainly exist.
    expect(localePages()).toContain("muedsp");
    expect(redirectSources()).toContain("/tokushoho");
  });

  it("★every locale page has a bare redirect, or an exemption with a reason", () => {
    const sources = redirectSources();
    const missing = localePages().filter((p) => !sources.includes(`/${p}`) && !(p in EXEMPT));
    expect(
      missing,
      `no bare-path redirect and no exemption: ${missing.join(", ")} — add a redirect, or an EXEMPT entry saying why not`,
    ).toEqual([]);
  });

  it("★the exemptions are all still real pages (a stale one shrinks the population silently)", () => {
    for (const name of Object.keys(EXEMPT)) {
      expect(localePages(), `${name} is exempt but has no locale page`).toContain(name);
    }
  });

  it("★an exempt page must NOT have a redirect (the exemption and the config agree)", () => {
    const sources = redirectSources();
    for (const name of Object.keys(EXEMPT)) {
      expect(sources, `${name} is exempt yet redirected — one of the two is wrong`).not.toContain(`/${name}`);
    }
  });

  it("★negative control: an invented page is not silently 'covered'", () => {
    expect(redirectSources()).not.toContain("/zzz-nonexistent-locale-page");
  });
});

describe("portal empty-state CTA carries the locale", () => {
  const view = () =>
    readFileSync(join(process.cwd(), "app", "dashboard", "plugins", "plugins-portal-view.tsx"), "utf8");

  it("★links /{locale}/muedsp, not the bare path", () => {
    // The bare form 307s to /en unconditionally, so a JA reader with an empty shelf landed on the
    // English catalogue. A source-text guard because both forms render and type-check identically.
    expect(view()).toContain("`/${locale}/muedsp`");
    expect(view()).not.toContain('href="/muedsp"');
  });

  it("★positive control: the file really is the portal view (guards against a moved file)", () => {
    expect(view()).toContain("PluginsPortalView");
  });
});
