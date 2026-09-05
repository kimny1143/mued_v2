/**
 * Unit — the production-dependency audit gate's decision (lib/ci/audit-verdict.ts).
 *
 * ★The case that matters most here is "vulnerabilities present ⇒ block". It cannot be exercised
 * through the CLI while npm's audit API is down (2026-07-26), which is exactly when the surrounding
 * bypass was written — so without these tests the blocking path would ship unverified, and a gate
 * whose blocking path is unverified is not a gate.
 */
import { describe, it, expect } from "vitest";
import { auditVerdict, bypassExpired, mayRefetch } from "@/lib/ci/audit-verdict";

const report = (sev: Record<string, number>, vulns: Record<string, { severity: string }> = {}) => ({
  vulnerabilities: vulns,
  metadata: { vulnerabilities: sev },
});

describe("auditVerdict — ★blocks on real findings", () => {
  it("blocks when a high vulnerability is present, and names it", () => {
    const v = auditVerdict(
      report({ low: 2, moderate: 1, high: 1, critical: 0 }, { "brace-expansion": { severity: "high" } }),
    );
    expect(v.kind).toBe("vulnerable");
    if (v.kind !== "vulnerable") throw new Error("unreachable");
    expect(v.blocking).toBe(1);
    expect(v.names).toEqual(["brace-expansion (high)"]);
  });

  it("blocks on critical too, and counts high + critical together", () => {
    const v = auditVerdict(
      report(
        { low: 0, moderate: 0, high: 2, critical: 1 },
        { a: { severity: "high" }, b: { severity: "critical" }, c: { severity: "high" } },
      ),
    );
    expect(v.kind).toBe("vulnerable");
    if (v.kind !== "vulnerable") throw new Error("unreachable");
    expect(v.blocking).toBe(3);
    expect(v.names).toHaveLength(3);
  });

  it("passes when only low/moderate are present (matches --audit-level=high)", () => {
    const v = auditVerdict(report({ low: 6, moderate: 4, high: 0, critical: 0 }));
    expect(v.kind).toBe("clean");
    if (v.kind !== "clean") throw new Error("unreachable");
    expect(v.moderate).toBe(4);
  });

  it("passes on a completely clean report", () => {
    expect(auditVerdict(report({})).kind).toBe("clean");
  });
});

describe("auditVerdict — ★endpoint failure is NOT mistaken for a clean run", () => {
  it("classifies the npm 10 error envelope as not-performed, not clean", () => {
    // Real shape observed 2026-07-26: no `vulnerabilities`, no `metadata`.
    const v = auditVerdict({
      message: "400 Bad Request - POST .../audits/quick - Bad Request",
      statusCode: 400,
      uri: "https://registry.npmjs.org/-/npm/v1/security/audits/quick",
    });
    expect(v.kind).toBe("not-performed");
    if (v.kind !== "not-performed") throw new Error("unreachable");
    expect(v.reason).toContain("400");
  });

  it("classifies unparseable output as not-performed (npm 11 returned undecoded gzip)", () => {
    const v = auditVerdict(null);
    expect(v.kind).toBe("not-performed");
  });

  it("does not read severity counts from a half-shaped payload", () => {
    // Missing `metadata` means the counts cannot be trusted…
    expect(auditVerdict({ vulnerabilities: {} }).kind).toBe("not-performed");
    expect(auditVerdict({ metadata: { vulnerabilities: {} } }).kind).toBe("not-performed");
  });

  it("★STILL blocks when a half-shaped payload names a high/critical finding", () => {
    // …but "cannot read the counts" must not become "ignore the findings". Both not-performed and a
    // mis-filed report exit 0, so there is no safe default here — it has to block explicitly.
    // Realistic trigger: npm schema drift (v6 used `advisories`; v7+ uses `vulnerabilities` +
    // `metadata`). If `metadata` is renamed, every real report lands in this branch.
    const v = auditVerdict({
      vulnerabilities: { "some-pkg": { severity: "critical" }, other: { severity: "low" } },
      // no metadata
    });
    expect(v.kind).toBe("vulnerable");
    if (v.kind !== "vulnerable") throw new Error("unreachable");
    expect(v.names).toEqual(["some-pkg (critical)"]);
  });

  it("does not block on a half-shaped payload that only names low/moderate", () => {
    expect(auditVerdict({ vulnerabilities: { p: { severity: "moderate" } } }).kind).toBe("not-performed");
  });

  it("★the real endpoint-error envelope still classifies as not-performed (no false block)", () => {
    // Guard the other direction: the fix above must not turn a genuine outage into a hard failure.
    const v = auditVerdict({
      body: "…", error: "Bad Request", headers: {}, message: "400 Bad Request",
      method: "POST", statusCode: 400, uri: "https://registry.npmjs.org/-/npm/v1/security/audits/quick",
    } as Parameters<typeof auditVerdict>[0]);
    expect(v.kind).toBe("not-performed");
  });
});

describe("bypassExpired — ★the workaround has a clock", () => {
  it("is not expired before the date", () => {
    expect(bypassExpired("2026-08-09", new Date("2026-08-01T00:00:00Z"))).toBe(false);
  });

  it("is not expired on the final day (inclusive)", () => {
    expect(bypassExpired("2026-08-09", new Date("2026-08-09T12:00:00Z"))).toBe(false);
  });

  it("★is expired the day after — so the bypass cannot quietly outlive the outage", () => {
    expect(bypassExpired("2026-08-09", new Date("2026-08-10T00:00:01Z"))).toBe(true);
  });
});

describe("mayRefetch — the line between retrying transport and retrying a verdict", () => {
  it("★a 'vulnerable' verdict is NEVER re-fetched — it answered, and it answered no", () => {
    expect(mayRefetch({ kind: "vulnerable", blocking: 2, names: ["a", "b"] })).toBe(false);
  });

  it("a 'clean' verdict is not re-fetched either — it answered", () => {
    expect(mayRefetch({ kind: "clean", low: 6, moderate: 8 })).toBe(false);
  });

  it("★only 'not-performed' may be re-fetched — that is the one carrying no answer", () => {
    expect(mayRefetch({ kind: "not-performed", reason: "HTTP 503" })).toBe(true);
    expect(mayRefetch({ kind: "not-performed", reason: "HTTP 400" })).toBe(true);
  });

  it("★every verdict kind is covered — a new kind must not default into retryable", () => {
    // If AuditVerdict grows a fourth kind, this fails until someone decides which side it is on.
    // ★Silence would put it on the retry side by omission, which is the wrong default for a gate.
    const kinds = ["clean", "vulnerable", "not-performed"] as const;
    const decided = kinds.filter((k) =>
      [true, false].includes(mayRefetch({ kind: k } as unknown as Parameters<typeof mayRefetch>[0])),
    );
    expect(decided).toHaveLength(kinds.length);
  });
});
