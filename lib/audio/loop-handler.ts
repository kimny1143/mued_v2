/**
 * Loop Handler
 *
 * 小節境界ではなく拍位置で正規化
 * 拍跨ぎループでもクリックノイズを出さない
 */

interface Measure {
  bars: number;
  beats: number;
  meter: string; // e.g., "4/4", "3/4"
}

/**
 * ABC記法から小節情報を抽出
 */
export function parseAbcMeasures(abc: string): Measure[] {
  const measures: Measure[] = [];
  const lines = abc.split('\n');

  let currentMeter = '4/4'; // デフォルト
  let beatsPerMeasure = 4;

  for (const line of lines) {
    // メーター（拍子）の検出
    const meterMatch = line.match(/^M:\s*(\d+)\/(\d+)/);
    if (meterMatch) {
      currentMeter = `${meterMatch[1]}/${meterMatch[2]}`;
      beatsPerMeasure = parseInt(meterMatch[1], 10);
      continue;
    }

    // 音符行の検出（A-G, a-g, z（休符）を含む行）
    if (/^[A-Ga-gz]/.test(line) || /\|/.test(line)) {
      // 小節線で分割
      const bars = line.split('|').filter(bar => bar.trim().length > 0);

      for (let i = 0; i < bars.length; i++) {
        measures.push({
          bars: measures.length + 1,
          beats: beatsPerMeasure,
          meter: currentMeter,
        });
      }
    }
  }

  return measures;
}

/**
 * 小節番号から拍位置を計算
 * 拍境界に丸める（0.25拍単位）
 */
export function normalizeLoopRange(
  abc: string,
  startBar: number,
  endBar: number
): { startBeat: number; endBeat: number } {
  const measures = parseAbcMeasures(abc);

  if (measures.length === 0) {
    return { startBeat: 0, endBeat: 0 };
  }

  let startBeat = 0;
  let endBeat = 0;

  // 開始拍位置の計算
  for (let i = 0; i < Math.min(startBar - 1, measures.length); i++) {
    startBeat += measures[i].beats;
  }

  // 終了拍位置の計算
  for (let i = 0; i < Math.min(endBar, measures.length); i++) {
    endBeat += measures[i].beats;
  }

  // 拍境界に丸める（0.25拍単位 = 16分音符単位）
  startBeat = Math.floor(startBeat * 4) / 4;
  endBeat = Math.ceil(endBeat * 4) / 4;

  return { startBeat, endBeat };
}

/**
 * 拍位置から小節番号を逆算
 */
export function beatToMeasure(abc: string, beat: number): number {
  const measures = parseAbcMeasures(abc);

  let accumulatedBeats = 0;

  for (let i = 0; i < measures.length; i++) {
    accumulatedBeats += measures[i].beats;

    if (beat <= accumulatedBeats) {
      return i + 1; // 小節番号（1始まり）
    }
  }

  return measures.length;
}

/**
 * ループ範囲の検証
 */
export function validateLoopRange(
  abc: string,
  startBar: number,
  endBar: number
): { valid: boolean; error?: string } {
  const measures = parseAbcMeasures(abc);

  if (measures.length === 0) {
    return { valid: false, error: 'No measures found in ABC notation' };
  }

  if (startBar < 1 || startBar > measures.length) {
    return { valid: false, error: `Start bar ${startBar} out of range (1-${measures.length})` };
  }

  if (endBar < startBar || endBar > measures.length) {
    return { valid: false, error: `End bar ${endBar} out of range (${startBar}-${measures.length})` };
  }

  return { valid: true };
}

/**
 * ループ範囲の情報を取得
 */
export function getLoopInfo(abc: string, startBar: number, endBar: number) {
  const _measures = parseAbcMeasures(abc);
  const { startBeat, endBeat } = normalizeLoopRange(abc, startBar, endBar);

  const barCount = endBar - startBar + 1;
  const beatCount = endBeat - startBeat;

  return {
    startBar,
    endBar,
    startBeat,
    endBeat,
    barCount,
    beatCount,
    duration: `${barCount} bar${barCount > 1 ? 's' : ''}, ${beatCount.toFixed(1)} beats`,
  };
}
