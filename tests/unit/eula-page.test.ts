import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PAGE = join(ROOT, "app", "[locale]", "eula", "page.tsx");

describe("staged EULA page", () => {
  it.each(["ja", "en"] as const)("exists for %s and renders the message-backed placeholder", (locale) => {
    expect(existsSync(PAGE)).toBe(true);
    const page = readFileSync(PAGE, "utf8");
    const messages = JSON.parse(readFileSync(join(ROOT, "messages", `${locale}.json`), "utf8"));

    expect(page).toContain('useTranslations("eula")');
    expect(page).toContain("locales.map((locale) => ({ locale }))");
    expect(messages.eula).toEqual(expect.objectContaining({
      title: expect.any(String),
      lastUpdated: expect.any(String),
      body: expect.any(String),
      contact: expect.objectContaining({ title: expect.any(String), body: expect.any(String) }),
    }));
    expect(messages.eula.body.length).toBeGreaterThan(0);
  });

  it("mirrors /learn staging: noindex before live and sitemap inclusion only after live", () => {
    const page = readFileSync(PAGE, "utf8");
    const sitemap = readFileSync(join(ROOT, "app", "sitemap.ts"), "utf8");
    const config = readFileSync(join(ROOT, "lib", "legal", "config.ts"), "utf8");

    expect(config).toContain('process.env.EULA_LIVE === "1"');
    expect(page).toContain("robots: { index: EULA_LIVE, follow: EULA_LIVE }");
    expect(sitemap).toContain("...(EULA_LIVE");
    expect(sitemap).toContain("`${MUED}/en/eula`");
    expect(sitemap).toContain("`${MUED}/ja/eula`");
  });
});
