/**
 * MUEDnote v7 DB PoC
 * muednote_v3 スキーマへの保存・検索テスト
 */

import * as fs from 'fs';
import pg from 'pg';

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

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL が設定されていません');
  process.exit(1);
}

// HLAテスト結果（run-test.mjsの出力を模擬）
const testData = [
  {
    name: 'mixing_session',
    content: `んーーー、このキック、、、もうちょっと、、、サチュレーション、、、
あ、Serumのプリセット、、、どこだっけ、、、
いやこれ、、、808とぶつかってんな、、、サイドチェインか、、、
うわ〜〜Abletonまたフリーズした、、、なんなの、、、`,
    hlaResult: {
      items: [
        { category: 'idea', content: 'キックにサチュレーションを追加' },
        { category: 'todo', content: 'Serumのプリセットを探す' },
        { category: 'idea', content: '808とのぶつかり解消にサイドチェイン検討' },
        { category: 'frustration', content: 'Abletonがフリーズした' },
      ],
      summary: { mainFocus: 'ミックス作業中のキック調整', mood: 'frustrated' },
      meta: { totalItems: 4, categoryCounts: { idea: 2, todo: 1, frustration: 1 } }
    }
  },
  {
    name: 'creative_burst',
    content: `あ、このフレーズ、、、Cメジャーペンタで、、、いけそう、、、
この転調、、、Abから、、、Bbに、、、いけるかな、、、
ここ、、、ストリングス、、、入れたら、、、エモくなりそう、、、`,
    hlaResult: {
      items: [
        { category: 'idea', content: 'Cメジャーペンタでフレーズ作成' },
        { category: 'idea', content: 'AbからBbへの転調を試す' },
        { category: 'idea', content: 'ストリングスでエモさを追加' },
      ],
      summary: { mainFocus: 'アレンジのアイデア出し', mood: 'creative' },
      meta: { totalItems: 3, categoryCounts: { idea: 3 } }
    }
  },
  {
    name: 'late_night',
    content: `え、もう3時、、、マジか、、、
あー、、、もう何回聴いたかわかんない、、、耳バカになってきた、、、
あ、クライアント、、、修正、、、明日まで、、、うわ、、、忘れてた、、、`,
    hlaResult: {
      items: [
        { category: 'frustration', content: '深夜3時まで作業、耳が疲れた' },
        { category: 'todo', content: 'クライアント修正を明日までに完了' },
      ],
      summary: { mainFocus: '深夜作業の疲労と締め切り', mood: 'frustrated' },
      meta: { totalItems: 2, categoryCounts: { todo: 1, frustration: 1 } }
    }
  }
];

async function main() {
  console.log('='.repeat(50));
  console.log('MUEDnote v7 DB PoC');
  console.log('='.repeat(50));
  console.log('\nDB接続中...');

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // 1. muednote_v3 スキーマの存在確認
  console.log('\n📋 スキーマ確認...');
  const schemaCheck = await client.query(`
    SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'muednote_v3'
  `);

  if (schemaCheck.rows.length === 0) {
    console.log('❌ muednote_v3 スキーマが存在しません。マイグレーションを実行してください。');
    await client.end();
    return;
  }
  console.log('✅ muednote_v3 スキーマ存在確認');

  // 2. テスト用ユーザーID取得（既存ユーザーを使用）
  const userResult = await client.query(`
    SELECT id FROM public.users LIMIT 1
  `);

  if (userResult.rows.length === 0) {
    console.log('❌ ユーザーが存在しません。テスト用ユーザーを作成してください。');
    await client.end();
    return;
  }
  const testUserId = userResult.rows[0].id;
  console.log(`✅ テストユーザーID: ${testUserId}`);

  // 3. テストデータINSERT
  console.log('\n📝 テストデータ挿入...');

  for (const data of testData) {
    const insertResult = await client.query(`
      INSERT INTO muednote_v3.fragments (
        user_id,
        content,
        processed_content,
        status,
        ai_summary,
        emotions,
        action_items,
        technical_terms,
        captured_at,
        processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id
    `, [
      testUserId,
      data.content,
      data.hlaResult.items.map(i => `[${i.category}] ${i.content}`).join('\n'),
      'completed',
      data.hlaResult.summary.mainFocus,
      JSON.stringify({ mood: data.hlaResult.summary.mood }),
      JSON.stringify(data.hlaResult.items),
      JSON.stringify(data.hlaResult.meta.categoryCounts)
    ]);

    console.log(`  ✅ ${data.name}: ${insertResult.rows[0].id}`);
  }

  // 4. 検索テスト
  console.log('\n🔍 検索テスト...');

  // 4-1. カテゴリで検索（frustrationを含むもの）
  console.log('\n  [カテゴリ検索: frustration]');
  const categorySearch = await client.query(`
    SELECT id, ai_summary, action_items
    FROM muednote_v3.fragments
    WHERE user_id = $1
      AND action_items @> '[{"category": "frustration"}]'
    ORDER BY captured_at DESC
  `, [testUserId]);

  console.log(`  結果: ${categorySearch.rowCount}件`);
  categorySearch.rows.forEach((row, i) => {
    console.log(`    ${i + 1}. ${row.ai_summary}`);
  });

  // 4-2. mood で検索
  console.log('\n  [mood検索: creative]');
  const moodSearch = await client.query(`
    SELECT id, ai_summary, emotions
    FROM muednote_v3.fragments
    WHERE user_id = $1
      AND emotions->>'mood' = 'creative'
    ORDER BY captured_at DESC
  `, [testUserId]);

  console.log(`  結果: ${moodSearch.rowCount}件`);
  moodSearch.rows.forEach((row, i) => {
    console.log(`    ${i + 1}. ${row.ai_summary}`);
  });

  // 4-3. 全文検索（日本語）
  console.log('\n  [全文検索: サイドチェイン]');
  const ftsSearch = await client.query(`
    SELECT id, ai_summary, content
    FROM muednote_v3.fragments
    WHERE user_id = $1
      AND content ILIKE '%サイドチェイン%'
    ORDER BY captured_at DESC
  `, [testUserId]);

  console.log(`  結果: ${ftsSearch.rowCount}件`);
  ftsSearch.rows.forEach((row, i) => {
    console.log(`    ${i + 1}. ${row.ai_summary}`);
  });

  // 5. クリーンアップ（テストデータ削除）
  console.log('\n🧹 テストデータ削除...');
  await client.query(`
    DELETE FROM muednote_v3.fragments
    WHERE user_id = $1
      AND ai_summary IN ('ミックス作業中のキック調整', 'アレンジのアイデア出し', '深夜作業の疲労と締め切り')
  `, [testUserId]);
  console.log('✅ 削除完了');

  await client.end();
  console.log('\n✅ PoC完了');
}

main().catch(console.error);
