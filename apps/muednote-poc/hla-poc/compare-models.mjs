/**
 * HLA PoC - モデル比較テスト
 * gpt-5-mini vs gpt-4.1-nano
 */

import * as fs from 'fs';

// 環境変数読み込み
function loadEnv() {
  const envPath = '/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/.env.local';
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
  }
}
loadEnv();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY が設定されていません');
  process.exit(1);
}

// テスト対象モデル
const MODELS = ['gpt-4.1-nano'];

// テスト入力（1つだけで比較）
const testInput = `
えーっと、、、
ここさあ、、、Dm7からさあ、、、G7で、、、んー普通すぎるかなあ
いやまあ、これはこれで
あ、ベース、ベースあとでね
うわ〜〜〜また落ちた、このプラグイン、まじで、、、
んーーー
あ、そうだリファレンス、、、BPM、、、Spotifyのやつ、調べないと
ここのコンプさあ、、、アタック、、、早いとさあ、パンチなくなるんだよね
これ前もやったな、、、
明日まで、ドラム、、、やんないとなあ
あ〜〜〜モチベ、、、まあいいか
サビ、3度上、、、ハモり、、、厚くなりそう
`;

const HLA_SYSTEM_PROMPT = `音楽制作者の思考ログを整理してください。

## 入力の特徴
- 断片的で文法不完全（「、、、」「〜〜〜」多い）
- 指示語多い（「ここ」「これ」）
- 感嘆詞のみの行あり（スキップ対象）

## カテゴリ分類（できるだけ多く拾う）
- idea: 「〜かも」「〜したら」「〜ありだな」→ アイデア
- todo: 「〜しないと」「明日まで」「やんないと」→ タスク
- tips: 「〜なるんだよね」「前もやった」→ 学び・経験
- frustration: 「もう」「なんで」「マジで」「ダメだ」「うわ〜」→ 不満

## 重要ルール
1. 感嘆詞のみ（「んーーー」「あ〜〜」単独）はスキップ
2. 意味ある発言はすべて拾う（4〜10個程度）
3. 具体的内容を残す（Dm7, G7, コンプ, BPM等）
4. 1文に複数カテゴリ混在→主要なもの1つ選択

## 出力JSON
{
  "items": [{ "category": "idea|todo|tips|frustration", "content": "具体的内容" }],
  "summary": { "mainFocus": "具体的に", "mood": "productive|creative|frustrated|learning|mixed" },
  "meta": { "totalItems": N, "categoryCounts": {"idea":N,"todo":N,"tips":N,"frustration":N} }
}`;

async function callOpenAI(model, prompt) {
  // gpt-5系は推論モデルなので temperature, max_tokens が使えない
  const isGpt5 = model.startsWith('gpt-5');

  const body = {
    model: model,
    messages: [{ role: 'user', content: prompt }],
  };

  if (isGpt5) {
    body.max_completion_tokens = 1500;
    // temperature はデフォルト(1)のみ
  } else {
    body.temperature = 0.3;
    body.max_tokens = 1500;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${model}: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

function parseJSON(raw) {
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}

async function testModel(model) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🔄 テスト: ${model}`);
  console.log('='.repeat(50));

  const prompt = `${HLA_SYSTEM_PROMPT}\n\n入力:\n\`\`\`\n${testInput}\n\`\`\``;
  const startTime = Date.now();

  try {
    const result = await callOpenAI(model, prompt);
    const elapsed = Date.now() - startTime;

    console.log(`⏱️  処理時間: ${elapsed}ms`);
    console.log(`📊 トークン: 入力=${result.usage.prompt_tokens}, 出力=${result.usage.completion_tokens}, 合計=${result.usage.total_tokens}`);

    const parsed = parseJSON(result.content);
    if (parsed) {
      console.log(`✅ JSON解析成功`);
      console.log(`   items数: ${parsed.items?.length || 0}`);
      console.log(`   mood: ${parsed.summary?.mood || 'N/A'}`);
      console.log(`   カテゴリ: ${JSON.stringify(parsed.meta?.categoryCounts || {})}`);

      // 品質チェック
      const hasSpecificContent = parsed.items?.some(item =>
        item.content.includes('Dm7') ||
        item.content.includes('G7') ||
        item.content.includes('コンプ') ||
        item.content.includes('BPM')
      );
      console.log(`   具体性保持: ${hasSpecificContent ? '✅' : '❌'}`);

      return { model, elapsed, success: true, parsed, usage: result.usage };
    } else {
      console.log(`❌ JSON解析失敗`);
      return { model, elapsed, success: false, raw: result.content };
    }
  } catch (error) {
    console.log(`❌ エラー: ${error.message}`);
    return { model, elapsed: 0, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 モデル比較テスト開始\n');
  console.log('比較モデル:', MODELS.join(' vs '));

  const results = [];

  for (const model of MODELS) {
    const result = await testModel(model);
    results.push(result);
    // レート制限対策
    await new Promise(r => setTimeout(r, 2000));
  }

  // サマリー
  console.log('\n' + '='.repeat(50));
  console.log('📊 比較結果サマリー');
  console.log('='.repeat(50));

  console.log('\n| モデル | 処理時間 | トークン | 成功 |');
  console.log('|--------|----------|----------|------|');
  for (const r of results) {
    const time = r.elapsed ? `${r.elapsed}ms` : 'N/A';
    const tokens = r.usage ? r.usage.total_tokens : 'N/A';
    const status = r.success ? '✅' : '❌';
    console.log(`| ${r.model} | ${time} | ${tokens} | ${status} |`);
  }

  // 勝者判定
  const successful = results.filter(r => r.success);
  if (successful.length >= 2) {
    const fastest = successful.reduce((a, b) => a.elapsed < b.elapsed ? a : b);
    console.log(`\n🏆 速度勝者: ${fastest.model} (${fastest.elapsed}ms)`);
  }
}

main();
