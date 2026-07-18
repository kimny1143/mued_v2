/**
 * Unit — lib/learn/articles.ts (the /learn content-data seam). Reads the real seed markdown in
 * content/learn/*.md and asserts the frontmatter → LearnArticle mapping, the gate object, body
 * stripping, and the slug allowlist (which is also the path-traversal guard).
 */
import { describe, it, expect } from "vitest";
import { LEARN_SLUGS, getLearnArticle, getAllLearnArticles } from "@/lib/learn/articles";

describe("learn articles loader", () => {
  it("exposes the pillar + 4 cluster slugs (pillar first)", () => {
    expect([...LEARN_SLUGS]).toEqual([
      "loudness-and-true-peak",
      "what-is-lufs",
      "lufs-targets-streaming",
      "true-peak-vs-sample-peak",
      "set-true-peak-ceiling",
    ]);
  });

  it("every /learn internal link in a body resolves to a known slug (no dead cluster links)", () => {
    const known = new Set<string>(LEARN_SLUGS);
    for (const slug of LEARN_SLUGS) {
      const body = getLearnArticle(slug)!.body;
      const links = [...body.matchAll(/\]\(\/learn\/([a-z-]+)\)/g)].map((m) => m[1]);
      for (const target of links) {
        expect(known.has(target), `${slug} → /learn/${target}`).toBe(true);
      }
    }
  });

  it("parses frontmatter meta + the structured gate for every article", () => {
    for (const slug of LEARN_SLUGS) {
      const a = getLearnArticle(slug);
      expect(a, slug).not.toBeNull();
      expect(a!.slug).toBe(slug);
      expect(a!.title).toBeTruthy();
      expect(a!.seoTitle).toContain("MUED"); // <title> brand suffix
      expect(a!.description.length).toBeGreaterThan(20);
      expect(a!.gate.ctaHref).toBe("/muedsp"); // the 1-hop gate target
      expect(a!.gate.ctaLabel).toBeTruthy();
      expect(a!.gate.heading).toBeTruthy();
      expect(a!.body.length).toBeGreaterThan(100);
    }
  });

  it("strips frontmatter from the body (no leaked meta / gate / _ops)", () => {
    const a = getLearnArticle("what-is-lufs")!;
    expect(a.body.startsWith("---")).toBe(false);
    expect(a.body).not.toContain("ctaHref");
    expect(a.body).not.toContain("_ops");
    expect(a.body).not.toContain("seoTitle");
  });

  it("returns null for an unknown slug — the allowlist is also the path-traversal guard", () => {
    expect(getLearnArticle("does-not-exist")).toBeNull();
    expect(getLearnArticle("../../../etc/passwd")).toBeNull();
    expect(getLearnArticle("")).toBeNull();
  });

  it("getAllLearnArticles returns all 5 in slug order (pillar first)", () => {
    expect(getAllLearnArticles().map((a) => a.slug)).toEqual([...LEARN_SLUGS]);
  });
});
