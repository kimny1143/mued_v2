import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type McpResponse = {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

// MCP エラーの種類を定義
type McpErrorType = 
  | 'PARSE_ERROR'      // 命令文の解析失敗
  | 'ELEMENT_NOT_FOUND' // 要素が見つからない
  | 'TIMEOUT'          // 操作タイムアウト
  | 'NETWORK_ERROR'    // ネットワークエラー
  | 'UNKNOWN_ERROR';   // その他のエラー

// エラーメッセージの日本語マッピング
const ERROR_MESSAGES: Record<McpErrorType, string> = {
  PARSE_ERROR: '命令文の解析に失敗しました。より具体的な指示を試してください。',
  ELEMENT_NOT_FOUND: '指定された要素が見つかりませんでした。セレクタを確認してください。',
  TIMEOUT: '操作がタイムアウトしました。ページの読み込みを待って再試行してください。',
  NETWORK_ERROR: 'ネットワークエラーが発生しました。接続を確認してください。',
  UNKNOWN_ERROR: '予期せぬエラーが発生しました。',
};

// エラーメッセージを解析して適切な日本語メッセージを返す
function parseMcpError(error: string): string {
  if (error.includes('Failed to parse')) {
    return ERROR_MESSAGES.PARSE_ERROR;
  }
  if (error.includes('Element not found')) {
    return ERROR_MESSAGES.ELEMENT_NOT_FOUND;
  }
  if (error.includes('Timeout')) {
    return ERROR_MESSAGES.TIMEOUT;
  }
  if (error.includes('NetworkError')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}

export async function execMcp(command: string): Promise<McpResponse> {
  try {
    const { stdout } = await execAsync(
      `curl -X POST http://localhost:3333/exec \
        -H "Content-Type: application/json" \
        -H "accept: application/json" \
        -d '{"command": "${command}"}'`
    );

    const response = JSON.parse(stdout);
    
    if (!response.ok) {
      return {
        ok: false,
        error: parseMcpError(response.error || ''),
        data: response.data,
      };
    }

    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    console.error('MCP 実行エラー:', error);
    return {
      ok: false,
      error: parseMcpError(error instanceof Error ? error.message : String(error)),
    };
  }
} 