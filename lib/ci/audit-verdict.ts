/**
 * Pure decision for the production-dependency audit gate — extracted so the BLOCKING path can be
 * tested.
 *
 * `npm audit` exits 1 for two unrelated reasons: high/critical vulnerabilities were found, or the
 * audit API could not be reached. CI could not tell them apart, so a registry outage looked exactly
 * like a security finding (npm's audit API broke on both endpoints on 2026-07-26).
 *
 * ★This function is where "block" is decided. It lives apart from the script because the case that
 * MUST NOT regress — vulnerabilities present ⇒ block — cannot be exercised through the CLI while the
 * registry is down. A gate whose blocking path is untested is not a gate.
 *
 * Discrimination is STRUCTURAL, not textual: a real report carries `vulnerabilities` + `metadata`;
 * the error envelope carries `statusCode`/`uri` and no report. Matching on the message text would be
 * a proxy for the outcome, which is the substitution this repo keeps getting caught by.
 */

export type AuditVerdict =
  | { kind: "clean"; low: number; moderate: number }
  | { kind: "vulnerable"; blocking: number; names: string[] }
  | { kind: "not-performed"; reason: string };

interface AuditReportish {
  vulnerabilities?: Record<string, { severity?: string }>;
  metadata?: { vulnerabilities?: Record<string, number> };
  statusCode?: number;
  uri?: string;
  message?: string;
}

/**
 * @param parsed  `npm audit --json` output, already JSON.parse'd — or null when it was unparseable
 *                (itself an endpoint-side symptom: npm 11 returned undecoded gzip).
 */
export function auditVerdict(parsed: AuditReportish | null): AuditVerdict {
  const isRealReport = !!(parsed && parsed.vulnerabilities && parsed.metadata);

  if (!isRealReport) {
    // ★Before concluding "we learned nothing", look for findings anyway.
    //
    // A payload can carry `vulnerabilities` without `metadata` — and BOTH classifications exit 0
    // here, so there is no "safe side" in this branch to fall back on: mis-filing it as
    // not-performed would hand us a payload that literally says "critical" and let the build
    // through. The realistic trigger is npm schema drift, which has already happened once (v6
    // reported under `advisories`, v7+ under `vulnerabilities` + `metadata`). If `metadata` is ever
    // renamed, every real report would land here — and the bypass header invites extending the
    // expiry, so it would not even self-correct on time. (product課, 2026-07-26.)
    const named = Object.entries(parsed?.vulnerabilities ?? {})
      .filter(([, v]) => v?.severity === "high" || v?.severity === "critical")
      .map(([name, v]) => `${name} (${v.severity})`);
    if (named.length > 0) {
      return { kind: "vulnerable", blocking: named.length, names: named };
    }

    // ★The mirror image, and it was missing. The scan above covers "has `vulnerabilities`, lacks
    // `metadata`"; this covers "has `metadata.vulnerabilities`, lacks the map". Both are schema
    // drift, both carry an ANSWER, and without this one a payload that says `high: 3` was filed as
    // not-performed — which the retry loop then re-fetches for the whole budget, violating this
    // gate's own rule that a decided verdict is never re-asked. Fail-closed saved us (an expired
    // bypass blocks not-performed), so only the diagnosis was wrong — but the asymmetry was real:
    // one direction was defended and its mirror was not. (product課, #979.)
    const meta = parsed?.metadata?.vulnerabilities ?? {};
    const metaBlocking = (meta.high ?? 0) + (meta.critical ?? 0);
    if (metaBlocking > 0) {
      return {
        kind: "vulnerable",
        blocking: metaBlocking,
        // ★No names available — the map this payload lacks is where names live. Say so, rather than
        // emit an empty list that reads as "blocking count with no detail found".
        names: [`${metaBlocking} high/critical reported in metadata (per-package names unavailable — payload lacks the vulnerabilities map)`],
      };
    }

    const reason =
      parsed?.statusCode || parsed?.message
        ? `HTTP ${parsed.statusCode ?? "?"} from ${parsed.uri ?? "the audit API"}`
        : "npm produced no parseable audit report";
    return { kind: "not-performed", reason };
  }

  const sev = parsed!.metadata!.vulnerabilities ?? {};
  const blocking = (sev.high ?? 0) + (sev.critical ?? 0);

  if (blocking > 0) {
    const names = Object.entries(parsed!.vulnerabilities!)
      .filter(([, v]) => v.severity === "high" || v.severity === "critical")
      .map(([name, v]) => `${name} (${v.severity})`);
    return { kind: "vulnerable", blocking, names };
  }

  return { kind: "clean", low: sev.low ?? 0, moderate: sev.moderate ?? 0 };
}

/**
 * Whether a "could not be performed" result should still block. The bypass is time-boxed on purpose:
 * a workaround that works is invisible, so without an expiry it silently outlives the outage it was
 * written for. After this date the next person is forced to look and decide.
 */
/**
 * ★May this verdict be re-fetched? Exactly one kind qualifies: the one that carries NO answer.
 *
 * ★Exported and tested because it is the line between "retry the transport" (legitimate — the answer
 * is a function of package-lock.json, so asking again cannot change it) and "retry the verdict"
 * (forbidden — that is re-rolling a gate until it passes). ★A `vulnerable` result must never come
 * back here: it answered, and it answered no.
 */
export function mayRefetch(
  verdict: AuditVerdict,
): verdict is Extract<AuditVerdict, { kind: "not-performed" }> {
  return verdict.kind === "not-performed";
}

export function bypassExpired(bypassUntil: string, now: Date): boolean {
  return now > new Date(`${bypassUntil}T23:59:59Z`);
}
