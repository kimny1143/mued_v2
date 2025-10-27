# 音楽教材生成機能 - 技術仕様書

**バージョン:** 3.0
**最終更新:** 2025-10-27
**ステータス:** プロダクトMVP設計完了

---

## エグゼクティブサマリー

### 製品の本質

**「AIが教材を作る」ではなく「AIが学習を前に進める」**

MUED LMSは、AI生成技術を用いて**学習者の今日の1ミリを支援する**音楽教育プラットフォームです。
教材の美しさではなく、**学習効果の計測と改善**を中心に設計されています。

### プロダクトの3本柱

1. **学習価値の担保** - 生成物は教育的効果を数値で検証
2. **技術の堅牢性** - 印刷・再生・エクスポートの確実性
3. **使いやすさの徹底** - 3ボタン主義で認知負荷を最小化

---

## 1. 教育プロダクトとしての成立性

### 1.1 学習KPI（測定可能な学習効果）

教材の「正しさ」ではなく「学習者が進んだか」を測定します。

#### 計測指標（V1実装）

| KPI | 定義 | 計測方法 | 目標値 |
|-----|------|---------|--------|
| **達成率** | セクション完了の割合 | 完了フラグ（自動/手動） | > 70% |
| **反復指数** | 同一パートの繰り返し回数 | 再生回数カウント | 3-5回が理想 |
| **テンポ到達** | 指定BPMへの到達率 | 速度設定の履歴 | > 80% |
| **滞在箇所** | ループが多い小節（苦手検出） | ループ選択の頻度 | 上位3小節を特定 |

#### データベーススキーマ

```sql
-- 学習メトリクス（新規テーブル）
CREATE TABLE learning_metrics (
  id UUID PRIMARY KEY,
  material_id UUID REFERENCES ai_materials(id),
  user_id UUID REFERENCES users(id),
  section_id TEXT,           -- "warmup", "drill_1" など
  completed BOOLEAN DEFAULT FALSE,
  repetition_count INT DEFAULT 0,
  tempo_achieved INT,        -- 到達BPM
  loop_sections JSONB,       -- [{"bar": 5, "count": 12}, ...]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ai_materials テーブル拡張
ALTER TABLE ai_materials
  ADD COLUMN notation TEXT,              -- ABC記法コンテンツ
  ADD COLUMN metadata JSONB,             -- 拡張メタデータ
  ADD COLUMN quality JSONB,              -- 教材品質スコア（新規）
  ADD COLUMN format_version TEXT DEFAULT '3.0';
```

#### 品質スコア（quality列）

```json
{
  "learning_value_score": 8.2,
  "playability_score": 9.1,
  "range_ok": true,
  "leap_mean": 3.2,
  "chromatic_density": 0.15,
  "repetition_ratio": 0.4,
  "tempo_qpm": 120,
  "difficulty_delta": 1.2,
  "validation_passed": true,
  "review_status": "approved"
}
```

### 1.2 教材の「教育価値」審査

生成直後に**「構文OK」ではなく「学習価値スコア > 閾値」**を通過しないと公開しません。

#### analyzeAbc() 関数（新規実装）

```typescript
// lib/abc-analyzer.ts
interface AbcAnalysis {
  learning_value_score: number;  // 総合スコア (0-10)
  playability_score: number;     // 演奏可能性 (0-10)
  range_ok: boolean;             // 音域チェック
  leap_mean: number;             // 平均跳躍幅（半音単位）
  chromatic_density: number;     // 半音階移動の密度
  repetition_ratio: number;      // 反復パターンの割合
  tempo_qpm: number;             // テンポ（QPM）
  difficulty_delta: number;      // 前課題からの難易度差
}

export function analyzeAbc(
  abc: string,
  instrument: string,
  previousMaterial?: AbcAnalysis
): AbcAnalysis {
  const notes = parseAbcNotes(abc);

  // 音域チェック（楽器ごとの可奏域）
  const range = getInstrumentRange(instrument);
  const range_ok = notes.every(n => n >= range.min && n <= range.max);

  // 跳躍幅の計算
  const leaps = notes.slice(1).map((n, i) => Math.abs(n - notes[i]));
  const leap_mean = leaps.reduce((a, b) => a + b, 0) / leaps.length;

  // 半音階密度（クロマチック度）
  const chromatic_density = leaps.filter(l => l === 1).length / leaps.length;

  // 反復パターンの検出
  const repetition_ratio = detectRepetitionPatterns(notes);

  // テンポ抽出
  const tempo_qpm = extractTempo(abc) || 120;

  // 難易度差（前課題との比較）
  const difficulty_delta = previousMaterial
    ? calculateDifficultyDelta(
        { leap_mean, chromatic_density, tempo_qpm },
        previousMaterial
      )
    : 1.0;

  // 演奏可能性スコア（0-10）
  const playability_score = calculatePlayabilityScore({
    range_ok,
    leap_mean,
    chromatic_density,
    tempo_qpm,
  });

  // 学習価値スコア（0-10）
  const learning_value_score = calculateLearningValueScore({
    playability_score,
    repetition_ratio,
    difficulty_delta,
  });

  return {
    learning_value_score,
    playability_score,
    range_ok,
    leap_mean,
    chromatic_density,
    repetition_ratio,
    tempo_qpm,
    difficulty_delta,
  };
}

function calculatePlayabilityScore(params: {
  range_ok: boolean;
  leap_mean: number;
  chromatic_density: number;
  tempo_qpm: number;
}): number {
  let score = 10;

  if (!params.range_ok) score -= 5;              // 音域外は致命的
  if (params.leap_mean > 7) score -= 2;          // 跳躍が大きすぎる
  if (params.chromatic_density > 0.5) score -= 1.5; // 半音階が多すぎる
  if (params.tempo_qpm > 180) score -= 1;        // テンポが速すぎる

  return Math.max(0, score);
}

function calculateLearningValueScore(params: {
  playability_score: number;
  repetition_ratio: number;
  difficulty_delta: number;
}): number {
  let score = params.playability_score;

  // 反復が適度にある（記憶定着に有利）
  if (params.repetition_ratio >= 0.3 && params.repetition_ratio <= 0.6) {
    score += 1;
  }

  // 難易度が1段階上昇（学習曲線に沿っている）
  if (params.difficulty_delta >= 0.8 && params.difficulty_delta <= 1.5) {
    score += 1;
  } else if (params.difficulty_delta > 2.0) {
    score -= 2; // 難易度ジャンプが大きすぎる
  }

  return Math.min(10, Math.max(0, score));
}
```

### 1.3 品質ゲート（Quality Gate）

```typescript
// app/api/ai/materials/route.ts
export async function POST(req: NextRequest) {
  // ... AI生成処理 ...

  const abcBlocks = extractAbcBlocks(generatedContent);

  // 構文検証
  const syntaxErrors = abcBlocks
    .map(block => validateAbcSyntax(block.abc))
    .filter(err => err !== null);

  if (syntaxErrors.length > 0) {
    return NextResponse.json({
      success: false,
      error: 'ABC記法の構文エラー',
      details: syntaxErrors
    }, { status: 400 });
  }

  // 学習価値分析（新規）
  const analysis = analyzeAbc(
    abcBlocks[0].abc,
    body.instrument,
    previousMaterialAnalysis
  );

  // 品質ゲート判定
  const QUALITY_THRESHOLD = 6.0;
  const review_status = analysis.learning_value_score >= QUALITY_THRESHOLD
    ? 'approved'
    : 'draft'; // 閾値未満は下書き固定

  // データベースに保存
  const material = await db.aiMaterials.create({
    data: {
      // ... existing fields ...
      notation: JSON.stringify(abcBlocks),
      quality: {
        ...analysis,
        validation_passed: true,
        review_status,
      },
      metadata: {
        // ... existing metadata ...
        abcNotationBlocks: abcBlocks,
      },
    },
  });

  return NextResponse.json({
    success: true,
    materialId: material.id,
    quality: analysis,
    needsReview: review_status === 'draft',
  });
}
```

---

## 2. 技術的堅牢性

### 2.1 音まわり（競合回避と確実再生）

#### Web Audio の単一責任化

```typescript
// lib/audio/abc-player.ts
import abcjs from 'abcjs';

class AbcAudioPlayer {
  private synth: any = null;
  private isPlaying: boolean = false;
  private audioContext: AudioContext | null = null;

  async init(abc: string) {
    // Safari対策: オーディオコンテキストの解錠
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      const visualObj = abcjs.renderAbc('hidden-render', abc)[0];

      this.synth = new abcjs.synth.CreateSynth();
      await this.synth.init({
        audioContext: this.audioContext,
        visualObj: visualObj,
      });

      return { success: true };
    } catch (error) {
      console.error('Audio init failed:', error);
      return { success: false, error: error.message };
    }
  }

  async play() {
    if (!this.synth) {
      throw new Error('Audio not initialized');
    }

    try {
      await this.synth.prime();
      this.isPlaying = true;
      this.synth.start();
    } catch (error) {
      console.error('Playback failed:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  pause() {
    if (this.synth && this.isPlaying) {
      this.synth.pause();
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.synth) {
      this.synth.stop();
      this.isPlaying = false;
    }
  }
}

export const audioPlayer = new AbcAudioPlayer();
```

#### フォールバック戦略

```typescript
// components/features/abc-notation-block.tsx
const handlePlayMidi = async () => {
  try {
    await audioPlayer.init(abc);
    await audioPlayer.play();
  } catch (error) {
    // 再生失敗時は即座にMIDIダウンロードを提示
    console.error('Audio playback failed, offering MIDI download:', error);
    setShowFallbackDownload(true);
  }
};

{showFallbackDownload && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
    <p className="text-sm text-yellow-800 mb-2">
      ブラウザでの再生に失敗しました。MIDIファイルをダウンロードして外部プレイヤーで再生できます。
    </p>
    <button
      onClick={() => exportAbcToMidi(abc, title)}
      className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
    >
      📥 MIDIダウンロード
    </button>
  </div>
)}
```

### 2.2 譜面とPDF（印刷品質の担保）

#### サーバーサイドレンダリングによるPDF生成

```typescript
// app/api/export/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  const { materialId } = await req.json();

  // 教材データ取得
  const material = await db.aiMaterials.findUnique({
    where: { id: materialId },
  });

  if (!material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 });
  }

  // SSRで印刷用HTMLを生成
  const html = await renderMaterialToHtml(material);

  // Puppeteerでヘッドレスブラウザ起動
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // 印刷用CSSを適用してPDF生成
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm',
    },
  });

  await browser.close();

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${material.title}.pdf"`,
    },
  });
}

async function renderMaterialToHtml(material: AiMaterial): Promise<string> {
  const abcBlocks = JSON.parse(material.notation || '[]');

  // ABC記法をSVGにレンダリング
  const notationSvgs = abcBlocks.map((block: AbcBlock) =>
    abcjs.renderAbc('temp-container', block.abc, {
      responsive: 'resize',
      staffwidth: 600,
    })[0].svg
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 20mm 15mm;
        }
        body {
          font-family: 'Helvetica', 'Arial', sans-serif;
          line-height: 1.6;
        }
        .header {
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
        }
        .subtitle {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        .content {
          margin: 20px 0;
        }
        .notation-block {
          margin: 30px 0;
          page-break-inside: avoid;
        }
        .notation-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">${material.title}</div>
        <div class="subtitle">
          ${material.metadata?.instrument} | ${material.metadata?.difficulty} | ${material.metadata?.duration}分
        </div>
      </div>

      <div class="content">
        ${markdownToHtml(material.content)}
      </div>

      ${notationSvgs.map((svg: string, idx: number) => `
        <div class="notation-block">
          <div class="notation-title">${abcBlocks[idx].title}</div>
          ${svg}
        </div>
      `).join('')}

      <div class="footer">
        <p style="text-align: center; font-size: 10px; color: #999;">
          Generated with MUED LMS | ${new Date().toLocaleDateString()}
        </p>
      </div>
    </body>
    </html>
  `;
}
```

### 2.3 MusicXML エクスポート（非同期処理）

```typescript
// app/api/export/musicxml/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Queue } from 'bull';

const exportQueue = new Queue('musicxml-export', {
  redis: { host: 'localhost', port: 6379 },
});

export async function POST(req: NextRequest) {
  const { materialId } = await req.json();

  // キューに投入
  const job = await exportQueue.add({
    materialId,
    userId: req.userId,
    timestamp: Date.now(),
  });

  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: 'MusicXML変換を開始しました。完了時に通知します。',
  });
}

// Worker（別プロセス）
exportQueue.process(async (job) => {
  const { materialId } = job.data;

  const material = await db.aiMaterials.findUnique({
    where: { id: materialId },
  });

  const abcBlocks = JSON.parse(material.notation || '[]');

  // abc2xmlで変換
  const musicXmlFiles = await Promise.all(
    abcBlocks.map(async (block: AbcBlock) => {
      const tempAbcPath = `/tmp/${Date.now()}_${block.id}.abc`;
      const outputPath = `/tmp/${Date.now()}_${block.id}.xml`;

      await fs.promises.writeFile(tempAbcPath, block.abc);
      await execAsync(`abc2xml ${tempAbcPath} -o ${outputPath}`);

      return {
        title: block.title,
        path: outputPath,
      };
    })
  );

  // S3にアップロードして通知
  const urls = await uploadFilesToS3(musicXmlFiles);

  await notifyUserExportComplete(job.data.userId, {
    materialId,
    urls,
  });

  return { success: true, urls };
});
```

---

## 3. 市場整合性：使う人・使う瞬間

### 3.1 3つの主要ユースケース

#### ユースケース1: 先生の「5分前小テスト」自動化

**シナリオ:**
授業開始5分前、前回授業の生徒の苦手箇所から8小節の小テストを自動生成し、即印刷。

**実装:**

```typescript
// app/api/ai/quick-test/route.ts
export async function POST(req: NextRequest) {
  const { classId, previousLessonId } = await req.json();

  // クラスの苦手箇所を集計
  const weakPoints = await db.learningMetrics.findMany({
    where: {
      material_id: previousLessonId,
      user_id: { in: getClassStudents(classId) },
    },
    select: {
      loop_sections: true,
    },
  });

  // 最も多くの生徒が苦手とする小節を特定
  const commonWeakBars = analyzeCommonWeakPoints(weakPoints);

  // 同等の難易度で8小節の練習問題を生成
  const testPrompt = `
    以下の苦手箇所を踏まえて、8小節の練習問題を生成してください:
    - 頻出苦手小節: ${commonWeakBars.join(', ')}
    - 楽器: ${classInstrument}
    - レベル: ${classLevel}

    要件:
    - 同等の難易度とパターン
    - ABC記法で譜面付き
    - 1ページに収まる分量
  `;

  const material = await generateMaterial(testPrompt);

  // 即座にPDF生成
  const pdfUrl = await generatePdfInBackground(material.id);

  return NextResponse.json({
    success: true,
    materialId: material.id,
    pdfUrl,
    weakPoints: commonWeakBars,
  });
}
```

**UI:**

```tsx
// app/dashboard/teacher/quick-test/page.tsx
export default function QuickTestPage() {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await fetch('/api/ai/quick-test', {
      method: 'POST',
      body: JSON.stringify({ classId, previousLessonId }),
    }).then(r => r.json());

    // 即座にPDFダウンロード
    window.open(result.pdfUrl, '_blank');
    setGenerating(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🎯 授業前小テスト生成</h1>
      <p className="text-gray-600 mb-6">
        前回授業の苦手箇所から8小節の練習問題を自動生成します。
      </p>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full py-3 bg-green-600 text-white rounded hover:bg-green-700"
      >
        {generating ? '生成中...' : '📝 小テストを今すぐ作成'}
      </button>
    </div>
  );
}
```

#### ユースケース2: 個人の「苦手ドリル」1クリック

**シナリオ:**
練習中にループした小節から、同等・1段階上・1段階下の3パターンを自動生成。

```typescript
// app/api/ai/weak-drill/route.ts
export async function POST(req: NextRequest) {
  const { materialId, loopedBar } = await req.json();

  const material = await db.aiMaterials.findUnique({
    where: { id: materialId },
  });

  const abcBlocks = JSON.parse(material.notation || '[]');
  const targetBar = extractBar(abcBlocks[0].abc, loopedBar);

  // 同等・上・下の3パターンを生成
  const variations = await generateVariations(targetBar, {
    same: { difficulty: 0 },
    up: { difficulty: +1 },
    down: { difficulty: -1 },
  });

  return NextResponse.json({
    success: true,
    variations,
  });
}
```

#### ユースケース3: 講義ノート→教材化

**シナリオ:**
Markdownで書いた理論ノートに譜例ブロックを自動挿入して配布PDF生成。

---

### 3.2 導入フロー

#### 先生向け

1. **テンプレートから開始**: 学期シラバス雛形を選択
2. **クラス情報登録**: 楽器・レベル・生徒数
3. **自動小テスト**: 毎週の苦手箇所から自動生成
4. **KPIダッシュボード**: クラス全体の達成率・テンポ到達を可視化

#### 個人向け

1. **楽器・レベル選択**: 初回セットアップ
2. **「苦手から作る」ボタン**: 過去のループ履歴から自動生成
3. **3ボタンプレイヤー**: 再生・速度・ループのみ

---

## 4. UXの削り込み：3ボタン主義

### 4.1 プレイヤー画面

```tsx
// components/features/material-player.tsx
export function MaterialPlayer({ abc, title }: MaterialPlayerProps) {
  const [speed, setSpeed] = useState(1.0);
  const [loopRange, setLoopRange] = useState<[number, number] | null>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="material-player">
      {/* 楽譜表示 */}
      <div ref={notationRef} className="notation-display mb-4" />

      {/* 3ボタン主義 */}
      <div className="controls flex items-center gap-4">
        {/* 再生ボタン */}
        <button
          onClick={() => playing ? pause() : play()}
          className="w-16 h-16 bg-green-600 text-white rounded-full hover:bg-green-700 flex items-center justify-center text-2xl"
        >
          {playing ? '⏸' : '▶️'}
        </button>

        {/* 速度プリセット */}
        <div className="flex gap-2">
          {[-20, -10, 0, 10].map(offset => (
            <button
              key={offset}
              onClick={() => setSpeed(1 + offset / 100)}
              className={`px-3 py-2 rounded ${
                speed === 1 + offset / 100
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {offset === 0 ? '100%' : `${offset > 0 ? '+' : ''}${offset}%`}
            </button>
          ))}
        </div>

        {/* ループ選択 */}
        <button
          onClick={() => setLoopMode(!loopMode)}
          className={`px-4 py-2 rounded ${
            loopMode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          🔁 ループ
        </button>
      </div>

      {/* 出力は1つのメニューに格納 */}
      <div className="mt-4">
        <details className="border rounded p-2">
          <summary className="cursor-pointer font-medium text-gray-700">
            📤 エクスポート
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <button onClick={exportPdf} className="text-left px-3 py-2 hover:bg-gray-100 rounded">
              📄 PDF出力
            </button>
            <button onClick={exportMidi} className="text-left px-3 py-2 hover:bg-gray-100 rounded">
              🎹 MIDI出力
            </button>
            <button onClick={exportMusicXml} className="text-left px-3 py-2 hover:bg-gray-100 rounded">
              🎼 MusicXML出力
            </button>
          </div>
        </details>
      </div>

      {/* 進捗リング */}
      <div className="mt-6">
        <ProgressRing
          sections={material.metadata.sections}
          completed={completedSections}
        />
      </div>
    </div>
  );
}
```

### 4.2 生成画面

```tsx
// app/dashboard/materials/new/page.tsx（簡略版）
export default function NewMaterialPage() {
  const [includeNotation, setIncludeNotation] = useState(true); // デフォルトON

  return (
    <form onSubmit={handleSubmit}>
      {/* 既存のフォーム要素 */}

      {/* 生成後に学習価値スコアを表示 */}
      {generatedMaterial && (
        <div className="mt-6 border rounded-lg p-4">
          <h3 className="font-semibold mb-2">📊 教材品質スコア</h3>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-green-600">
              {generatedMaterial.quality.learning_value_score.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">
              / 10.0
            </div>
          </div>

          {generatedMaterial.quality.review_status === 'draft' ? (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ 学習価値スコアが基準値（6.0）を下回っています。
                公開前に内容を確認してください。
              </p>
              <div className="mt-2 flex gap-2">
                <button className="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                  再生成
                </button>
                <button className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700">
                  手動レビューして公開
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-800">
                ✅ 教材は学習価値基準を満たしています。
              </p>
              <button className="mt-2 text-sm px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                教材ライブラリに追加
              </button>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
```

---

## 5. 実装タスク（6週間プラン）

### Week 1: 音とPDFの土台

- [ ] `lib/audio/abc-player.ts` 実装（abcjs.synth 統一）
- [ ] Safari/Chrome での Web Audio Context 解錠処理
- [ ] 再生失敗時のフォールバック（MIDIダウンロード提示）
- [ ] `/api/export/pdf` 実装（Puppeteer + 印刷CSS）
- [ ] SSRによるHTML生成とフォント埋め込み確認

### Week 2: 分析とスコア

- [ ] `lib/abc-analyzer.ts` 実装
  - `analyzeAbc()` - 音域・跳躍・密度・反復の統計
  - `calculatePlayabilityScore()` - 演奏可能性スコア
  - `calculateLearningValueScore()` - 学習価値スコア
- [ ] `quality` 列をDBに追加
- [ ] 品質ゲート実装（スコア < 6.0 は下書き固定）

### Week 3: KPIログ

- [ ] `learning_metrics` テーブル作成
- [ ] 達成率・反復・テンポ到達・ループ小節の計測
- [ ] プレイヤーに計測コードを埋め込み
- [ ] 個人ダッシュボード（進捗リング）
- [ ] 先生向けクラス集計ビュー

### Week 4: 先生向け「5分前小テスト」

- [ ] `/api/ai/quick-test` エンドポイント実装
- [ ] 苦手箇所の集計ロジック
- [ ] 8小節練習問題の自動生成
- [ ] 即座にPDF出力
- [ ] UI: `app/dashboard/teacher/quick-test/page.tsx`

### Week 5: 個人の「苦手ドリル」

- [ ] `/api/ai/weak-drill` エンドポイント実装
- [ ] ループ選択からの等価パターン生成（同難度・+1・-1）
- [ ] UI: プレイヤー内に「苦手ドリル生成」ボタン追加

### Week 6: A/Bと品質ゲート

- [ ] 同一テーマの教材をA/B配信
- [ ] 達成率・テンポ到達で自動勝者選定
- [ ] Quality Gate 未通過教材の自動非表示
- [ ] アクセシビリティ監査（WCAG 2.1 AA準拠）
- [ ] E2Eテスト（Playwright）

---

## 6. 失敗しないガードレール

### AIモデル制御

```typescript
// lib/ai/prompt-templates.ts
const ABC_STRICT_TEMPLATE = `
以下の厳格なルールに従ってABC記法を生成してください:

必須ヘッダー:
X:1
T:{{title}}
M:{{meter}}
L:{{note_length}}
Q:{{tempo}}
K:{{key}}

音域制限: {{instrument_range}}
最大跳躍: {{max_leap}} 半音
テンポ範囲: {{tempo_min}}-{{tempo_max}} BPM
小節数: {{bar_count}}

逸脱した場合は自動で再生成されます。
`;

export function generateAbcPrompt(params: AbcGenerationParams): string {
  const instrumentRange = INSTRUMENT_RANGES[params.instrument];

  return ABC_STRICT_TEMPLATE
    .replace('{{title}}', params.title)
    .replace('{{meter}}', params.meter)
    .replace('{{note_length}}', params.noteLength)
    .replace('{{tempo}}', params.tempo.toString())
    .replace('{{key}}', params.key)
    .replace('{{instrument_range}}', instrumentRange)
    .replace('{{max_leap}}', params.maxLeap.toString())
    .replace('{{tempo_min}}', params.tempoMin.toString())
    .replace('{{tempo_max}}', params.tempoMax.toString())
    .replace('{{bar_count}}', params.barCount.toString());
}
```

### コスト上限（パラメトリック変形）

```typescript
// lib/ai/parametric-transform.ts
/**
 * 学習ループでは再生成せず、既存教材をパラメータ変形
 */
export function transformAbc(
  abc: string,
  transformation: 'transpose' | 'rhythmVariation' | 'startNote'
): string {
  const parsed = parseAbc(abc);

  switch (transformation) {
    case 'transpose':
      // 調を±2まで移調
      return transposeAbc(parsed, randomInt(-2, 2));

    case 'rhythmVariation':
      // リズムパターンを同等難易度で置換
      return replaceRhythmPattern(parsed);

    case 'startNote':
      // 開始音を変更（音域内でランダム）
      return changeStartNote(parsed);
  }
}
```

### 耐障害（OpenAI ダウン時）

```typescript
// app/api/ai/materials/route.ts
export async function POST(req: NextRequest) {
  try {
    // OpenAI API呼び出し
    const response = await openai.chat.completions.create({
      // ...
    });

    return await processMaterial(response);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.status === 503) {
      // OpenAI ダウン時はテンプレート＋変形でローカル生成
      console.warn('OpenAI unavailable, falling back to template generation');

      const templateMaterial = selectTemplate(req.body.materialType);
      const transformed = transformAbc(templateMaterial.abc, 'transpose');

      return NextResponse.json({
        success: true,
        materialId: await saveMaterial(transformed),
        fallbackMode: true,
        message: 'AI一時停止中のため、テンプレートから生成しました',
      });
    }

    throw error;
  }
}
```

---

## 7. 成功指標

### プロダクト品質基準

| 指標 | 目標値 | 計測方法 |
|-----|--------|---------|
| 楽譜の正確性 | ABC構文エラー率 < 5% | バリデーション通過率 |
| 学習価値 | 平均スコア > 7.0 | analyzeAbc() の平均 |
| 生成速度 | < 30秒（楽譜含む） | APIレスポンスタイム |
| エクスポート品質 | PDF/MIDI出力成功率 > 95% | エクスポートログ |
| ユーザー満足度 | 楽譜付き教材の評価 > 4.0/5.0 | アプリ内レビュー |

### ビジネス指標

| 指標 | 目標値 | 計測方法 |
|-----|--------|---------|
| 教材生成数 | 月間100件以上 | DB集計 |
| エクスポート利用率 | 生成教材の30%以上 | エクスポート実行率 |
| リピート率 | 60%が2週間以内に再利用 | ユーザー行動ログ |
| 達成率 | クラス平均 > 70% | learning_metrics 集計 |
| テンポ到達率 | > 80% | 速度設定履歴 |

### 教育効果指標（最重要）

| 指標 | 目標値 | 計測方法 |
|-----|--------|---------|
| 苦手箇所の改善 | 反復後の達成率 +20%以上 | 前後比較 |
| 継続学習日数 | 平均14日以上/月 | ログイン履歴 |
| 先生の準備時間削減 | 50%削減（小テスト生成） | アンケート |

---

## 8. 将来拡張（フェーズ2以降）

### フェーズ2: インタラクティブ機能（3ヶ月後）

- [ ] リアルタイムMIDI入力対応（演奏の記録）
- [ ] 楽譜アノテーション機能（指使い・注釈追加）
- [ ] 練習トラッキング（セッション記録・統計）
- [ ] 協調編集（複数ユーザーで楽譜共有）

### フェーズ3: 高度なAI機能（6ヶ月後）

- [ ] 演奏音声の自動採譜（Audio → ABC）
- [ ] AIによる演奏フィードバック（音程・リズム分析）
- [ ] パーソナライズされた練習プラン生成
- [ ] 耳トレーニングアプリ（Web Audio API）

---

## まとめ

### フェーズ1（V3.0）の本質

**「AIが教材を作る」ではなく「AIが学習を前に進める」**

1. **学習効果を測る** - 達成率・反復・テンポ到達・苦手検出
2. **教材の価値を保証する** - 学習価値スコア・品質ゲート
3. **確実に動く** - 音再生の堅牢性・印刷品質の担保
4. **使いやすさの徹底** - 3ボタン主義・認知負荷の最小化
5. **実務に刺さる** - 先生の5分前小テスト・個人の苦手ドリル

### 技術的ハイライト

- **ABC記法 + 学習価値分析** で教育的責任を担保
- **abcjs + Puppeteer** で確実な楽譜表示・PDF生成
- **学習メトリクス** で継続的改善サイクル
- **3ボタンプレイヤー** で学習体験に集中

### 次回レビュー

**Week 3終了時**（KPIログ実装完了後）
- 学習メトリクスの計測精度確認
- 先生・個人ユーザーの初期フィードバック収集
- 品質ゲートの閾値調整

---

## 9. 運用で揉めるポイントと対策（実装前の赤入れ）

### 9.1 学習KPIの妥当性担保

#### 楽器別の到達係数

同じBPM到達でも楽器ごとの負荷が異なります。

```typescript
// lib/metrics/instrument-coefficients.ts
const INSTRUMENT_DIFFICULTY_COEFFICIENTS = {
  // 鍵盤楽器（視覚フィードバック強、物理的負荷中）
  piano: { tempo_coefficient: 1.0, leap_coefficient: 1.0 },
  keyboard: { tempo_coefficient: 1.0, leap_coefficient: 1.0 },

  // 弦楽器（運指複雑、ポジション移動負荷高）
  guitar: { tempo_coefficient: 1.2, leap_coefficient: 1.3 },
  bass: { tempo_coefficient: 1.1, leap_coefficient: 1.2 },
  violin: { tempo_coefficient: 1.3, leap_coefficient: 1.4 },

  // 管楽器（呼吸管理、音程制御高負荷）
  trumpet: { tempo_coefficient: 1.4, leap_coefficient: 1.5 },
  saxophone: { tempo_coefficient: 1.3, leap_coefficient: 1.4 },
  flute: { tempo_coefficient: 1.2, leap_coefficient: 1.3 },

  // 打楽器（リズム精度特化）
  drums: { tempo_coefficient: 1.5, leap_coefficient: 0.5 },
};

export function calculateAdjustedTempo(
  achievedTempo: number,
  targetTempo: number,
  instrument: string
): number {
  const coefficient = INSTRUMENT_DIFFICULTY_COEFFICIENTS[instrument]?.tempo_coefficient || 1.0;

  // 係数適用後の到達率
  const adjustedRate = (achievedTempo / targetTempo) * coefficient;

  return Math.min(100, adjustedRate * 100);
}
```

#### 将来拡張用のフィールド確保

```sql
-- learning_metrics テーブルに拡張フィールドを追加
ALTER TABLE learning_metrics
  ADD COLUMN rhythm_entropy FLOAT,           -- リズムの規則性（低いほど規則的）
  ADD COLUMN downbeat_landing_rate FLOAT,    -- 拍頭への着地率（0-1）
  ADD COLUMN fingering_hint_present BOOLEAN, -- 運指ヒントの有無
  ADD COLUMN articulation_quality FLOAT;     -- アーティキュレーション品質（将来）
```

### 9.2 品質ゲートの動的調整

固定閾値（6.0）は暫定値。コホート差で最適値がズレるため、週次で自動調整。

```typescript
// lib/quality/adaptive-threshold.ts
interface ThresholdHistory {
  week: string;
  threshold: number;
  pass_rate: number;
  avg_score: number;
  user_satisfaction: number;
}

export async function updateQualityThreshold(): Promise<number> {
  // 過去4週間のデータを取得
  const history = await db.query(`
    SELECT
      DATE_TRUNC('week', created_at) as week,
      AVG(quality->>'learning_value_score') as avg_score,
      COUNT(CASE WHEN quality->>'review_status' = 'approved' THEN 1 END) / COUNT(*)::float as pass_rate,
      AVG(user_ratings.score) as user_satisfaction
    FROM ai_materials
    LEFT JOIN user_ratings ON ai_materials.id = user_ratings.material_id
    WHERE created_at > NOW() - INTERVAL '4 weeks'
    GROUP BY week
    ORDER BY week DESC
  `);

  // ユーザー満足度が4.0以上を維持する閾値を探索
  const TARGET_SATISFACTION = 4.0;
  const currentSatisfaction = history[0].user_satisfaction;

  let newThreshold = 6.0; // 初期値

  if (currentSatisfaction < TARGET_SATISFACTION) {
    // 満足度低下 → 閾値を上げて品質重視
    newThreshold = Math.min(8.0, history[0].threshold + 0.5);
  } else if (currentSatisfaction > TARGET_SATISFACTION + 0.5) {
    // 満足度高すぎる → 閾値を下げて生成量増加
    newThreshold = Math.max(5.0, history[0].threshold - 0.3);
  }

  // 設定を更新
  await db.settings.upsert({
    where: { key: 'quality_threshold' },
    update: { value: newThreshold, updated_at: new Date() },
  });

  return newThreshold;
}

// 週次で実行（cron job）
// 0 0 * * 0 node scripts/update-quality-threshold.js
```

### 9.3 PDF生成の可搬性と即時性

#### フォント埋め込みの確実化

```typescript
// lib/export/pdf-fonts.ts
const NOTATION_FONTS = `
  @font-face {
    font-family: 'Bravura';
    src: url('data:font/woff2;base64,${BRAVURA_BASE64}') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'Academico';
    src: url('data:font/woff2;base64,${ACADEMICO_BASE64}') format('woff2');
    font-weight: normal;
    font-style: normal;
  }
`;

// Puppeteer PDF生成時にインライン埋め込み
const pdfStyles = `
  <style>
    ${NOTATION_FONTS}

    body {
      font-family: 'Academico', 'Helvetica', 'Arial', sans-serif;
    }

    .notation {
      font-family: 'Bravura', serif;
    }

    /* OS依存フォールバック禁止 */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>
`;
```

#### 即時性優先の分岐（先生の小テスト用）

```typescript
// app/api/ai/quick-test/route.ts
export async function POST(req: NextRequest) {
  const { classId, previousLessonId } = await req.json();

  // 教材生成
  const material = await generateMaterial(/* ... */);

  // 即座にHTMLプレビューを返す（1秒以内）
  const previewHtml = await renderMaterialToHtml(material);

  // PDF生成は非同期でキュー投入（10-30秒かかる）
  const pdfJob = await pdfQueue.add({
    materialId: material.id,
    userId: req.userId,
  });

  return NextResponse.json({
    success: true,
    materialId: material.id,
    previewHtml,  // 即座に表示可能
    pdfJobId: pdfJob.id,
    message: 'プレビューを表示中。PDF生成は裏で進行します。',
  });
}

// フロントエンド: ポーリングでPDF完成を確認
useEffect(() => {
  if (pdfJobId) {
    const interval = setInterval(async () => {
      const status = await fetch(`/api/export/pdf/status/${pdfJobId}`);
      const { completed, url } = await status.json();

      if (completed) {
        setPdfUrl(url);
        clearInterval(interval);
        showNotification('PDFが完成しました。ダウンロード可能です。');
      }
    }, 2000);

    return () => clearInterval(interval);
  }
}, [pdfJobId]);
```

### 9.4 MusicXML変換の簡易化フラグ

```typescript
// app/api/export/musicxml/route.ts
exportQueue.process(async (job) => {
  const { materialId } = job.data;
  const material = await db.aiMaterials.findUnique({ where: { id: materialId } });
  const abcBlocks = JSON.parse(material.notation || '[]');

  const musicXmlFiles = await Promise.all(
    abcBlocks.map(async (block: AbcBlock) => {
      const result = await convertAbcToMusicXml(block.abc);

      // abc2xml が落とす要素を検出
      const hasOrnaments = block.abc.includes('~') || block.abc.includes('T');
      const hasFingeringHints = /\[\d+\]/.test(block.abc);

      const reduction = hasOrnaments || hasFingeringHints;

      return {
        title: block.title,
        path: result.outputPath,
        reduction,  // 簡易化フラグ
        droppedElements: reduction ? ['ornaments', 'fingering'] : [],
      };
    })
  );

  return { success: true, files: musicXmlFiles };
});

// UI: ダウンロード時に警告表示
{musicXmlFiles.some(f => f.reduction) && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
    <p className="text-sm text-yellow-800">
      ⚠️ このMusicXMLは一部の装飾音符や運指注記が省略されています。
      完全な譜面が必要な場合はPDF出力をご利用ください。
    </p>
  </div>
)}
```

### 9.5 コスト暴れ対策

#### ユーザー単位のレート制限

```typescript
// app/api/ai/materials/route.ts
const DAILY_GENERATION_LIMIT = {
  free: 3,
  pro: 20,
  teacher: 50,
};

export async function POST(req: NextRequest) {
  const userId = req.userId;
  const userTier = await getUserTier(userId);

  // 当日の生成回数をチェック
  const todayCount = await db.aiMaterials.count({
    where: {
      creator_id: userId,
      created_at: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  const limit = DAILY_GENERATION_LIMIT[userTier];

  if (todayCount >= limit) {
    return NextResponse.json({
      success: false,
      error: `日次生成上限（${limit}件）に達しました。明日再度お試しください。`,
      upgradeRequired: userTier === 'free',
    }, { status: 429 });
  }

  // 同一ユーザー・同一ループ箇所の再生成制限
  const { materialId, loopedBar } = req.body;

  if (materialId && loopedBar) {
    const recentRegenerations = await db.aiMaterials.count({
      where: {
        creator_id: userId,
        metadata: {
          path: ['sourceLoopBar'],
          equals: loopedBar,
        },
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 過去24時間
        },
      },
    });

    if (recentRegenerations >= 3) {
      return NextResponse.json({
        success: false,
        error: 'この箇所の再生成は1日3回までです。既存のバリエーションをご利用ください。',
      }, { status: 429 });
    }
  }

  // ... 通常の生成処理 ...
}
```

### 9.6 Safari対応の完全版

```typescript
// lib/audio/abc-player.ts
class AbcAudioPlayer {
  private audioContext: AudioContext | null = null;
  private resumeOnVisibilityChange = true;

  async init(abc: string) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // 初回解錠
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // タブ復帰時の自動resume（モバイルSafari対策）
    if (this.resumeOnVisibilityChange) {
      document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && this.audioContext?.state === 'suspended') {
          try {
            await this.audioContext.resume();
            console.log('Audio context resumed on tab focus');
          } catch (error) {
            console.error('Failed to resume audio context:', error);
          }
        }
      });
      this.resumeOnVisibilityChange = false; // 一度だけ設定
    }

    // ... rest of init ...
  }
}
```

### 9.7 ループ選択の精度向上

```typescript
// lib/audio/loop-handler.ts
/**
 * 小節境界ではなく拍位置で正規化
 * 拍跨ぎループでもクリックノイズを出さない
 */
export function normalizeLoopRange(
  abc: string,
  startBar: number,
  endBar: number
): { startBeat: number; endBeat: number } {
  const measures = parseAbcMeasures(abc);

  let startBeat = 0;
  let endBeat = 0;

  for (let i = 0; i < measures.length; i++) {
    if (i < startBar - 1) {
      startBeat += measures[i].beats;
    }
    if (i < endBar) {
      endBeat += measures[i].beats;
    }
  }

  // 拍境界に丸める（0.25拍単位）
  startBeat = Math.floor(startBeat * 4) / 4;
  endBeat = Math.ceil(endBeat * 4) / 4;

  return { startBeat, endBeat };
}

// abcjs.synth.CreateSynth に拍位置で指定
synth.setLoop(startBeat, endBeat, true);
```

### 9.8 品質スコアの分離

```typescript
// app/api/ai/materials/route.ts
const quality = {
  syntax_passed: syntaxErrors.length === 0,  // 構文OK
  pedagogy_passed: analysis.learning_value_score >= QUALITY_THRESHOLD,  // 学習価値OK
  learning_value_score: analysis.learning_value_score,
  playability_score: analysis.playability_score,
  // ... その他のスコア
  validation_passed: syntaxErrors.length === 0 && analysis.learning_value_score >= QUALITY_THRESHOLD,
  review_status: analysis.learning_value_score >= QUALITY_THRESHOLD ? 'approved' : 'draft',
};

// 運用での分析が容易に
const materialsByQuality = await db.aiMaterials.groupBy({
  by: ['quality.syntax_passed', 'quality.pedagogy_passed'],
  _count: true,
});

// 結果例:
// { syntax_passed: true, pedagogy_passed: false, _count: 42 }  // 構文OKだが学習価値不足
// { syntax_passed: false, pedagogy_passed: true, _count: 3 }   // 構文エラーだが内容は良い
```

### 9.9 PDF改ページ制御

```typescript
// lib/export/pdf-generator.ts
const pdfStyles = `
  <style>
    /* 各譜面ブロックの改ページ途中切れを防止 */
    .notation-block {
      margin: 30px 0;
      page-break-inside: avoid !important;
      -webkit-column-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* セクション全体も改ページ途中切れを防止 */
    .section {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    /* 長い譜面の場合は改ページを許可 */
    .notation-block.long {
      page-break-inside: auto;
    }
  </style>
`;

// 譜面の長さに応じてクラスを動的付与
const notationHtml = abcBlocks.map((block, idx) => {
  const isLong = block.abc.split('\n').length > 20; // 20行以上

  return `
    <div class="notation-block ${isLong ? 'long' : ''}">
      <div class="notation-title">${block.title}</div>
      ${renderAbcToSvg(block.abc)}
    </div>
  `;
});
```

---

## 10. MVP出荷前の最小テスト

### 10.1 ブラウザ互換性テスト

```typescript
// tests/e2e/browser-compatibility.spec.ts
const BROWSERS = ['chromium', 'webkit', 'firefox'];
const DEVICES = ['Desktop', 'iPhone 13', 'iPad Pro'];

describe('Browser Compatibility', () => {
  for (const browserType of BROWSERS) {
    for (const device of DEVICES) {
      test(`${browserType} - ${device}: 再生・ループ・速度変更・PDF`, async ({ page }) => {
        await page.goto('/dashboard/materials/test-material-id');

        // 10回繰り返し
        for (let i = 0; i < 10; i++) {
          // 再生
          await page.click('button[aria-label="再生"]');
          await page.waitForTimeout(2000);

          // ループ設定
          await page.click('button[aria-label="ループ"]');
          await page.dragAndDrop('.measure-1', '.measure-4');

          // 速度変更
          await page.click('button:has-text("-10%")');
          await page.waitForTimeout(1000);

          // PDF出力
          await page.click('button:has-text("PDF出力")');
          await page.waitForSelector('text=PDFが完成しました', { timeout: 30000 });

          // 失敗率を記録
          const errors = await page.evaluate(() => window.errors || []);
          expect(errors).toHaveLength(0);
        }
      });
    }
  }
});
```

### 10.2 印刷実機テスト

```markdown
# 印刷品質チェックリスト

## テスト環境
- プリンタ1: Canon PIXUS TS8530
- プリンタ2: Brother MFC-J6999CDW
- プリンタ3: HP LaserJet Pro M404dn

## 確認項目
- [ ] 譜面の五線がにじまずクリアに印刷される
- [ ] 運指数字（1, 2, 3, 4, 5）が潰れずに読める
- [ ] 休符記号が判別可能
- [ ] テンポ記号（BPM表記）が読める
- [ ] ページ境界で譜面が途中で切れない
- [ ] A4用紙の余白が適切（20mm）

## 合格基準
- 3機種すべてで上記6項目が満たされること
- 10枚連続印刷してもクオリティが劣化しないこと
```

### 10.3 教育効果の事前検証

```typescript
// scripts/ab-test-setup.ts
/**
 * 同一テーマの教材A/Bを20名に配信
 * 達成率・テンポ到達の差分を計測
 */
async function setupAbTest(themeId: string, participantIds: string[]) {
  // A版: 反復多め（repetition_ratio: 0.5）
  const materialA = await generateMaterial({
    theme: themeId,
    repetition_ratio: 0.5,
    variation: 'A',
  });

  // B版: 反復少なめ（repetition_ratio: 0.3）
  const materialB = await generateMaterial({
    theme: themeId,
    repetition_ratio: 0.3,
    variation: 'B',
  });

  // ランダムに10名ずつ割り当て
  const groupA = participantIds.slice(0, 10);
  const groupB = participantIds.slice(10, 20);

  await db.abTestAssignments.createMany({
    data: [
      ...groupA.map(userId => ({ userId, materialId: materialA.id, group: 'A' })),
      ...groupB.map(userId => ({ userId, materialId: materialB.id, group: 'B' })),
    ],
  });

  // 2週間後に結果を集計
  setTimeout(async () => {
    const results = await analyzeAbTestResults(themeId);
    console.log('A/Bテスト結果:', results);

    // 学内IRレポート生成
    await generateIRReport(themeId, results);
  }, 14 * 24 * 60 * 60 * 1000);
}

async function analyzeAbTestResults(themeId: string) {
  const metrics = await db.query(`
    SELECT
      ab.group,
      AVG(lm.completed::int) as avg_completion_rate,
      AVG(lm.tempo_achieved::float / lm.tempo_target::float) as avg_tempo_achievement,
      AVG(lm.repetition_count) as avg_repetition
    FROM ab_test_assignments ab
    JOIN learning_metrics lm ON ab.user_id = lm.user_id
    WHERE ab.theme_id = $1
    GROUP BY ab.group
  `, [themeId]);

  return {
    groupA: metrics.find(m => m.group === 'A'),
    groupB: metrics.find(m => m.group === 'B'),
    winner: metrics[0].avg_completion_rate > metrics[1].avg_completion_rate ? 'A' : 'B',
  };
}
```

---

## 11. ビジネス指標のダッシュボード

### 11.1 先生向け：時間短縮の見える化

```tsx
// app/dashboard/teacher/analytics/page.tsx
export default function TeacherAnalyticsPage() {
  const [stats, setStats] = useState<TeacherStats | null>(null);

  useEffect(() => {
    fetchTeacherStats().then(setStats);
  }, []);

  if (!stats) return <Loading />;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">📊 授業準備の時短効果</h1>

      {/* メインKPI: 時間短縮率 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-2">従来の準備時間</div>
          <div className="text-4xl font-bold text-gray-900">{stats.traditional_prep_time}分</div>
          <div className="text-xs text-gray-500 mt-1">小テスト1回あたり</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-2">MUED使用時</div>
          <div className="text-4xl font-bold text-green-600">{stats.mued_prep_time}分</div>
          <div className="text-xs text-gray-500 mt-1">5分前生成</div>
        </Card>

        <Card className="p-6 bg-green-50 border-green-200">
          <div className="text-sm text-green-800 mb-2">短縮率</div>
          <div className="text-4xl font-bold text-green-700">{stats.time_saved_percentage}%</div>
          <div className="text-xs text-green-600 mt-1">月間 {stats.total_hours_saved}時間削減</div>
        </Card>
      </div>

      {/* 累積グラフ */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">📈 累積時短効果（今学期）</h2>
        <LineChart
          data={stats.cumulative_time_saved}
          xAxis="week"
          yAxis="hours_saved"
          target={50} // 学期目標: 50時間短縮
        />
      </Card>
    </div>
  );
}
```

### 11.2 個人向け：成果の見える化

```tsx
// app/dashboard/materials/[id]/progress/page.tsx
export default function MaterialProgressPage({ params }: { params: { id: string } }) {
  const { material, metrics } = useMaterialProgress(params.id);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">🎯 学習の記録</h1>

      {/* 進捗リング */}
      <div className="flex justify-center mb-8">
        <ProgressRing
          sections={material.metadata.sections}
          completed={metrics.completed_sections}
          size={200}
        />
      </div>

      {/* テンポ到達のヒストリー */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">⏱️ テンポ到達の推移</h2>
        <LineChart
          data={metrics.tempo_history}
          xAxis="date"
          yAxis="achieved_bpm"
          target={material.metadata.target_tempo}
        />

        {metrics.tempo_achieved >= material.metadata.target_tempo && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded p-4">
            <p className="text-green-800 font-medium">
              🎉 目標テンポ {material.metadata.target_tempo} BPMに到達しました！
            </p>
          </div>
        )}
      </Card>

      {/* 苦手箇所の改善 */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">📊 苦手箇所の克服状況</h2>
        {metrics.weak_sections.map(section => (
          <div key={section.bar} className="flex items-center gap-4 mb-3">
            <div className="w-24 text-sm text-gray-600">小節 {section.bar}</div>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{ width: `${section.improvement_rate}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-medium text-green-700">
              +{section.improvement_rate}%
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
```

---

*最終更新: 2025-10-27 | バージョン 3.0*
*責任を持って実装できる仕様*
*運用で揉めるポイントを事前に潰した版*
