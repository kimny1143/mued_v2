#!/usr/bin/env node
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new Server(
  {
    name: "mued-simple",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// ツールリストハンドラー
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "test_api",
        description: "Test API endpoint",
        inputSchema: {
          type: "object",
          properties: {
            endpoint: {
              type: "string",
              description: "API endpoint path"
            }
          },
          required: ["endpoint"],
          additionalProperties: false
        }
      }
    ]
  };
});

// ツール呼び出しハンドラー
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "test_api") {
    try {
      const response = await fetch(`http://localhost:3000${args.endpoint}`);
      const data = await response.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              endpoint: args.endpoint,
              status: response.status,
              success: response.ok,
              data: data
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ]
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Simple MCP Server started");
}

main().catch(console.error);