#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

// Create an MCP server
const server = new McpServer({
  name: "mued-working",
  version: "1.0.0"
});

// Test health - パラメータなし
server.registerTool(
  "test_health",
  {
    title: "Health Check",
    description: "Test if server is running"
  },
  async () => {
    try {
      const response = await fetch("http://localhost:3000");
      return {
        content: [{
          type: "text",
          text: `Server is ${response.ok ? "UP" : "DOWN"} (Status: ${response.status})`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Server is DOWN: ${error.message}`
        }]
      };
    }
  }
);

// Test API - パラメータあり（オブジェクトで渡す）
server.registerTool(
  "test_api",
  {
    title: "API Test",
    description: "Test API endpoint",
    inputSchema: {
      endpoint: {
        type: "string",
        description: "API endpoint to test"
      }
    }
  },
  async (params) => {
    // paramsはオブジェクトとして渡される
    const endpoint = params.endpoint || '/api/lessons';

    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      const data = await response.json();

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            endpoint: endpoint,
            status: response.status,
            success: response.ok,
            data: data
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error testing ${endpoint}: ${error.message}`
        }]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Working MCP Test Server started");
}

main().catch(console.error);