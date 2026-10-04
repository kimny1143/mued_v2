/**
 * G1 of the sales-path guard (kimny 2026-10-04「反省文は必要ないから仕組みを作ってくれ」・Chief brief
 * `brief-sales-path-guard-20261004.md`): a PR that touches the customer path (scripts/ci/sales-path.mjs) must say,
 * in its body, what it does to sales — one line:
 *
 *   sales-impact: 増える: <one-line reason>
 *   sales-impact: 変わらない: <one-line reason>
 *   sales-impact: 法の明文: <the statute/article it obeys>
 *   sales-impact: kimny の判断: <kimny's words, in short> <YYYY-MM-DD>
 *
 * ★"減る" cannot be written. A change kimny makes KNOWING it lowers sales goes through the one exit,
 *   "kimny の判断: … <date>" (Chief 2026-10-04 (a)): a recorded decision beats a false "変わらない" — a lie in this
 *   line is invisible to any machine, kimny's words with a date are not.
 * ★"法の明文" needs the article's name: a grey-area worry is not a statute and cannot wall off the path.
 * Enforced by the merge gate (scripts/verify/pr-merge-gate.ts) — the only way PRs are merged here.
 */

const LINE = /^[ \t>*-]*sales-impact[ \t]*[:：][ \t]*(.*)$/gim;
const KINDS = ["増える", "変わらない", "法の明文", "kimny の判断"];
const EMPTY = /^[\s\-—–ー・.。…]*$/;

/**
 * The body without its fenced code blocks (``` or ~~~). A format example written inside a code block is not a
 * declaration (CCO #1229: #1229's own example of the line made it count 2 lines and VOID).
 * @param {string} body
 */
export function withoutFences(body) {
  const out = [];
  let fence = null;
  for (const line of String(body ?? "").split(/\r?\n/)) {
    const m = line.match(/^[ \t>]*(`{3,}|~{3,})/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      continue;
    }
    if (m) {
      fence = m[1];
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * @param {string} body
 * @returns {{ ok: true, kind: string, reason: string } | { ok: false, reason: string }}
 */
export function parseSalesImpact(body) {
  const lines = [...withoutFences(body).matchAll(LINE)].map((m) => m[1].trim());
  if (lines.length === 0) return { ok: false, reason: "PR 本文に `sales-impact:` 行が無い" };
  if (lines.length > 1) return { ok: false, reason: `\`sales-impact:\` 行が ${lines.length} 行ある（1 行だけにする）` };
  const value = lines[0];
  if (/^減る/.test(value)) return { ok: false, reason: "「減る」は書けない（売上を減らす変更は、この経路では出せない）" };
  const m = value.match(/^(増える|変わらない|法の明文|kimny ?の判断)[ \t]*[:：][ \t]*(.*)$/);
  if (!m) return { ok: false, reason: `値は ${KINDS.join("／")} のどれか＋「: 理由」（今: ${JSON.stringify(value)}）` };
  const [, rawKind, reason] = m;
  const kind = rawKind.replace(/^kimny ?の判断$/, "kimny の判断");
  if (kind === "kimny の判断" && !/\d{4}-\d{2}-\d{2}/.test(reason)) {
    return { ok: false, reason: "「kimny の判断」には判断の日付（YYYY-MM-DD）が要る" };
  }
  if (EMPTY.test(reason)) {
    return { ok: false, reason: kind === "法の明文" ? "「法の明文」には条文名が要る" : `「${kind}」の後に理由を 1 行` };
  }
  return { ok: true, kind, reason: reason.trim() };
}

/**
 * Provenance of an approved-copy change (CCO #1223): the approved copy (docs/copy/approved-*.json) can be edited
 * in the same PR as the copy, so a PR that changes it must say who approved the words, when and how:
 *
 *   copy-approval: kimny 2026-10-04 Chief の窓（逐語）
 *
 * Needs a name, a YYYY-MM-DD date and the channel (anything after the date).
 * @param {string} body
 * @returns {{ ok: true, who: string, date: string, via: string } | { ok: false, reason: string }}
 */
export function parseCopyApproval(body) {
  return parseProvenance(body, "copy-approval", "承認文（docs/copy/）を変える PR");
}

/**
 * Provenance of a guard change (CCO #1227): the sales-path guards can be loosened in the same PR as the change
 * they guard, so a PR that edits a guard must say who approved the guard change, when and how:
 *
 *   guard-change: kimny 2026-10-04 conductor の窓（購入ボタンだけ別の色）
 *
 * Same format as copy-approval. The guard files are GUARD_FILES below.
 * @param {string} body
 * @returns {{ ok: true, who: string, date: string, via: string } | { ok: false, reason: string }}
 */
export function parseGuardChange(body) {
  return parseProvenance(body, "guard-change", "売る経路の守り（G1〜G4・merge の gate）を変える PR");
}

/**
 * The files that ARE the sales-path guards (G1–G4 and the gate that enforces G1). Editing one of them can loosen
 * a guard, so it needs a guard-change line. ★The tests count too: weakening an assertion is loosening the guard.
 */
export const GUARD_FILES = [
  /^e2e\/sales-path\//,
  /^playwright\.sales-path\.config\.ts$/,
  /^\.github\/workflows\/sales-path\.yml$/,
  /^scripts\/ci\/sales-(path|impact)\.mjs$/,
  /^scripts\/verify\/pr-merge-gate\.ts$/,
  /^scripts\/verify\/gate-mutation-check\.ts$/,
  /^lib\/funnel\/(denominator-trend|numbers)\.ts$/,
  /^scripts\/emit-funnel-numbers\.ts$/, // attaches G4 to the daily numbers
  /^vitest\.config\.unit\.ts$/, // its include/exclude can drop the G1/G3/G4 tests from CI
  /^\.github\/workflows\/test\.yml$/, // runs those tests
  /^tests\/unit\/(sales-path-[^/]+|sales-impact-line|funnel-denominator-trend)\.test\.ts$/,
];

/** @param {readonly string[]} paths */
export function touchesGuard(paths) {
  return paths.some((p) => GUARD_FILES.some((re) => re.test(p)));
}

/**
 * @param {string} body
 * @param {string} key
 * @param {string} what
 * @returns {{ ok: true, who: string, date: string, via: string } | { ok: false, reason: string }}
 */
function parseProvenance(body, key, what) {
  const lines = [...withoutFences(body).matchAll(new RegExp(`^[ \\t>*-]*${key}[ \\t]*[:：][ \\t]*(.*)$`, "gim"))].map((m) => m[1].trim());
  if (lines.length === 0) return { ok: false, reason: `${what} の本文に \`${key}:\` 行が無い` };
  if (lines.length > 1) return { ok: false, reason: `\`${key}:\` 行が ${lines.length} 行ある（1 行だけにする）` };
  const m = lines[0].match(/^(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\S.*)$/);
  if (!m) return { ok: false, reason: `書式は「${key}: <誰> <YYYY-MM-DD> <経路>」（今: ${JSON.stringify(lines[0])}）` };
  return { ok: true, who: m[1], date: m[2], via: m[3].trim() };
}
