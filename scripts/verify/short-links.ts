/**
 * 短リンク `/l/<slug>` の到達確認。
 *
 * ★この site では HTTP 200 が何も言わない。存在しない endpoint も 200 + HTML を返す
 * （`x-matched-path: /_not-found`）。∴ ★**200 を見てはいけない**。見るのは
 *   ① status が 3xx か  ② `Location` ヘッダが★表どおりの URL か  ③ その host が allowlist の中か。
 *
 * ★3種の対照を同じ回・同じ手続きで撃つ:
 *   ★陽性対照 (positive) … 表の実在 slug が 3xx + 正しい Location を返す。★これが計器の否定
 *                           （これが出ないなら、以下の 0 件は「無い」ではなく「届いていない」）。
 *   ★主張   (assert)    … 全行の Location が resolveShortLink() の出力と★完全一致する。
 *   ★陰性対照 (negative) … ★実在しない slug が 3xx を返さない。
 *                           これが無いと「全部 3xx を返す装置」を合格と読む。
 *
 * ★表が空なら 0 ではなく ★2 で落とす。空の表では「全行 一致」が vacuously true になり、
 *   ★「合格」と「まだ何も無い」が同じ出力になる。
 *
 * 使い方:
 *   npx tsx scripts/verify/short-links.ts                          # 本番 (https://mued.jp)
 *   npx tsx scripts/verify/short-links.ts --base http://localhost:3000
 *
 * exit: 0=全通過 / 1=主張が不成立 / ★2=検査不成立（表が空・取得失敗・陽性対照が出ない）
 */

import { SHORT_LINKS } from '../../lib/short-links/table';
import { ALLOWED_HOSTS, resolveShortLink } from '../../lib/short-links/resolve';

/** 実在しえない slug。★陰性対照。 */
const NEGATIVE_SLUG = 'zzz-nonexistent-control-20260829';

function baseFromArgv(): string {
  const i = process.argv.indexOf('--base');
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1].replace(/\/$/, '') : 'https://mued.jp';
}

interface Probe {
  status: number;
  location: string | null;
}

async function probe(url: string): Promise<Probe> {
  // ★redirect: 'manual' でないと fetch が自分で追ってしまい、★測りたい 3xx と Location が消える。
  const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'mued-verify/short-links' } });
  return { status: res.status, location: res.headers.get('location') };
}

async function main(): Promise<void> {
  const base = baseFromArgv();
  console.log(`短リンク到達確認 — base=${base}`);
  console.log(`表の行数 = ${SHORT_LINKS.length}`);
  // ★utm_content が空の行数を毎回 印字する。空は合法（19行は元リンクが最初から持っていない）だが、
  //   ★"失って空になった" と "最初から無い" は表からは区別できない。∴ 数が動いたら人が気づく形にする
  //   （conductor 起案 2026-08-29）。★増減の検出はテスト側の ratchet が担当し、ここは目視用。
  console.log(`  うち utm_content が空 = ${SHORT_LINKS.filter((r) => r.utmContent === '').length}`);

  // ★母集団 0 を先に落とす。以下の for-all は 0 行でも全部 通る。
  if (SHORT_LINKS.length === 0) {
    console.log('');
    console.log('★検査不成立: 短リンク表が空。');
    console.log('  空の表では「全行 一致」が vacuously true になるため、この実行は★何も測っていない。');
    console.log('  行が入るまで、この script の緑は合格の証拠にならない（∴ 0 でなく 2 を返す）。');
    process.exit(2);
  }

  let failures = 0;
  let positiveSeen = false;

  for (const row of SHORT_LINKS) {
    const url = `${base}/l/${row.slug}`;
    const expected = resolveShortLink(SHORT_LINKS, row.slug);
    let got: Probe;
    try {
      got = await probe(url);
    } catch (e) {
      console.log(`  ✗ ${row.slug}: 取得失敗 (${String(e)})`);
      console.log('★検査不成立: 取得できなかった行がある。');
      process.exit(2);
    }

    const is3xx = got.status >= 300 && got.status < 400;
    const hostOk =
      got.location !== null &&
      (() => {
        try {
          return (ALLOWED_HOSTS as readonly string[]).includes(new URL(got.location!).host);
        } catch {
          return false;
        }
      })();

    if (is3xx && got.location === expected && hostOk) {
      positiveSeen = true;
      console.log(`  ✓ ${row.slug} → ${got.status} ${got.location}`);
    } else {
      failures++;
      console.log(`  ✗ ${row.slug}`);
      console.log(`      status   = ${got.status}${is3xx ? '' : '  ★3xx でない（200 でも合格ではない）'}`);
      console.log(`      Location = ${got.location ?? '(無し)'}`);
      console.log(`      期待     = ${expected}`);
      if (got.location !== null && !hostOk) console.log('      ★Location の host が allowlist の外');
    }
  }

  // ★陰性対照 — これが 3xx を返すなら、上の全 ✓ は「常に 3xx を返す装置」を見ていたことになる。
  const negUrl = `${base}/l/${NEGATIVE_SLUG}`;
  let neg: Probe;
  try {
    neg = await probe(negUrl);
  } catch (e) {
    console.log(`★検査不成立: 陰性対照が取得できない (${String(e)})`);
    process.exit(2);
  }
  const negIs3xx = neg.status >= 300 && neg.status < 400;
  console.log('');
  console.log(`陰性対照 /l/${NEGATIVE_SLUG} → ${neg.status}${neg.location ? ` (Location: ${neg.location})` : ''}`);
  if (negIs3xx) {
    failures++;
    console.log('  ✗ ★実在しない slug が 3xx を返した ＝ 上の ✓ は弁別していない');
  } else {
    console.log('  ✓ 3xx を返さない（弁別している）');
  }

  if (!positiveSeen) {
    console.log('');
    console.log('★検査不成立: 陽性対照が1件も出ていない — 計器が届いていない可能性がある。');
    console.log('  ★この状態の「失敗 N 件」は、対象の異常とも経路の異常とも区別できない。');
    process.exit(2);
  }

  console.log('');
  if (failures > 0) {
    console.log(`★NG: ${failures} 件`);
    process.exit(1);
  }
  console.log(`✓ 全 ${SHORT_LINKS.length} 行 + 陰性対照 1 件 通過`);
}

main().catch((e) => {
  console.error('★検査不成立:', e);
  process.exit(2);
});
