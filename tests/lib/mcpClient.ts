import { Page } from '@playwright/test';

interface McpResponse {
  status: string;
  result?: unknown;
  error?: string;
}

/**
 * MCP サーバーに命令を送信するユーティリティ関数
 * @param page Playwright のページオブジェクト
 * @param instructions 実行する命令（自然言語）
 * @returns MCP サーバーからの応答
 */
export async function execMcp(page: Page, instructions: string): Promise<McpResponse> {
  const res = await page.evaluate(async ({ instructions, token }) => {
    const r = await fetch('http://localhost:3333/mcp/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ instructions, tools: ['browser', 'screenshot'] })
    });
    return await r.json();
  }, { instructions, token: process.env.PLAYWRIGHT_MCP_TOKEN });
  return res;
} 