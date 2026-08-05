/**
 * HTML → 可視テキスト。scripts/verify/*.ts が共有する。
 *
 * ★ここに切り出した理由: 検査スクリプト同士で実装を★複製しない。
 * 複製したコピーは、本体が変わった日に黙って古いまま緑を出し続ける。
 * （script が top-level で main() を呼ぶ形だと import しただけで走ってしまうので、
 *   entry-point ガードを足すより、共有部分を module にする方が素直。）
 */

/**
 * ブラウザが実際に見せるものに寄せる:
 *   1. <script> / <style> / <template> を落とす（RSC payload・CSS・非描画テンプレ）
 *   2. タグを剥がす
 *   3. HTML entity を戻す
 *   4. ★空白を1つに畳む —— white-space: normal の既定挙動。ソースの改行は表示の改行ではない
 *
 * ★注意: `white-space: pre-line` が付いた要素だけはソースの改行が表示される。
 * 本関数はそれを区別しないので、「改行が見えるか」の判定には使えない
 * （その用途は tests/unit/tokushoho-newline-render.test.ts 側で対応関係を測る）。
 */
export function toVisible(html: string): string {
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

/** 重なりを数えない出現数 */
export function count(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}
