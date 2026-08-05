/**
 * 描画された <head> の canonical / robots を測る。
 *
 * ★なぜ要るか (2026-08-05 の実回帰): #846 で `/dial/sessions` の
 * `alternates.canonical` を「消える予定の URL だから宣言しない」つもりで★外した。
 * ところが Next.js の metadata は★親 layout を継承するので、「無くなる」ではなく
 * `app/dial/layout.tsx` の `https://dial.mued.jp/` を★継いだ。本番に出るまで誰も
 * 気づいていない。
 *
 * ★source review では原理的に捕まらない。「子が上書きしないこと」を確かめても、
 * ★ツリー全体が何を出すかは別だからである。鎖の1つの環でなく、出力に当てる。
 *
 * ★取り違えやすい点: 「宣言しない」は省略では達成できない。継承が在る以上、
 * 省略は「別のものを宣言する」になる。
 *
 * 使い方:
 *   npx tsx scripts/verify/head-meta.ts <url> [<url> ...]            # 測って出すだけ
 *   npx tsx scripts/verify/head-meta.ts <url> --canonical-self       # canonical == その URL
 *   npx tsx scripts/verify/head-meta.ts <url> --canonical <expected>
 *   npx tsx scripts/verify/head-meta.ts <url> --robots <expected>    # 部分一致 (例 noindex)
 *
 * 期待値は URL ごとに直前の URL へ結び付く。複数 URL を並べれば一度に測れる。
 *
 * ★`--robots` は部分一致なので `--robots index` は `noindex` にも当たる。
 *   「index であること」の確認には使えない (product課 指摘 2026-08-05)。
 *   いまの用途は noindex の確認のみ。
 *
 * ★exit code: 0=全て期待どおり / 1=期待と違う / 2=★検査不成立 (取得失敗・<head> 無し)。
 *   ★「測れなかった」を「合格」と同じ 0 で返さない。0 件と 0 と成功を混ぜない。
 *
 * ★判定の本体は head-meta-lib.ts に在る (fetch も exit もしない)。
 *   この file は top-level で main() を呼ぶので、テストからは lib 側を import すること。
 */

import { readHeadMeta, evaluate, type Target } from './head-meta-lib';

function die(msg: string): never {
  console.error(`★検査不成立: ${msg}`);
  process.exit(2);
}

function parseArgs(argv: string[]): Target[] {
  const targets: Target[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--canonical-self') {
      if (!targets.length) die('--canonical-self の前に URL が要る');
      targets[targets.length - 1].canonical = '@self';
    } else if (a === '--canonical') {
      if (!targets.length) die('--canonical の前に URL が要る');
      targets[targets.length - 1].canonical = argv[++i];
    } else if (a === '--robots') {
      if (!targets.length) die('--robots の前に URL が要る');
      targets[targets.length - 1].robots = argv[++i];
    } else if (a.startsWith('-')) {
      die(`不明なオプション: ${a}`);
    } else {
      targets.push({ url: a });
    }
  }
  if (!targets.length) die('usage: head-meta.ts <url> [--canonical-self | --canonical <v>] [--robots <v>]');
  return targets;
}

async function main() {
  const targets = parseArgs(process.argv.slice(2));
  let failed = 0;

  for (const t of targets) {
    let res: Response;
    try {
      res = await fetch(t.url, { redirect: 'follow' });
    } catch (err) {
      console.log(`${t.url}\n  ★検査不成立: 取得できない (${String(err)})`);
      process.exit(2);
    }
    const html = await res.text();
    const meta = readHeadMeta(html);

    console.log(t.url);
    console.log(`  http      : ${res.status}${res.redirected ? `  (→ ${res.url})` : ''}`);

    // ★<head> が取れないなら、その回の canonical 判定は「無い」でなく「測れていない」。
    if (meta === null) {
      console.log('  ★検査不成立: <head> が取れない (client 描画 / 取得失敗の疑い)');
      process.exit(2);
    }
    console.log(`  canonical : ${meta.canonical ?? '(無し)'}`);
    console.log(`  robots    : ${meta.robots ?? '(無し)'}`);

    const problems = evaluate(t, meta);
    if (problems.length > 0) {
      failed++;
      for (const p of problems) console.log(`  ★[FAIL] ${p}`);
    } else if (t.canonical !== undefined || t.robots !== undefined) {
      console.log('  [OK]');
    }
    console.log('');
  }

  if (failed > 0) {
    console.log(`✗ ${failed} 件が期待と違う`);
    process.exit(1);
  }
  console.log(`✓ ${targets.length} URL すべて期待どおり`);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
