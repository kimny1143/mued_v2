import { globSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

/**
 * ★A page that sets openGraph must also set twitter (conductor 2026-10-01): Next.js does not copy og into
 * twitter, so a page without it showed the site default — which had gone stale ("ミューズの教え…").
 */
it("every page with openGraph metadata also sets twitter", () => {
  const pages = globSync("app/**/page.tsx");
  const withOg = pages.filter((p) => readFileSync(p, "utf8").includes("openGraph:"));
  // ★Positive control: the pattern finds the pages at all.
  expect(withOg.length).toBeGreaterThan(5);
  const missing = withOg.filter((p) => !readFileSync(p, "utf8").includes("twitter:"));
  expect(missing).toEqual([]);
});

it("the site default og/twitter no longer carries the old MUED tagline", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  expect(layout).not.toMatch(/ミューズの教え|制作を記録し/);
  const llms = readFileSync("app/llms.txt/route.ts", "utf8");
  expect(llms).not.toMatch(/ミューズの教え|制作の記録|事業の仕組みづくり|MUEDnote/);
  expect(llms).toContain("MUED は、glasswerks inc. の音楽制作の道具のブランドです。");
});
