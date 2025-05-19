import type { APIRequestContext } from '@playwright/test';

interface McpResponse {
  status: 'completed' | 'error';
  error?: string;
}

/**
 * MCP サーバーに命令を送信するユーティリティ関数
 * @param request Playwright の APIRequestContext オブジェクト
 * @param instructions 実行する命令（自然言語）
 * @returns MCP サーバーからの応答
 */
export async function execMcp(
  request: APIRequestContext,
  instructions: string
) {
  const r = await request.post('http://localhost:3333/mcp/execute', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PLAYWRIGHT_MCP_TOKEN}`,
    },
    data: { instructions, tools: ['browser', 'screenshot'] },
  });

  const text = await r.text();
  try {
    const json = JSON.parse(text);
    console.log('[execMcp] response json:', json);
    return json;
  } catch {
    console.warn('[execMcp] non-json response:', text);
    return { ok: r.ok(), httpStatus: r.status(), raw: text };
  }
} 