#!/usr/bin/env ts-node
/**
 * Supabase Edge Functionの権限設定を確認するスクリプト
 * 
 * 使用方法:
 * ts-node scripts/check-supabase-permissions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import chalk from 'chalk';

// .env.localから環境変数をロード
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// 設定チェック
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    chalk.red('エラー: Supabase環境変数が設定されていません。以下の環境変数を確認してください:')
  );
  console.error(chalk.yellow('- NEXT_PUBLIC_SUPABASE_URL'));
  console.error(chalk.yellow('- NEXT_PUBLIC_SUPABASE_ANON_KEY'));
  console.error(chalk.yellow('- SUPABASE_SERVICE_ROLE_KEY'));
  process.exit(1);
}

// クライアントの初期化
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceRoleClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// テーブルアクセス権限チェックを行う関数
async function checkTableAccess(client: any, name: string, table: string): Promise<boolean> {
  try {
    const { data, error } = await client.from(table).select('id').limit(1);
    
    if (error) {
      console.error(chalk.red(`${name}は${table}テーブルへのアクセス権限がありません:`), error.message);
      return false;
    }
    
    console.log(chalk.green(`✅ ${name}は${table}テーブルへのアクセス権限があります`));
    return true;
  } catch (err) {
    console.error(chalk.red(`${name}は${table}テーブルへのアクセス中にエラーが発生しました:`), err);
    return false;
  }
}

// 書き込み権限チェックを行う関数
async function checkWriteAccess(client: any, name: string, table: string): Promise<boolean> {
  try {
    // テスト用のデータを作成・削除するトランザクション
    const testId = `test_${Date.now()}`;
    
    // 作成を試みる
    const { data: insertData, error: insertError } = await client
      .from(table)
      .insert({ id: testId, test_field: 'test_value' })
      .select();
    
    if (insertError) {
      console.error(chalk.red(`${name}は${table}テーブルへの書き込み権限がありません:`), insertError.message);
      return false;
    }
    
    // 成功したらすぐに削除
    const { error: deleteError } = await client
      .from(table)
      .delete()
      .eq('id', testId);
    
    if (deleteError) {
      console.warn(chalk.yellow(`警告: テスト用データの削除に失敗しました (${table}):`), deleteError.message);
    }
    
    console.log(chalk.green(`✅ ${name}は${table}テーブルへの書き込み権限があります`));
    return true;
  } catch (err) {
    console.error(chalk.red(`${name}は${table}テーブルへの書き込み中にエラーが発生しました:`), err);
    return false;
  }
}

async function main() {
  console.log(chalk.blue('=== Supabase権限チェック開始 ==='));
  
  // サービスロールキーの有効性を確認
  try {
    const { data: roleCheck, error: roleError } = await serviceRoleClient
      .rpc('get_service_role_status');
    
    if (roleError || !roleCheck) {
      console.error(chalk.red('サービスロールキーが無効または権限が不足しています:'), roleError?.message || 'Unknown error');
    } else {
      console.log(chalk.green('✅ サービスロールキーは有効です'));
    }
  } catch (err) {
    console.warn(chalk.yellow('サービスロール確認RPCは存在しません。これは通常のケースです。'));
  }
  
  console.log(chalk.blue('\n--- テーブルアクセス権限チェック ---'));
  
  // 主要テーブルへの読み取りアクセス確認
  const tables = ['users', 'stripe_customers', 'stripe_user_subscriptions', 'lesson_slots', 'reservations'];
  
  for (const table of tables) {
    await checkTableAccess(serviceRoleClient, 'サービスロール', table);
  }
  
  // 匿名キーでの一般テーブルへのアクセス確認
  const publicTables = ['lesson_slots']; // 一般公開されるべきテーブル
  
  for (const table of publicTables) {
    await checkTableAccess(anonClient, '匿名キー', table);
  }
  
  console.log(chalk.blue('\n--- 書き込み権限チェック ---'));
  
  // サービスロールでの書き込み権限確認
  const writableTables = ['stripe_customers', 'stripe_user_subscriptions'];
  
  for (const table of writableTables) {
    await checkWriteAccess(serviceRoleClient, 'サービスロール', table);
  }
  
  console.log(chalk.blue('\n=== Supabase権限チェック完了 ==='));
}

main().catch(err => {
  console.error(chalk.red('権限チェック実行中にエラーが発生しました:'), err);
  process.exit(1);
}); 