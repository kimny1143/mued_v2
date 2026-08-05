/**
 * head-meta の純粋部分（fetch も process.exit もしない）。CLI とテストの両方が import する。
 *
 * ★なぜ分けるか（2026-08-05 に CI が教えてくれた）: CLI 側は top-level で main() を呼ぶので、
 * そこから import すると★引数なしで parseArgs が走り `process.exit(2)` する。
 * ★ローカルではテスト自体は 10 passed と出るのに runner のプロセスが落ち、CI が Test failure。
 * ★しかも当課はその時 `| grep` 越しに結果を見ていたので、終了コードが隠れていた。
 * ★同じ穴を visible-text.ts で直しておきながら、こちらに残していた。
 */

export interface Target {
  url: string;
  /** 完全一致で期待する値。'@self' は URL 自身 */
  canonical?: string;
  /** content への部分一致で期待する語 */
  robots?: string;
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
 * head が取れない場合は null を返す ＝★「無い」でなく「測れていない」。
 * 呼び出し側はこれを合格と区別すること。
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
  target: Target,
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

  // ★部分一致。`--robots index` は `noindex` にも当たるので、
  //   「index であること」を測る用途には使えない（product課 指摘 2026-08-05）。
  //   いまの用途は noindex の確認のみ。
  if (target.robots !== undefined && !(meta.robots ?? '').includes(target.robots)) {
    problems.push(`robots: 期待に "${target.robots}" を含む / 実際 ${meta.robots ?? '(無し)'}`);
  }

  return problems;
}
