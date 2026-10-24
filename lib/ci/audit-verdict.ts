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
  | { kind: "clean"; low: number; moderate: number; excused?: string[] }
  | { kind: "vulnerable"; blocking: number; names: string[] }
  | { kind: "not-performed"; reason: string };

/** One advisory npm reports for a package (`via` entries that are objects). */
interface AuditVia {
  url?: string;
  severity?: string;
  name?: string;
}

interface AuditReportish {
  vulnerabilities?: Record<string, { severity?: string; via?: Array<string | AuditVia> }>;
  metadata?: { vulnerabilities?: Record<string, number> };
  statusCode?: number;
  uri?: string;
  message?: string;
}

/**
 * One advisory the gate lets through, for one package, until a date. See lib/ci/audit-allowlist.ts.
 * ★Per advisory, never per package: a second high advisory on the same package still blocks.
 */
export interface AuditAllowance {
  advisory: string; // GHSA id, matched against the end of the advisory URL
  package: string;
  until: string; // YYYY-MM-DD (UTC end of day). After it the entry matches nothing ⇒ red again.
  reason: string;
  removeWhen: string;
}

export interface AuditAllowContext {
  entries: readonly AuditAllowance[];
  now: Date;
}

const BLOCKING_SEVERITIES = new Set(["high", "critical"]);

/**
 * Is this package's high/critical status fully explained by allowed advisories?
 *
 * Every high/critical advisory of its own must be an unexpired allowance for THIS package, and every
 * package it inherits from (string `via`) must itself be excused. Low/moderate advisories don't
 * block, so they don't need excusing.
 */
function isExcused(
  name: string,
  vulns: NonNullable<AuditReportish["vulnerabilities"]>,
  allow: AuditAllowContext,
  seen: Set<string> = new Set(),
): boolean {
  if (seen.has(name)) return true; // cycle: decided by the other members of the cycle
  seen.add(name);
  const via = vulns[name]?.via;
  if (!via || via.length === 0) return false; // nothing to attribute the severity to ⇒ not excused
  return via.every((v) => {
    if (typeof v === "string") return isExcused(v, vulns, allow, seen);
    if (!BLOCKING_SEVERITIES.has(v.severity ?? "")) return true;
    return allow.entries.some(
      (e) =>
        e.package === (v.name ?? name) &&
        (v.url ?? "").endsWith(e.advisory) &&
        !bypassExpired(e.until, allow.now),
    );
  });
}

/**
 * @param parsed  `npm audit --json` output, already JSON.parse'd — or null when it was unparseable
 *                (itself an endpoint-side symptom: npm 11 returned undecoded gzip).
 * @param allow   Advisories that may pass until their date. Applied ONLY to a real report: a payload
 *                without `metadata` is schema drift, and drift is not the place to start excusing.
 */
export function auditVerdict(parsed: AuditReportish | null, allow?: AuditAllowContext): AuditVerdict {
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
    const vulns = parsed!.vulnerabilities!;
    const flagged = Object.entries(vulns).filter(([, v]) => BLOCKING_SEVERITIES.has(v.severity ?? ""));
    const excused = allow ? flagged.filter(([name]) => isExcused(name, vulns, allow)) : [];
    // ★Only a full, named explanation turns red into green. If the map names fewer packages than
    // metadata counts, something is unaccounted for — keep blocking.
    if (excused.length > 0 && excused.length === flagged.length && flagged.length >= blocking) {
      return {
        kind: "clean",
        low: sev.low ?? 0,
        moderate: sev.moderate ?? 0,
        excused: excused.map(([name, v]) => `${name} (${v.severity})`),
      };
    }
    const names = flagged
      .filter(([name]) => !excused.some(([n]) => n === name))
      .map(([name, v]) => `${name} (${v.severity})`);
    return { kind: "vulnerable", blocking: names.length > 0 ? names.length : blocking, names };
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
