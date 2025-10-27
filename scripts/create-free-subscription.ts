#!/usr/bin/env tsx

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function createFreeSubscription(email: string) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // ユーザーIDを取得
    const userResult = await client.query(
      'SELECT id, email, name FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ ユーザーが見つかりません:', email);
      return;
    }

    const user = userResult.rows[0];
    console.log('👤 ユーザー:', user.name, `(${user.email})`);

    // 既存のサブスクリプションを確認
    const existingSubResult = await client.query(
      'SELECT id, plan, status FROM subscriptions WHERE user_id = $1',
      [user.id]
    );

    if (existingSubResult.rows.length > 0) {
      console.log('⚠️ すでにサブスクリプションが存在します:');
      console.log('  プラン:', existingSubResult.rows[0].plan);
      console.log('  ステータス:', existingSubResult.rows[0].status);
      return;
    }

    // Freeプランのサブスクリプションを作成
    const insertResult = await client.query(
      `INSERT INTO subscriptions (
        user_id,
        plan,
        status,
        created_at,
        updated_at
      ) VALUES ($1, 'free', 'active', NOW(), NOW())
      RETURNING id, plan, status`,
      [user.id]
    );

    console.log('✅ Freeプランのサブスクリプションを作成しました:');
    console.log('  ID:', insertResult.rows[0].id);
    console.log('  プラン:', insertResult.rows[0].plan);
    console.log('  ステータス:', insertResult.rows[0].status);
    console.log('\n💡 月間教材作成制限: 5個');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.end();
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: tsx scripts/create-free-subscription.ts <email>');
  process.exit(1);
}

createFreeSubscription(email);
