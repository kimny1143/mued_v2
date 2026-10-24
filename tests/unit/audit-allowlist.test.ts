/**
 * Unit — the audit gate's per-advisory allowlist (lib/ci/audit-verdict.ts + lib/ci/audit-allowlist.ts).
 *
 * ★What must hold: an allowance excuses exactly one advisory on one package until its date — a second
 * advisory, another package, or the day after `until` all turn the gate red again.
 */
import { describe, it, expect } from "vitest";
import { auditVerdict, type AuditAllowance } from "@/lib/ci/audit-verdict";
import { AUDIT_ALLOWLIST } from "@/lib/ci/audit-allowlist";

const ZOD = "GHSA-mrhx-c7xc-m3w5";
const allowZod: AuditAllowance = {
  advisory: ZOD,
  package: "zod",
  until: "2026-12-31",
  reason: "test",
  removeWhen: "test",
};
const adv = (id: string, severity: string, name = "zod") => ({
  url: `https://github.com/advisories/${id}`,
  severity,
  name,
});
// Shape of the real `npm audit --json` report on 2026-10-25 after the next/sentry/puppeteer bumps.
const report = (vulns: Record<string, { severity: string; via: Array<string | ReturnType<typeof adv>> }>) => {
  const high = Object.values(vulns).filter((v) => v.severity === "high").length;
  const critical = Object.values(vulns).filter((v) => v.severity === "critical").length;
  return { vulnerabilities: vulns, metadata: { vulnerabilities: { low: 6, moderate: 3, high, critical } } };
};
const before = new Date("2026-11-01T00:00:00Z");
const after = new Date("2027-01-01T00:00:01Z");

describe("audit allowlist", () => {
  it("excuses the allowed advisory, and still names it", () => {
    const v = auditVerdict(report({ zod: { severity: "high", via: [adv(ZOD, "high")] } }), {
      entries: [allowZod],
      now: before,
    });
    expect(v.kind).toBe("clean");
    if (v.kind !== "clean") throw new Error("unreachable");
    expect(v.excused).toEqual(["zod (high)"]);
  });

  it("turns red again the day after `until`", () => {
    const v = auditVerdict(report({ zod: { severity: "high", via: [adv(ZOD, "high")] } }), {
      entries: [allowZod],
      now: after,
    });
    expect(v.kind).toBe("vulnerable");
  });

  it("does not excuse a second high advisory on the same package", () => {
    const v = auditVerdict(
      report({ zod: { severity: "high", via: [adv(ZOD, "high"), adv("GHSA-xxxx-yyyy-zzzz", "high")] } }),
      { entries: [allowZod], now: before },
    );
    expect(v.kind).toBe("vulnerable");
    if (v.kind !== "vulnerable") throw new Error("unreachable");
    expect(v.names).toEqual(["zod (high)"]);
  });

  it("does not move to another package with the same advisory id", () => {
    const v = auditVerdict(
      report({ "not-zod": { severity: "high", via: [adv(ZOD, "high", "not-zod")] } }),
      { entries: [allowZod], now: before },
    );
    expect(v.kind).toBe("vulnerable");
  });

  it("excuses a package that is high only because it depends on the excused one", () => {
    const v = auditVerdict(
      report({
        zod: { severity: "high", via: [adv(ZOD, "high")] },
        "chromium-bidi": { severity: "high", via: ["zod"] },
      }),
      { entries: [allowZod], now: before },
    );
    expect(v.kind).toBe("clean");
  });

  it("keeps blocking an unrelated finding, and names only that one", () => {
    const v = auditVerdict(
      report({
        zod: { severity: "high", via: [adv(ZOD, "high")] },
        next: { severity: "critical", via: [adv("GHSA-2464-fhr4-w9xw", "critical", "next")] },
      }),
      { entries: [allowZod], now: before },
    );
    expect(v.kind).toBe("vulnerable");
    if (v.kind !== "vulnerable") throw new Error("unreachable");
    expect(v.names).toEqual(["next (critical)"]);
  });

  it("ignores low/moderate advisories on an excused package", () => {
    const v = auditVerdict(
      report({ zod: { severity: "high", via: [adv(ZOD, "high"), adv("GHSA-aaaa-bbbb-cccc", "moderate")] } }),
      { entries: [allowZod], now: before },
    );
    expect(v.kind).toBe("clean");
  });

  it("without an allow context, behaves exactly as before (blocks)", () => {
    const v = auditVerdict(report({ zod: { severity: "high", via: [adv(ZOD, "high")] } }));
    expect(v.kind).toBe("vulnerable");
  });
});

describe("AUDIT_ALLOWLIST — what conductor approved (2026-10-25)", () => {
  it("has exactly one entry: GHSA-mrhx for zod", () => {
    expect(AUDIT_ALLOWLIST.map((e) => `${e.advisory}:${e.package}`)).toEqual([`${ZOD}:zod`]);
  });

  it("expires no later than 2026-12-31 and says when to remove it", () => {
    for (const e of AUDIT_ALLOWLIST) {
      expect(e.until <= "2026-12-31").toBe(true);
      expect(e.removeWhen.length).toBeGreaterThan(10);
      expect(e.reason.length).toBeGreaterThan(10);
    }
  });
});
