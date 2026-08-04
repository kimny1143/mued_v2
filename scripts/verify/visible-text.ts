/**
 * URL の「可視テキスト」と「生 HTML」の出現数を併記する。
 *
 * ★なぜ要るか: Next.js の RSC payload が `<script>` の中に i18n の全文を積むので、
 * ★生 HTML への grep は常に偽陽性になる。2026-08-04 の実測では、特商法ページで
 * `masterchain` が「生 13 件 / 可視 0 件」だった。生だけ見ていれば「漏れている」と
 * 誤報していた。
 *
 * ★もう1つの罠: client 描画のページ（/dial/waitlist 等）は、生にも可視にも文字列が
 * 無い。★この時「旧文言が 0 件」を「消えた」と読むと嘘になる——実際は「検査が本文に
 * 届いていない」。だから本 script は ★可視テキストの総文字数を必ず出す。0 に近ければ
 * 抽出できていないので、その回の 0 件は何の証拠にもならない。
 *
 * 使い方:
 *   npx tsx scripts/verify/visible-text.ts <url> <term> [<term> ...]
 *   npx tsx scripts/verify/visible-text.ts <url> --expect <term> --absent <term>
 *
 *   --expect <term>  … 可視に 1 件以上 在ることを要求（無ければ exit 1）
 *   --absent <term>  … 可視に 0 件であることを要求（在れば exit 1）
 *                      ★--expect と併用すること。--absent だけだと「届いていない検査」も
 *                      通ってしまう（陽性対照が無い状態）。
 */

type Mode = 'report' | 'expect' | 'absent';

interface Term {
  text: string;
  mode: Mode;
}

function parseArgs(argv: string[]): { url: string; terms: Term[] } {
  const [url, ...rest] = argv;
  if (!url) {
    console.error('usage: visible-text.ts <url> [--expect <term>] [--absent <term>] [<term> ...]');
    process.exit(2);
  }
  const terms: Term[] = [];
  let pending: Mode = 'report';
  for (const a of rest) {
    if (a === '--expect') { pending = 'expect'; continue; }
    if (a === '--absent') { pending = 'absent'; continue; }
    terms.push({ text: a, mode: pending });
    pending = 'report';
  }
  return { url, terms };
}

/**
 * ブラウザが実際に見せるものに寄せる:
 *   1. <script> / <style> / <template> を落とす（RSC payload・CSS・非描画テンプレ）
 *   2. タグを剥がす
 *   3. HTML entity を戻す
 *   4. ★空白を1つに畳む —— white-space: normal の既定挙動。ソースの改行は表示の改行ではない
 *
 * ★注意: `white-space: pre-line` が付いた要素だけはソースの改行が表示される。
 * 本 script はそれを区別しないので、「改行が見えるか」の判定には使えない。
 * 用途は「その文字列が可視領域に在るか / 何件か」まで。
 */
function toVisible(html: string): string {
  let s = html;
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<template\b[\s\S]*?<\/template>/gi, '');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
  return s.replace(/\s+/g, ' ').trim();
}

function count(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}

async function main() {
  const { url, terms } = parseArgs(process.argv.slice(2));

  const res = await fetch(url, { redirect: 'follow' });
  const raw = await res.text();
  const visible = toVisible(raw);

  console.log(`url      : ${url}`);
  console.log(`http     : ${res.status}`);
  console.log(`raw      : ${raw.length} chars`);
  console.log(`visible  : ${visible.length} chars`);

  // 抽出が丸ごと失敗した場合だけを拾う。
  // ★これは「本文が client 描画かどうか」は検出できない —— 2026-08-04 の実測で
  //   /dial/waitlist は本文が JS chunk 側に在るのに可視 1641 文字（nav/footer 等）が
  //   残り、比率では区別が付かなかった。★そこを見張るのは下の --expect（陽性対照）。
  const ratio = raw.length > 0 ? visible.length / raw.length : 0;
  if (visible.length < 200) {
    console.log(
      `★WARNING: 可視テキストが ${visible.length} 文字しかない (${(ratio * 100).toFixed(1)}% of raw)。` +
      ` 抽出自体が失敗している疑い。★この回の「0 件」は何の証拠にもならない。`,
    );
  }

  console.log('');
  let failed = 0;
  for (const t of terms) {
    const r = count(raw, t.text);
    const v = count(visible, t.text);
    let verdict = '';
    if (t.mode === 'expect') {
      const ok = v >= 1;
      if (!ok) failed++;
      verdict = ok ? '  [expect: OK]' : '  ★[expect: FAIL — 可視に無い]';
    } else if (t.mode === 'absent') {
      const ok = v === 0;
      if (!ok) failed++;
      verdict = ok ? '  [absent: OK]' : '  ★[absent: FAIL — 可視に在る]';
    }
    console.log(`  raw ${String(r).padStart(4)} / ★可視 ${String(v).padStart(4)}  ${JSON.stringify(t.text)}${verdict}`);
  }

  const hasExpect = terms.some((t) => t.mode === 'expect');
  const hasAbsent = terms.some((t) => t.mode === 'absent');

  // ★陽性対照の無い --absent は検査として成立しない。warning でなく失敗にする。
  //   2026-08-04: /dial/waitlist で旧・新とも 0 件になり、「旧が消えた」と読みかけた。
  //   実際は本文が client 描画で、検査が届いていなかった。★区別できるのは、
  //   同じ手続きで「確実に在るもの」が 1 件以上 出るかどうかだけ。
  if (hasAbsent && !hasExpect) {
    console.log('');
    console.log('★検査不成立: --absent だけで --expect が無い。');
    console.log('  陽性対照が無いので「消えた」と「検査が届いていない」を区別できない。');
    console.log('  ★そのページに確実に在る文字列を --expect で1つ足すこと。');
    process.exit(1);
  }

  if (failed > 0) {
    console.log('');
    console.log(`✗ ${failed} 件が期待と違う`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
