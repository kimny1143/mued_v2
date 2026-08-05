/**
 * Unit — scripts/verify/head-meta.ts の self-RED。
 *
 * ★手で1回 通した RED は、検査が変わった日に誰も再実行しない。だから
 * 「この検査が実際に回帰を検出できるか」をテストに埋める。
 *
 * 固定するのは #846 の実回帰そのもの: `/dial/sessions` の canonical を
 * 「消える予定の URL だから宣言しない」つもりで外したら、Next.js が★親 layout の
 * `https://dial.mued.jp/` を継承し、本番に出るまで誰も気づかなかった。
 * ★source review では原理的に捕まらない (子が上書きしないことを確かめても、
 * ツリー全体が何を出すかは別) ので、出力に当てる検査が要る。
 */
import { describe, it, expect } from 'vitest';
import { headOf, readHeadMeta, evaluate } from '../../scripts/verify/head-meta-lib';

const page = (headInner: string) =>
  `<!doctype html><html><head>${headInner}</head><body><p>本文</p></body></html>`;

const SELF = '<link rel="canonical" href="https://mued.jp/dial/sessions"/>';
const INHERITED = '<link rel="canonical" href="https://dial.mued.jp/"/>'; // ★#846 の実際の出力
const NOINDEX = '<meta name="robots" content="noindex, follow"/>';

describe('head-meta — 抽出', () => {
  it('canonical と robots を <head> から取る', () => {
    const m = readHeadMeta(page(SELF + NOINDEX))!;
    expect(m.canonical).toBe('https://mued.jp/dial/sessions');
    expect(m.robots).toBe('noindex, follow');
  });

  it('★属性順が逆でも取る (href が先)', () => {
    const m = readHeadMeta(page('<link href="https://mued.jp/x" rel="canonical"/>'))!;
    expect(m.canonical).toBe('https://mued.jp/x');
  });

  it('★<body> の同名文字列は拾わない (head だけを見る)', () => {
    const html = '<html><head></head><body><link rel="canonical" href="https://evil.example/"/></body></html>';
    expect(readHeadMeta(html)!.canonical).toBeNull();
  });

  it('★<head> が無ければ null =「無い」でなく「測れていない」', () => {
    expect(headOf('<html><body>client 描画</body></html>')).toBeNull();
    expect(readHeadMeta('<html><body>client 描画</body></html>')).toBeNull();
  });
});

describe('head-meta — 突合 (★#846 の回帰を検出できること)', () => {
  const target = { url: 'https://mued.jp/dial/sessions', canonical: '@self' as const };

  it('★RED: 親を継承した canonical を不合格にする', () => {
    const problems = evaluate(target, readHeadMeta(page(INHERITED))!);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join('\n')).toContain('dial.mued.jp');
    // ★外し方まで名指しする (「無い」ではなく「継いだ」がこの形)
    expect(problems.join('\n')).toContain('継承');
  });

  it('★陽性対照: 正しい自 URL は合格にする (常に落ちる検査ではない)', () => {
    expect(evaluate(target, readHeadMeta(page(SELF))!)).toEqual([]);
  });

  it('canonical が無い場合も不合格 (省略 ≠ 合格)', () => {
    const problems = evaluate(target, readHeadMeta(page(NOINDEX))!);
    expect(problems.join('\n')).toContain('(無し)');
  });

  it('末尾スラッシュの有無では落とさない', () => {
    const m = readHeadMeta(page('<link rel="canonical" href="https://mued.jp/dial/sessions/"/>'))!;
    expect(evaluate(target, m)).toEqual([]);
  });

  it('robots は部分一致で見る / ★無ければ不合格', () => {
    const m = readHeadMeta(page(SELF + NOINDEX))!;
    expect(evaluate({ ...target, robots: 'noindex' }, m)).toEqual([]);
    const noRobots = readHeadMeta(page(SELF))!;
    expect(evaluate({ ...target, robots: 'noindex' }, noRobots).join('\n')).toContain('robots');
  });

  it('★期待を渡さなければ何も要求しない (報告だけのモード)', () => {
    expect(evaluate({ url: 'https://mued.jp/x' }, readHeadMeta(page(INHERITED))!)).toEqual([]);
  });
});
