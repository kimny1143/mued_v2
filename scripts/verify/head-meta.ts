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
 * ★exit code: 0=全て期待どおり / 1=期待と違う / 2=★検査不成立 (取得失敗・<head> 無し)。
 *   ★「測れなかった」を「合格」と同じ 0 で返さない。0 件と 0 と成功を混ぜない。
 */

interface Target {
  url: string;
  canonical?: string; // 完全一致で期待する値。'@self' は URL 自身
  robots?: string; // content への部分一致で期待する語
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

function die(msg: string): never {
  console.error(`★検査不成立: ${msg}`);
  process.exit(2);
}

/** <head> だけを対象にする。本文に同じ文字列が在っても拾わないため */
export function headOf(html: string): string | null {
  const m = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  return m ? m[1] : null;
}

function attr(head: string, re: RegExp): string | null {
  const m = head.match(re);
  return m ? m[1] : null;
}

/**
 * ★ネットワークから切り離した本体。テストはここに当てる
 * （script の self-RED を手作業に残さないため。手で1回 通した RED は、
 *   検査が変わった日に誰も再実行しない）。
 * head が取れない場合は null を返す ＝「無い」でなく「測れていない」。
 */
export function readHeadMeta(html: string): { canonical: string | null; robots: string | null } | null {
  const head = headOf(html);
  if (head === null) return null;
  return {
    canonical:
      attr(head, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i)
      ?? attr(head, /<link[^>]+href="([^"]*)"[^>]+rel="canonical"/i),
    robots: attr(head, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i),
  };
}

/** 期待との突合。★戻り値が空配列 = 合格。文字列の配列 = 不合格の理由 */
export function evaluate(
  target: { url: string; canonical?: string; robots?: string },
  meta: { canonical: string | null; robots: string | null },
): string[] {
  const problems: string[] = [];
  const strip = (s: string) => s.replace(/\/$/, '');

  if (target.canonical !== undefined) {
    const want = strip(target.canonical === '@self' ? target.url : target.canonical);
    const got = meta.canonical === null ? null : strip(meta.canonical);
    if (got !== want) {
      problems.push(`canonical: 期待 ${want} / 実際 ${meta.canonical ?? '(無し)'}`);
      // ★いちばん危ない外し方を名指しする。「無い」ではなく「親を継いだ」がこの形
      if (meta.canonical && !meta.canonical.includes(new URL(target.url).pathname)) {
        problems.push(
          '  ★別 URL を指している = 親 layout の metadata を継承している疑い。'
          + ' Next.js は canonical を継承する ——★「外す」は「無くなる」ではない。',
        );
      }
    }
  }

  if (target.robots !== undefined && !(meta.robots ?? '').includes(target.robots)) {
    problems.push(`robots: 期待に "${target.robots}" を含む / 実際 ${meta.robots ?? '(無し)'}`);
  }

  return problems;
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
