import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

/**
 * Share cards (conductor / CCO 2026-10-01). Next.js REPLACES the layout's openGraph / twitter with the
 * page's own object — it does not merge — so:
 *   · a page with openGraph but no twitter showed the layout's (stale) twitter text;
 *   · a page whose og/twitter has no `images` shares with no picture at all.
 * ★Plain fs walk (no fs.globSync): CI runs Node 20.
 */
function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return pages(p);
    return name === "page.tsx" || name === "layout.tsx" ? [p] : [];
  });
}

/** The `{…}` object literal that follows `key: ` (balanced braces), or null. */
function block(src: string, key: string): string | null {
  const at = src.indexOf(`${key}: {`);
  if (at < 0) return null;
  let depth = 0;
  for (let i = src.indexOf("{", at); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(at, i + 1);
  }
  return null;
}

it("every page / layout with openGraph also sets twitter, and both carry a share image", () => {
  const withOg = pages("app").filter((p) => readFileSync(p, "utf8").includes("openGraph:"));
  // ★Positive control: the walk finds the pages at all.
  expect(withOg.length).toBeGreaterThan(5);
  const problems: string[] = [];
  for (const p of withOg) {
    const src = readFileSync(p, "utf8");
    const og = block(src, "openGraph");
    const tw = block(src, "twitter");
    if (!tw) problems.push(`${p}: no twitter`);
    if (og && !/images: (DIAL_)?SHARE_IMAGES/.test(og)) problems.push(`${p}: openGraph without images`);
    if (tw && !/images: (DIAL_)?SHARE_IMAGES/.test(tw)) problems.push(`${p}: twitter without images`);
  }
  expect(problems).toEqual([]);
});

it("the layout defaults carry the share image and no longer the old MUED tagline", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  expect(block(layout, "openGraph")).toContain("images: SHARE_IMAGES");
  expect(block(layout, "twitter")).toContain("images: SHARE_IMAGES");
  expect(layout).not.toMatch(/ミューズの教え|制作を記録し/);
  const llms = readFileSync("app/llms.txt/route.ts", "utf8");
  expect(llms).not.toMatch(/ミューズの教え|制作の記録|事業の仕組みづくり|MUEDnote/);
  expect(llms).toContain("MUED は、glasswerks inc. の音楽制作の道具のブランドです。");
});
