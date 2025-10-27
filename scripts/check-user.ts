#!/usr/bin/env tsx

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkUser(email: string) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('📊 ユーザー情報チェック:', email);
    console.log('='.repeat(60));

    // ユーザー情報
    const userResult = await client.query(
      'SELECT id, clerk_id, email, name, role, created_at FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ ユーザーが見つかりません');
      console.log('💡 Clerk Webhookが正常に動作していない可能性があります');
      return;
    }

    const user = userResult.rows[0];
    console.log('\n✅ ユーザー情報:');
    console.log('  ID:', user.id);
    console.log('  Clerk ID:', user.clerk_id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name || '(未設定)');
    console.log('  Role:', user.role);
    console.log('  登録日時:', user.created_at);

    // サブスクリプション確認
    const subResult = await client.query(
      'SELECT plan, status, stripe_customer_id, current_period_end FROM subscriptions WHERE user_id = $1',
      [user.id]
    );

    console.log('\n📦 サブスクリプション:');
    if (subResult.rows.length === 0) {
      console.log('  ⚠️ サブスクリプションが見つかりません');
      console.log('  💡 デフォルトで "free" プランが割り当てられるべきです');
    } else {
      const sub = subResult.rows[0];
      console.log('  プラン:', sub.plan);
      console.log('  ステータス:', sub.status);
      console.log('  Stripe Customer ID:', sub.stripe_customer_id || '(未設定)');
      console.log('  期間終了:', sub.current_period_end || '(無期限)');
    }

    // 教材作成状況
    const materialsResult = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as this_month
       FROM materials WHERE creator_id = $1`,
      [user.id]
    );

    console.log('\n📚 教材作成状況:');
    console.log('  累計:', materialsResult.rows[0].total);
    console.log('  今月:', materialsResult.rows[0].this_month);

    // Freeプランの制限確認
    console.log('\n⚙️ Freeプランの制限:');
    console.log('  月間教材作成数: 5個まで');
    console.log('  現在の使用: ', materialsResult.rows[0].this_month, '/ 5');

    if (parseInt(materialsResult.rows[0].this_month) >= 5) {
      console.log('  ⚠️ 月間制限に到達しています');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.end();
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: tsx scripts/check-user.ts <email>');
  process.exit(1);
}

checkUser(email);
