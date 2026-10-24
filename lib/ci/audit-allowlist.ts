/**
 * Advisories the production-dependency audit gate lets through — each one for one package, with
 * evidence, an expiry and a removal condition. Read by scripts/verify/audit-prod-deps.ts.
 *
 * ★This is not a way to quiet the gate. Each entry is a conductor decision, and after `until` the
 * entry matches nothing, so the gate turns red again on its own. Extending a date is a new decision.
 * ★Pinned by tests/unit/audit-allowlist.test.ts (how many entries, which ones, how far out).
 */
import type { AuditAllowance } from "@/lib/ci/audit-verdict";

export const AUDIT_ALLOWLIST: readonly AuditAllowance[] = [
  {
    // conductor 2026-10-25 (option (a)): turned the audit red for every mued_v2 PR on 2026-10-25.
    advisory: "GHSA-mrhx-c7xc-m3w5",
    package: "zod",
    until: "2026-12-31",
    reason:
      "Memory exhaustion validating a large array with no length limit. The only fix is zod 4.6.6+ " +
      "(a major upgrade from our 3.25). The advisory names zod 4's $ZodArray; our schemas use the v3 " +
      "API, and every API z.array now has a .max() (same PR), which bounds the input on our side.",
    removeWhen: "The app moves to zod 4 (status.md blocked_by). Delete this entry in that PR.",
  },
];
