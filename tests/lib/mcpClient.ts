import type { APIRequestContext } from '@playwright/test';

export interface McpResult {
  ok: boolean;
  error?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
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
): Promise<McpResult> {
  const r = await request.post('http://localhost:3333/mcp/execute', {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
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

  if (isRecord(json)) {
    // JSON-RPC error
    if (isRecord(json.error)) {
      return { ok: false, error: String(json.error.message ?? json.error) };
    }
    if ('result' in json) {
      return { ok: true };
    }
    if (typeof json.status === 'string') {
      return { ok: json.status === 'completed', error: String(json.error ?? '') };
    }
  }
  return { ok: false, error: 'Unknown MCP response format' };
} 