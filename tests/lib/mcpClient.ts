import type { APIRequestContext } from '@playwright/test';

export interface McpResult {
  ok: boolean;
  error?: string;
}

/**
 * MCP サーバーに命令を送信するユーティリティ関数
 * @param request Playwright の APIRequestContext オブジェクト
 * @param instructions 実行する命令（自然言語）
 * @returns MCP サーバーからの応答
 */
export async function execMcp(request: APIRequestContext, instructions: string): Promise<McpResult> {
  const r = await request.post('http://localhost:3333/mcp/execute', {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      Authorization: `Bearer ${process.env.PLAYWRIGHT_MCP_TOKEN}`,
    },
    data: { instructions, tools: ['browser', 'screenshot'] },
  });

  const text = await r.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    console.warn('[execMcp] Non-JSON response:', text);
    return { ok: false, error: 'Invalid JSON from MCP' };
  }

  const data = json as any;
  if (data && typeof data === 'object') {
    if (data.error) return { ok: false, error: data.error.message || String(data.error) };
    if (data.result) return { ok: true };
    if (data.status) return { ok: data.status === 'completed', error: data.error };
  }
  return { ok: false, error: 'Unknown MCP response format' };
} 