/**
 * HLA PoC - テスト実行スクリプト
 *
 * 使い方:
 * cd apps/muednote-poc
 * npx ts-node hla-poc/hla-test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { testInputs, HLAOutput } from './test-inputs';
import { buildHLAPrompt, DEPTH_PRESERVATION_GUIDELINES } from './hla-prompt';

// mued_v2 本体の .env.local から API キーを読み込み
function loadEnvFromFile(): void {
  const envPaths = [
    '/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/.env.local',
    path.join(__dirname, '../../../../.env.local'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2];
        }
      });
      console.log(`📁 環境変数を読み込み: ${envPath}`);
      return;
    }
  }
}

loadEnvFromFile();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY が設定されていません');
  console.error('   export OPENAI_API_KEY=sk-... で設定してください');
  process.exit(1);
}

// モデル選択（CLAUDE.md に従い gpt-4.1-mini を使用 - 単純生成タスク）
const MODEL = 'gpt-4.1-mini';

async function callOpenAI(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // 分類タスクなので低め
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseHLAOutput(raw: string): HLAOutput | null {
  // JSON部分を抽出（```json ... ``` で囲まれている場合も対応）
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    console.error('❌ JSON を抽出できませんでした');
    console.error('Raw output:', raw);
    return null;
  }

  try {
    return JSON.parse(jsonMatch[1]) as HLAOutput;
  } catch (e) {
    console.error('❌ JSON パースエラー:', e);
    console.error('Extracted JSON:', jsonMatch[1]);
    return null;
  }
}

function printResult(name: string, input: string, output: HLAOutput) {
  console.log('\n' + '='.repeat(60));
  console.log(`📝 テストケース: ${name}`);
  console.log('='.repeat(60));

  console.log('\n【入力（乱文）】');
  console.log(input.trim().substring(0, 200) + '...');

  console.log('\n【分類結果】');
  output.items.forEach((item, i) => {
    const emoji = {
      idea: '💡',
      todo: '✅',
      tips: '📚',
      frustration: '😤',
    }[item.category];
    console.log(`  ${i + 1}. ${emoji} [${item.category}] ${item.content}`);
    if (item.context) {
      console.log(`     └─ 補足: ${item.context}`);
    }
  });

  console.log('\n【要約】');
  console.log(`  主な取り組み: ${output.summary.mainFocus}`);
  console.log(`  ムード: ${output.summary.mood}`);
  if (output.summary.keyInsights.length > 0) {
    console.log('  重要な気づき:');
    output.summary.keyInsights.forEach((insight) => {
      console.log(`    - ${insight}`);
    });
  }
  if (output.summary.nextActions && output.summary.nextActions.length > 0) {
    console.log('  次のアクション:');
    output.summary.nextActions.forEach((action) => {
      console.log(`    - ${action}`);
    });
  }

  console.log('\n【メタ情報】');
  console.log(`  総項目数: ${output.meta.totalItems}`);
  console.log(`  カテゴリ別: ${JSON.stringify(output.meta.categoryCounts)}`);
  if (output.meta.processingNote) {
    console.log(`  処理メモ: ${output.meta.processingNote}`);
  }
}

async function runTest(name: string, input: string) {
  console.log(`\n🔄 テスト実行中: ${name}...`);

  const prompt = buildHLAPrompt(input);
  const startTime = Date.now();

  try {
    const rawOutput = await callOpenAI(prompt);
    const elapsed = Date.now() - startTime;

    console.log(`   ⏱️  処理時間: ${elapsed}ms`);

    const parsed = parseHLAOutput(rawOutput);
    if (parsed) {
      printResult(name, input, parsed);
      return { success: true, elapsed, output: parsed };
    } else {
      return { success: false, elapsed, error: 'Parse failed' };
    }
  } catch (error) {
    console.error(`❌ エラー: ${error}`);
    return { success: false, error: String(error) };
  }
}

async function main() {
  console.log('🚀 HLA PoC テスト開始');
  console.log(`   モデル: ${MODEL}`);
  console.log('');

  const results: Record<string, unknown> = {};

  // 全テストケースを実行
  for (const [name, input] of Object.entries(testInputs)) {
    results[name] = await runTest(name, input);
    // レート制限対策
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));

  for (const [name, result] of Object.entries(results)) {
    const r = result as { success: boolean; elapsed?: number };
    const status = r.success ? '✅' : '❌';
    const time = r.elapsed ? `${r.elapsed}ms` : 'N/A';
    console.log(`  ${status} ${name}: ${time}`);
  }
}

main().catch(console.error);
