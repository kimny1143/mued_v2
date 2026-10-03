/**
 * G1 of the sales-path guard (kimny 2026-10-04「反省文は必要ないから仕組みを作ってくれ」・Chief brief
 * `brief-sales-path-guard-20261004.md`): a PR that touches the customer path (scripts/ci/sales-path.mjs) must say,
 * in its body, what it does to sales — one line:
 *
 *   sales-impact: 増える: <one-line reason>
 *   sales-impact: 変わらない: <one-line reason>
 *   sales-impact: 法の明文: <the statute/article it obeys>
 *
 * ★"減る" cannot be written — a change that lowers sales cannot be sent through this gate.
 * ★"法の明文" needs the article's name: a grey-area worry is not a statute and cannot wall off the path.
 * Enforced by the merge gate (scripts/verify/pr-merge-gate.ts) — the only way PRs are merged here.
 */

const LINE = /^[ \t>*-]*sales-impact[ \t]*[:：][ \t]*(.*)$/gim;
const KINDS = ["増える", "変わらない", "法の明文"];
const EMPTY = /^[\s\-—–ー・.。…]*$/;

/**
 * @param {string} body
 * @returns {{ ok: true, kind: string, reason: string } | { ok: false, reason: string }}
 */
export function parseSalesImpact(body) {
  const lines = [...String(body ?? "").matchAll(LINE)].map((m) => m[1].trim());
  if (lines.length === 0) return { ok: false, reason: "PR 本文に `sales-impact:` 行が無い" };
  if (lines.length > 1) return { ok: false, reason: `\`sales-impact:\` 行が ${lines.length} 行ある（1 行だけにする）` };
  const value = lines[0];
  if (/^減る/.test(value)) return { ok: false, reason: "「減る」は書けない（売上を減らす変更は、この経路では出せない）" };
  const m = value.match(/^(増える|変わらない|法の明文)[ \t]*[:：][ \t]*(.*)$/);
  if (!m) return { ok: false, reason: `値は ${KINDS.join("／")} のどれか＋「: 理由」（今: ${JSON.stringify(value)}）` };
  const [, kind, reason] = m;
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
  const lines = [...String(body ?? "").matchAll(/^[ \t>*-]*copy-approval[ \t]*[:：][ \t]*(.*)$/gim)].map((m) => m[1].trim());
  if (lines.length === 0) return { ok: false, reason: "承認文（docs/copy/）を変える PR の本文に `copy-approval:` 行が無い" };
  if (lines.length > 1) return { ok: false, reason: `\`copy-approval:\` 行が ${lines.length} 行ある（1 行だけにする）` };
  const m = lines[0].match(/^(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(\S.*)$/);
  if (!m) return { ok: false, reason: `書式は「copy-approval: <誰> <YYYY-MM-DD> <経路>」（今: ${JSON.stringify(lines[0])}）` };
  return { ok: true, who: m[1], date: m[2], via: m[3].trim() };
}
