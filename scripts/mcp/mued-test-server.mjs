#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// MCPサーバーの設定
const server = new Server(
  {
    name: "mued-test",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// APIテスト関数
async function testAPI(endpoint) {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`);
    const data = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 基本テスト実行
async function runBasicTests() {
  const results = [];

  // APIエンドポイントのテスト
  const endpoints = [
    { name: "ホームページ", url: "/" },
    { name: "レッスンAPI", url: "/api/lessons?available=true" },
  ];

  for (const endpoint of endpoints) {
    try {
      if (endpoint.url.startsWith("/api")) {
        const result = await testAPI(endpoint.url);
        results.push({
          test: endpoint.name,
          ...result
        });
      } else {
        const response = await fetch(`http://localhost:3000${endpoint.url}`);
        results.push({
          test: endpoint.name,
          status: response.status,
          success: response.ok
        });
      }
    } catch (error) {
      results.push({
        test: endpoint.name,
        success: false,
        error: error.message
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    results: results
  };
}

// ツールハンドラー設定
server.setRequestHandler(async (request) => {
  switch (request.method) {
    case "tools/list":
      return {
        tools: [
          {
            name: "run_tests",
            description: "MUED LMSの基本的なテストを実行",
            inputSchema: {
              type: "object",
              properties: {}
            }
          },
          {
            name: "test_api",
            description: "特定のAPIエンドポイントをテスト",
            inputSchema: {
              type: "object",
              properties: {
                endpoint: {
                  type: "string",
                  description: "テストするエンドポイント（例: /api/lessons）"
                }
              },
              required: ["endpoint"]
            }
          },
          {
            name: "health_check",
            description: "サーバーの稼働状況を確認",
            inputSchema: {
              type: "object",
              properties: {}
            }
          }
        ]
      };

    case "tools/call":
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "run_tests": {
            const results = await runBasicTests();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(results, null, 2)
                }
              ]
            };
          }

          case "test_api": {
            const result = await testAPI(args.endpoint);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result, null, 2)
                }
              ]
            };
          }

          case "health_check": {
            try {
              const response = await fetch("http://localhost:3000");
              return {
                content: [
                  {
                    type: "text",
                    text: `サーバー状態: ${response.ok ? "正常" : "エラー"} (Status: ${response.status})`
                  }
                ]
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: `サーバーに接続できません: ${error.message}`
                  }
                ]
              };
            }
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `エラー: ${error.message}`
            }
          ],
          isError: true
        };
      }

    default:
      throw new Error(`Unknown method: ${request.method}`);
  }
});

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // エラー出力（標準エラー出力へ）
  console.error("MCP Test Server started successfully");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});