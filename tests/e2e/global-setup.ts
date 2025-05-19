import { request, FullConfig } from '@playwright/test';
import fs from 'fs';
import { spawn } from 'child_process';
import net from 'net';

/**
 * Playwright globalSetup
 * Supabase のパスワード認証を使ってテスト用ユーザーのセッションを作成し、
 * storageState(.auth.json) に保存する。
 * これで各テストはログイン済みの状態から開始出来る。
 */

type StorageState = {
  cookies: unknown[];
  origins: {
    origin: string;
    localStorage: { name: string; value: string }[];
  }[];
};

export default async function globalSetup(config: FullConfig) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.E2E_USER_EMAIL!;
  const password = process.env.E2E_USER_PASSWORD!;
  const baseURL = process.env.E2E_REMOTE_URL || 'http://localhost:3000';

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

    if (!signUpRes.ok() && serviceRoleKey) {
      console.warn('[globalSetup] signup 無効ドメイン? admin API で直接ユーザー作成を試みます…');
      const adminRes = await ctx.post(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          email,
          password,
          email_confirm: true,
        },
      });

      if (!adminRes.ok()) {
        console.error('[globalSetup] admin user create failed:', await adminRes.text());
      } else {
        console.log('[globalSetup] admin user create success');
      }
    } else if (!signUpRes.ok()) {
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

  const storageState: StorageState = {
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
  };

  fs.writeFileSync(storageStatePath, JSON.stringify(storageState, null, 2));

  console.log('[globalSetup] storageState saved to', storageStatePath);

  // --- MCP サーバーを起動（ポートが空いていれば） ---
  await new Promise<void>((resolve) => {
    const client = net.createConnection({ port: 3333 }, () => {
      // 既に起動中
      client.end();
      resolve();
    });
    client.on('error', () => {
      // ポート空き -> 起動
      console.log('[globalSetup] start MCP server');
      const proc = spawn('npm', ['run', 'mcp'], { stdio: 'inherit' });
      // 簡易ポーリングで起動待ち
      const check = setInterval(() => {
        const c = net.createConnection({ port: 3333 }, () => {
          clearInterval(check);
          c.end();
          console.log('[globalSetup] MCP ready');
          resolve();
        });
        c.on('error', () => {});
      }, 1000);
    });
  });
} 