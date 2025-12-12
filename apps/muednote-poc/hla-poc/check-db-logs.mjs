/**
 * DBログ確認スクリプト
 * MUEDnote関連のログがDBに残っているか確認
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

async function main() {
  console.log('DB接続中...\n');

  const client = new pg.Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // log_entries テーブルの確認
  console.log('='.repeat(50));
  console.log('log_entries テーブル');
  console.log('='.repeat(50));

  const logResult = await client.query(`
    SELECT id, type, content, tags, created_at
    FROM log_entries
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`件数: ${logResult.rowCount}`);
  if (logResult.rows.length > 0) {
    logResult.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. [${row.type}] ${row.created_at}`);
      console.log(`   ${row.content?.substring(0, 100)}...`);
      console.log(`   tags: ${JSON.stringify(row.tags)}`);
    });
  } else {
    console.log('(データなし)');
  }

  // sessions テーブルの確認
  console.log('\n' + '='.repeat(50));
  console.log('sessions テーブル');
  console.log('='.repeat(50));

  const sessionResult = await client.query(`
    SELECT id, type, status, title, user_short_note, created_at
    FROM sessions
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`件数: ${sessionResult.rowCount}`);
  if (sessionResult.rows.length > 0) {
    sessionResult.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. [${row.type}/${row.status}] ${row.title}`);
      console.log(`   ${row.created_at}`);
      console.log(`   ${row.user_short_note?.substring(0, 100)}`);
    });
  } else {
    console.log('(データなし)');
  }

  // interview_answers テーブルの確認
  console.log('\n' + '='.repeat(50));
  console.log('interview_answers テーブル');
  console.log('='.repeat(50));

  const answerResult = await client.query(`
    SELECT id, text, created_at
    FROM interview_answers
    ORDER BY created_at DESC
    LIMIT 10
  `);

  console.log(`件数: ${answerResult.rowCount}`);
  if (answerResult.rows.length > 0) {
    answerResult.rows.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.created_at}`);
      console.log(`   ${row.text?.substring(0, 150)}`);
    });
  } else {
    console.log('(データなし)');
  }

  await client.end();
  console.log('\n完了');
}

main().catch(console.error);
