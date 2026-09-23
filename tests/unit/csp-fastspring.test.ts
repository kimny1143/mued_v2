import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "@/lib/security/content-security-policy";
import { BUILDER_SRC } from "@/lib/masterchain/fastspring-checkout";

describe.each([true, false])("FastSpring popup checkout CSP (isProduction: %s)", (isProduction) => {
  const csp = contentSecurityPolicy({ isProduction });
  const directives = new Map(
    csp.split(";").filter((part) => part.trim()).map((part) => {
      const [directive, ...sources] = part.trim().split(/\s+/);
      return [directive, sources];
    }),
  );

  // Source membership is independent of NODE_ENV's optional 'unsafe-eval'.
  it.each(["script-src", "style-src"])("%s allows the SBL origin", (directive) => {
    expect(directives.get(directive)).toContain(new URL(BUILDER_SRC).origin);
  });

  it.each(["connect-src", "frame-src"])("%s allows FastSpring storefronts", (directive) => {
    expect(directives.get(directive)).toContain("https://*.onfastspring.com");
  });

  it("img-src allows the SBL loading image", () => {
    expect(directives.get("img-src")).toContain("https://sbl.onfastspring.com");
  });

  it("allows unsafe-eval only outside production", () => {
    expect(directives.get("script-src")?.includes("'unsafe-eval'")).toBe(!isProduction);
  });

  it("does not allow bare wildcards or unrestricted HTTP(S) schemes", () => {
    for (const [directive, sources] of directives) {
      for (const broadSource of ["*", "https:", "http:"]) {
        expect(sources, directive).not.toContain(broadSource);
      }
    }
  });
});

it("next.config.ts uses the shared CSP builder instead of inline directives", () => {
  // Read as text: importing the config loads native dependencies in Vitest workers.
  const configSource = readFileSync(resolve(__dirname, "../../next.config.ts"), "utf8");
  expect(configSource).toMatch(/\bcontentSecurityPolicy\s*\(/);
  expect(configSource).not.toContain("script-src");
});
