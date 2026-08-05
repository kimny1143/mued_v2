/**
 * MUEDsp 3面（muedsp / muedsat / muedlim）の本番確認 —— 通称「3本チェック」。
 *
 * ★これまで手打ちの curl で回しており、★陰性対照しか入っていなかった。
 * 陰性対照（フォームの無いページに当てて FAIL する）が言えるのは
 * 「消えたら検出できる」までで、★「今 出ているものが本物か」は言えない。
 *
 * ∴ 1回の実行に3種類の対照を入れる:
 *
 *   ★陽性対照 (positive) … その面の★本文固有の語。出なければ「検査が本文に届いていない」。
 *                           nav / footer の語ではダメ（本文が client 描画で欠けていても通る
 *                           ——product課 指摘 2026-08-04）。★これが計器の否定。
 *   ★主張   (assert)    … 実際に守りたいもの（DL フォームの CTA）。
 *   ★陰性対照 (negative) … 壊れた時にだけ出る署名（i18n の未解決キー・undefined 等）。
 *
 * ★3つを同じ回・同じ手続きで撃つのが要点。別々に回すと
 * 「陽性が通った時の系」と「主張を測った時の系」が同じである保証が無い。
 *
 * 使い方:
 *   npx tsx scripts/verify/muedsp-pages.ts              # 本番
 *   npx tsx scripts/verify/muedsp-pages.ts --base http://localhost:3000
 *
 * exit: 0=全通過 / 1=主張が不成立 / ★2=検査不成立（取得失敗・陽性対照が出ない）
 *       ★「測れなかった」を「合格」と同じ 0 で返さない。
 */

import { toVisible, count } from './html-text';

interface PageCheck {
  path: string;
  /** ★本文固有の語。nav/footer に無いものを選ぶこと */
  positive: string;
  /** 守りたいもの */
  assert: string[];
}

const PAGES: PageCheck[] = [
  {
    path: '/en/muedsp',
    positive: 'Finish the record.', // 本文の見出し
    assert: ['Try one stage, free'], // 旗艦への導線（この面に DL フォームは無い）
  },
  {
    path: '/en/muedsat',
    positive: 'Transformer color, taken straight out of the mastering chain',
    assert: ['Download MUEDsat'],
  },
  {
    path: '/en/muedlim',
    positive: 'The peak-limiting stage, taken out of MUEDsp',
    assert: ['Download MUEDlim'],
  },
];

/**
 * ★壊れた時にだけ可視領域へ出る署名。
 * 「無いこと」を測るので、単独では検査になっていない（陽性対照とセットで意味を持つ）。
 */
const NEGATIVE = ['undefined', 'NaN', '[object Object]', 'muedsp.', 'muedsat.', 'muedlim.'];

async function main() {
  const baseIdx = process.argv.indexOf('--base');
  const base = baseIdx !== -1 ? process.argv[baseIdx + 1] : 'https://mued.jp';

  let assertFailed = 0;
  let inconclusive = 0;

  for (const page of PAGES) {
    const url = `${base}${page.path}`;
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'follow' });
    } catch (err) {
      console.log(`${url}\n  ★検査不成立: 取得できない (${String(err)})\n`);
      inconclusive++;
      continue;
    }
    const raw = await res.text();
    const visible = toVisible(raw);

    console.log(url);
    console.log(`  http     : ${res.status}  visible: ${visible.length} chars`);

    // ★陽性対照が先。これが出ないなら、以下の判定はすべて無意味なので測らない。
    const pos = count(visible, page.positive);
    if (res.status !== 200 || pos < 1) {
      console.log(`  ★検査不成立: 陽性対照 ${JSON.stringify(page.positive)} が可視に ${pos} 件`);
      console.log('    ＝ 検査が本文に届いていない。この回の「主張 OK」も「異常なし」も証拠にならない。');
      console.log('');
      inconclusive++;
      continue;
    }
    console.log(`  ★陽性対照 : OK (${pos} 件) — 検査は本文に届いている`);

    for (const term of page.assert) {
      const n = count(visible, term);
      if (n < 1) {
        assertFailed++;
        console.log(`  ★[FAIL]  ${JSON.stringify(term)} が可視に無い`);
      } else {
        console.log(`  [OK]     ${JSON.stringify(term)} × ${n}`);
      }
    }

    for (const sig of NEGATIVE) {
      const n = count(visible, sig);
      if (n > 0) {
        assertFailed++;
        console.log(`  ★[FAIL]  陰性対照 ${JSON.stringify(sig)} が可視に ${n} 件 — 描画が壊れている署名`);
      }
    }
    console.log('');
  }

  if (inconclusive > 0) {
    console.log(`★検査不成立 ${inconclusive} 面 — 合否を出さずに終わる（0 で返さない）`);
    process.exit(2);
  }
  if (assertFailed > 0) {
    console.log(`✗ ${assertFailed} 件が期待と違う`);
    process.exit(1);
  }
  console.log(`✓ ${PAGES.length} 面すべて通過（★陽性・主張・陰性を同じ回で撃った）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
