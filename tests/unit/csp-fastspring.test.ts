import { beforeAll, describe, expect, it } from "vitest";
import config from "@/next.config";
import { BUILDER_SRC } from "@/lib/masterchain/fastspring-checkout";

describe("FastSpring popup checkout CSP", () => {
  let directives: Map<string, string[]>;

  beforeAll(async () => {
    if (!config.headers) throw new Error("Next config must define headers()");
    const entries = await config.headers();
    const csp = entries
      .find((entry) => entry.source === "/(.*)")
      ?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
    if (!csp) throw new Error("Global Content-Security-Policy header is missing");

    directives = new Map(
      csp.split(";").filter((part) => part.trim()).map((part) => {
        const [directive, ...sources] = part.trim().split(/\s+/);
        return [directive, sources];
      }),
    );
  });

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

  it("does not allow bare wildcards or unrestricted HTTP(S) schemes", () => {
    for (const [directive, sources] of directives) {
      for (const broadSource of ["*", "https:", "http:"]) {
        expect(sources, directive).not.toContain(broadSource);
      }
    }
  });
});
