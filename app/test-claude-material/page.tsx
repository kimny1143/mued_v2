'use client';

import { MusicMaterialDisplay } from '@/components/features/materials/music-material-display';

// Claude Sonnet 4.5 が生成した教材データ
const claudeMaterialData = {
  "type": "music" as const,
  "title": "春の小川 - Dメジャー アルペジオ練習曲",
  "description": "初心者向けのDメジャーのアルペジオ練習曲です。6/8拍子の流れるようなリズムで、基本的なコード進行(D-G-A7-D)を使用し、右手のアルペジオパターンと左手のコードチェンジを学びます。",
  "abcNotation": `X:1
T:春の小川 - Dメジャー アルペジオ練習曲
C:Music Education AI
M:6/8
L:1/8
Q:1/8=120
K:D
%%MIDI program 24
% Part A - 基本パターンの導入
|:"D"d2f a2f|d2f a2f|"G"g2b d'2b|g2b d'2b|
"A7"e2a c'2a|e2a c'2a|"D"d2f a2d'|d2f a2d'|
% Part B - パターンの展開
"D"f2a d'2a|f2a d'2f|"G"g2b d'2b|g2b g2d'|
"A7"e2g c'2e'|e2g c'2a|"D"d2f a2f|d3 d3:|
% Part C - 変奏と上行
|:"D"A2d f2a|d'2a f2d|"G"B2d g2b|d'2b g2d|
"A7"c2e a2c'|e'2c' a2e|"D"d2f a2d'|f'2d' a2f|
% Part D - クライマックスと終結
"G"g2b d'2g'|"D"f2a d'2f'|"A7"e2a c'2e'|"A7"e2g c'2e|
"D"d2f a2d'|"D"f2a d'2f|"G"g2b "A7"e2g|"D"d3 d3:|`,
  "learningPoints": [
    "Dメジャースケールの基本ポジション(開放弦を含む)を習得します",
    "6/8拍子の「強-弱-弱-中強-弱-弱」のリズム感覚を身につけます",
    "D、G、A7の3つの基本コードのアルペジオパターンを学びます",
    "右手の指(p-i-m-a)を使った分散和音の奏法を練習します",
    "コード進行に合わせた左手のスムーズな移動を習得します"
  ],
  "practiceInstructions": [
    "まず各コード(D、G、A7)の形を確認し、ゆっくりと押さえる練習をしましょう。コードチェンジに30秒以上かけても構いません。",
    "右手のアルペジオパターンを1つのコードで繰り返し練習します。テンポ60(記載の半分)で、親指(p)-人差し指(i)-中指(m)-人差し指(i)-中指(m)-人差し指(i)の順で弾きます。",
    "Part Aの最初の4小節だけを取り出し、テンポ80で練習します。コードチェンジの際は、次のコードの形を頭の中でイメージしてから移動しましょう。",
    "Part A全体(8小節)を通して弾けるようになったら、Part Bに進みます。各パートを個別に完成させてから繋げる方が効果的です。",
    "Part AとBが安定したら、テンポを100に上げて練習します。メトロノームを使って正確なリズムを保ちましょう。",
    "Part CとDは少し難易度が上がります。ポジション移動が多いので、最初は各小節を個別に練習し、音の繋がりを確認してください。",
    "全曲を通して演奏できるようになったら、指定テンポ120で演奏します。強弱をつけて(Part Aはmf、Part Cはfで)表現力を高めましょう。録音して自分の演奏を聴き返すと、改善点が見つかります。"
  ]
};

export default function TestClaudeMaterialPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Claude Sonnet 4.5 - 教材生成テスト
          </h1>
          <p className="text-gray-600">
            Claude MCP Server で生成された教材を UI コンポーネントで表示
          </p>
          <div className="mt-4 flex gap-4 text-sm">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
              モデル: Claude Sonnet 4.5
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              生成日: 2025-11-12
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
              Chain-of-Musical-Thought
            </span>
          </div>
        </div>

        {/* Material Display */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <MusicMaterialDisplay content={claudeMaterialData} />
        </div>

        {/* Debug Info */}
        <details className="mt-8 bg-gray-100 rounded-lg p-4">
          <summary className="cursor-pointer font-semibold text-gray-700">
            🔍 デバッグ情報（JSON構造確認）
          </summary>
          <pre className="mt-4 bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(claudeMaterialData, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
