/**
 * 有料 AI SDK（Anthropic / OpenAI）に到達する API route を列挙し、
 * レート制限が掛かっているかを出す。
 *
 * ★なぜ記号 grep では足りないか（#786 の実例）:
 * `app/api/lobe/commentary/route.ts` には `claude` も `anthropic` も出てこない。
 * 書いてあるのは `generateCommentary` だけで、★記号は `lib/muedlobe/scoring/` に在り、
 * 性質（＝課金が積む面）は `app/api/` に在った。
 * ∴ ★import の推移閉包で当てる（seed = SDK を直接 import するモジュール → 逆向き到達）。
 *
 * ★これは「レート制限が無い route を全部 直せ」という gate ではない。
 * ★ratchet である —— 現状を BASELINE に pin し、★増えた時だけ落とす。
 * 既存分の扱いは判断（認証済なので abuse には account が要る）だが、
 * ★「新しく無防備な課金面が増えた」は必ず出力に出る。
 *
 * 使い方:
 *   npx tsx scripts/verify/paid-sdk-reachability.ts
 *
 * exit: 0=BASELINE 以下 / 1=★増えた / 2=★検査不成立（seed 0・閉包 0・既知 YES を検出できない）
 */

import { readFileSync, existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';

/** ★2026-08-05 実測。増えた時だけ落とす（減った時は下げること） */
const BASELINE_UNPROTECTED = 8;

/**
 * ★陽性対照。閉包がこれを拾えなければ走査が壊れている＝この回の件数は証拠にならない。
 *
 * ★2件 置く理由 (product課 指摘 2026-08-05): 1件だと、その1件が★偶然 別経路で
 * 拾われた時に「閉包が効いている」と読めてしまう。別サブツリーから2件 採る。
 * どちらも seed からの距離 2 ＝ ★SDK を直接 import していない (直接なら閉包の検査にならない)。
 */
const KNOWN_REACHABLE = [
  'app/api/lobe/commentary/route.ts',      // #786 で rateLimit を入れた既知 YES
  'app/api/muednote/sessions/route.ts',    // 別サブツリー・レート制限なし側
];

/**
 * ★閉包が「何段 辿ったか」も検査する。
 * 全 route が距離 0 (＝SDK を直接 import) なら、それは閉包でなく ただの grep であり、
 * ★#786 の面 (記号は lib/ に在り性質は app/api/ に在る) は原理的に見つからない。
 *
 * ★余裕はゼロである (2026-08-05 時点の実測も 2)。product課 指摘:
 * ★中間モジュールが1つ消える★正当な refactor でも maxDepth が 1 になり exit 2 が出る。
 * ★これは欠陥ではない —— 出るのは「NG」でなく「検査不成立」で、
 * 「閉包が仕事をしていることを もう証明できない」という★正直な表明である。
 * ★その時 閾値を下げないこと。下げると「ただの grep」を検出できなくなる。
 * ★正しい手当ては、距離 2 以上の route を陽性対照に選び直すか、
 *   本当に全 route が1段になったのなら この検査自体が不要になったと判断すること。
 */
const MIN_MAX_DEPTH = 2;

const SKIP = new Set(['node_modules', '.next', '.git', 'tests', 'scripts', 'docs']);
const PAID = /from\s+['"](@anthropic-ai\/sdk|openai)['"]/;
const RATE = /\brateLimit\s*\(|checkRateLimit\s*\(/;
/** ★認証は複数の書き方が在る。withAuth* だけを見ると取りこぼす（実測 2026-08-05） */
const AUTH = /withAuthResolved|withAuth\b|withDialAuth|authenticateApiRequest|auth\(\)|currentUser/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = spec.slice(2);
  else if (spec.startsWith('.')) base = normalize(join(dirname(from), spec));
  else return null;
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (existsSync(base + ext)) return base + ext;
  }
  return null;
}

function main() {
  const files = walk('.');
  const imports = new Map<string, Set<string>>();
  const seed = new Set<string>();

  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    if (PAID.test(t)) seed.add(f);
    const deps = new Set<string>();
    for (const m of t.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      const r = resolve(f, m[1]);
      if (r) deps.add(r);
    }
    imports.set(f, deps);
  }

  console.log(`走査              : ${files.length} files`);
  console.log(`有料 SDK 直接 import: ${seed.size}`);

  // ★seed 0 は「使っていない」でなく「走査が届いていない」の可能性がある
  if (files.length === 0 || seed.size === 0) {
    console.log('★検査不成立: 走査 0 件 または seed 0 件。この回の結果は証拠にならない。');
    process.exit(2);
  }

  const rev = new Map<string, Set<string>>();
  for (const [a, bs] of imports) {
    for (const b of bs) {
      if (!rev.has(b)) rev.set(b, new Set());
      rev.get(b)!.add(a);
    }
  }

  // ★幅優先にして seed からの距離を持つ（＝閉包が何段 辿ったかを出力に出すため）
  const depth = new Map<string, number>();
  for (const s of seed) depth.set(s, 0);
  const queue = [...seed];
  while (queue.length) {
    const n = queue.shift()!;
    for (const p of rev.get(n) ?? []) {
      if (!depth.has(p)) { depth.set(p, depth.get(n)! + 1); queue.push(p); }
    }
  }

  const routes = [...depth.keys()].filter((r) => /app\/api\/.*\/route\.ts$/.test(r)).sort();
  const maxDepth = Math.max(0, ...routes.map((r) => depth.get(r)!));
  console.log(`閉包の全モジュール  : ${depth.size}`);
  console.log(`★到達する API route : ${routes.length}`);
  console.log(`★閉包が辿った最大段数: ${maxDepth}（1 以上でなければ ただの grep）\n`);

  // ★陽性対照 — 既知 YES を拾えなければ表を出さずに落とす
  const missing = KNOWN_REACHABLE.filter((k) => !routes.includes(k));
  if (missing.length > 0) {
    console.log(`★検査不成立: 既知 YES を閉包が拾えていない → ${missing.join(', ')}`);
    console.log('  走査か import 解決が壊れている。この回の件数は証拠にならない。');
    process.exit(2);
  }
  // ★「拾えた」だけでは、直接 import で拾えた可能性が残る。段数まで見る。
  if (maxDepth < MIN_MAX_DEPTH) {
    console.log(`★検査不成立: 閉包の最大段数が ${maxDepth}（期待 ${MIN_MAX_DEPTH} 以上）。`);
    console.log('  逆向き到達が効いていない＝#786 型の面（記号は lib/・性質は app/api/）を見逃す。');
    process.exit(2);
  }
  console.log(`★陽性対照 OK: 既知 YES ${KNOWN_REACHABLE.length} 件を検出`);
  for (const k of KNOWN_REACHABLE) console.log(`   距離 ${depth.get(k)}  ${k}`);
  console.log('');

  const unprotected: string[] = [];
  for (const r of routes) {
    const t = readFileSync(r, 'utf8');
    const rate = RATE.test(t);
    const auth = AUTH.test(t);
    if (!rate) unprotected.push(r);
    console.log(`  ${rate ? '✓ rate' : '✗ rate'}  ${auth ? 'auth' : '★auth 無し'}  ${r}`);
  }

  console.log(`\n★レート制限なし: ${unprotected.length} / ${routes.length}（BASELINE ${BASELINE_UNPROTECTED}）`);

  if (unprotected.length > BASELINE_UNPROTECTED) {
    console.log(`✗ ★増えた（+${unprotected.length - BASELINE_UNPROTECTED}）— 新しい課金面にレート制限が無い`);
    process.exit(1);
  }
  if (unprotected.length < BASELINE_UNPROTECTED) {
    console.log(`✓ ★減った。BASELINE_UNPROTECTED を ${unprotected.length} に下げること（下げないと次の増加を見逃す）`);
  } else {
    console.log('✓ BASELINE と同数');
  }
}

main();
