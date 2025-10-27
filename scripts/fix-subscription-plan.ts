#!/usr/bin/env tsx

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixSubscription(email: string) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // ユーザーIDを取得
    const userResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ ユーザーが見つかりません');
      return;
    }

    const user = userResult.rows[0];

    // サブスクリプションを "free" から "freemium" に修正
    const updateResult = await client.query(
      `UPDATE subscriptions
       SET plan = 'freemium'
       WHERE user_id = $1
       AND plan = 'free'
       RETURNING id, plan, status`,
      [user.id]
    );

    if (updateResult.rows.length === 0) {
      console.log('⚠️ 修正が必要なサブスクリプションが見つかりません');

      // 現在のサブスクリプションを表示
      const currentSub = await client.query(
        'SELECT id, plan, status FROM subscriptions WHERE user_id = $1',
        [user.id]
      );

      if (currentSub.rows.length > 0) {
        console.log('現在のサブスクリプション:', currentSub.rows[0]);
      }
    } else {
      console.log('✅ サブスクリプションを修正しました:');
      console.log('  ID:', updateResult.rows[0].id);
      console.log('  プラン: free → freemium');
      console.log('  ステータス:', updateResult.rows[0].status);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.end();
  }
}

const email = process.argv[2] || 'glasswerkskimny@gmail.com';
fixSubscription(email);
