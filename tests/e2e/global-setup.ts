import { request, FullConfig } from '@playwright/test';
import fs from 'fs';

/**
 * Playwright globalSetup
 * Supabase のパスワード認証を使ってテスト用ユーザーのセッションを作成し、
 * storageState(.auth.json) に保存する。
 * これで各テストはログイン済みの状態から開始出来る。
 */
export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  const baseURL = process.env.E2E_REMOTE_URL || 'http://localhost:3000';

  if (!supabaseUrl || !anonKey || !email || !password) {
    console.error('[globalSetup] 必要な環境変数が不足しています');
    console.error({ supabaseUrl, anonKeyExists: !!anonKey, email, passwordExists: !!password });
    return;
  }

  const ctx = await request.newContext();

  async function login() {
    return ctx.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      data: { email, password },
    });
  }

  // 1) ログイン試行
  let tokenRes = await login();

  // 2) 失敗したらサインアップしてもう一度ログイン
  if (!tokenRes.ok()) {
    console.warn('[globalSetup] login failed. Try sign-up…');
    const signUpRes = await ctx.post(`${supabaseUrl}/auth/v1/signup`, {
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      data: { email, password },
    });

    if (!signUpRes.ok()) {
      console.error('[globalSetup] sign-up failed:', await signUpRes.text());
    } else {
      console.log('[globalSetup] sign-up success');
    }

    tokenRes = await login();
  }

  if (!tokenRes.ok()) {
    console.error('[globalSetup] 再ログイン失敗:', await tokenRes.text());
    return;
  }

  const json = await tokenRes.json();
  const {
    access_token,
    refresh_token,
    expires_in,
    token_type,
    user,
  } = json;

  const expires_at = Math.floor(Date.now() / 1000) + (expires_in ?? 3600);
  const session = {
    access_token,
    refresh_token,
    expires_in,
    expires_at,
    token_type,
    user,
  };

  // Supabase v2 が利用する localStorage キー (v1 も同じ)
  const projectRefMatch = supabaseUrl.match(/https?:\/\/(.*?)\.supabase\.co/);
  const projectRef = projectRefMatch ? projectRefMatch[1] : 'project';
  const storageKey = `sb-${projectRef}-auth-token`;
  const persistKey = `sb-${projectRef}-persist-session`;

  const storageStatePath = 'tests/e2e/.auth.json';

  const storageState: any = {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [
          {
            name: storageKey,
            value: JSON.stringify({ currentSession: session, expiresAt: expires_at }),
          },
          {
            name: persistKey,
            value: 'true',
          },
        ],
      },
    ],
  } as unknown;

  fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2));

  console.log('[globalSetup] storageState saved to', storageStatePath);
} 