import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { touchesSalesPath } from "../../scripts/ci/sales-path.mjs";

/** G2/G1 trigger (scripts/ci/sales-path.mjs): which changes count as the customer path. */
describe("sales-path trigger", () => {
  it.each([
    "components/features/muedsat-landing/muedsat-signup-form.tsx",
    "components/features/muedsp-landing/masterchain-try.tsx",
    "components/features/muedsp-landing/masterchain-buy-button.tsx",
    "components/features/muedvox-landing/muedvox-landing-content.tsx",
    "components/features/license/license-key-actions.tsx",
    "lib/plugins/subscribe-handler.ts",
    "lib/plugins/audience.ts",
    "lib/masterchain/demo-handler.ts",
    "lib/masterchain/fastspring-checkout.ts",
    "lib/services/email.service.ts",
    "messages/ja.json",
    "messages/en.json",
    "app/[locale]/muedsp/page.tsx",
    "app/[locale]/muedrive/page.tsx",
    "app/globals.css",
    "e2e/sales-path/cta.spec.ts",
    ".github/workflows/sales-path.yml",
    "middleware.ts",
    "next.config.ts",
    "package.json",
    "package-lock.json",
    "postcss.config.mjs",
    "components/ui/button.tsx",
    "lib/masterchain/config.ts",
    "lib/muedvox/config.ts",
    "lib/muedsat/config.ts",
    "lib/plugins/registry.ts",
    "docs/copy/approved-ja.json",
  ])("%s → customer path", (file) => {
    expect(touchesSalesPath([file])).toBe(true);
  });

  it.each([
    "docs/muedsp/analysis.md",
    "status.md",
    "lib/funnel/newsletter-metrics.ts",
    "app/[locale]/privacy/page.tsx",
    "tests/unit/foo.test.ts",
    "lib/masterchain/license.ts",
  ])("%s → not the customer path", (file) => {
    expect(touchesSalesPath([file])).toBe(false);
  });

  it("the CLI prints the GITHUB_OUTPUT line", () => {
    const run = (input: string) => execFileSync("node", ["scripts/ci/sales-path.mjs"], { input }).toString();
    expect(run("status.md\nmessages/ja.json\n")).toBe("sales=true\n");
    expect(run("status.md\n")).toBe("sales=false\n");
    expect(run("")).toBe("sales=false\n");
  });
});
