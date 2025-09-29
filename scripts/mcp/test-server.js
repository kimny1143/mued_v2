#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

// Create an MCP server
const server = new McpServer({
  name: "mued-test",
  version: "1.0.0"
});

// Add health check tool
server.registerTool(
  "test_health",
  {
    title: "Health Check",
    description: "Test if MUED LMS server is running",
    inputSchema: {}  // パラメータなし
  },
  async () => {
    try {
      const response = await fetch("http://localhost:3000");
      return {
        content: [
          {
            type: "text",
            text: `Server is ${response.ok ? "UP" : "DOWN"} (Status: ${response.status})`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Server is DOWN: ${error.message}`
          }
        ]
      };
    }
  }
);

// Add API test tool
server.registerTool(
  "test_api",
  {
    title: "API Test",
    description: "Test specific API endpoint",
    inputSchema: {
      endpoint: z.string().describe("API endpoint to test (e.g., /api/lessons)")
    }
  },
  async ({ endpoint }) => {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      const data = await response.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              endpoint: endpoint,
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
            text: `Error testing ${endpoint}: ${error.message}`
          }
        ]
      };
    }
  }
);

// Add booking test tool
server.registerTool(
  "test_booking",
  {
    title: "Booking Test",
    description: "Test the booking flow",
    inputSchema: {
      slotId: z.string().optional().describe("Slot ID to book (optional, will fetch available slots if not provided)")
    }
  },
  async ({ slotId }) => {
    try {
      // First get available slots if no slotId provided
      if (!slotId) {
        const slotsRes = await fetch("http://localhost:3000/api/lessons?available=true");
        const slots = await slotsRes.json();

        if (!slots.success || !slots.data || slots.data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No available slots found"
              }
            ]
          };
        }

        slotId = slots.data[0].id;
      }

      // Try to create a reservation
      const reservationRes = await fetch("http://localhost:3000/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          lessonSlotId: slotId,
          studentId: "test_student"
        })
      });

      const reservation = await reservationRes.json();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              action: "Create reservation",
              success: reservationRes.ok,
              data: reservation
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Booking test failed: ${error.message}`
          }
        ]
      };
    }
  }
);

// Add full test suite tool
server.registerTool(
  "run_test_suite",
  {
    title: "Run Test Suite",
    description: "Run full test suite for MUED LMS",
    inputSchema: {}  // パラメータなし
  },
  async () => {
    const results = [];

    // 1. Health Check
    try {
      const healthRes = await fetch("http://localhost:3000");
      results.push({
        test: "Health Check",
        success: healthRes.ok,
        status: healthRes.status
      });
    } catch (error) {
      results.push({
        test: "Health Check",
        success: false,
        error: error.message
      });
    }

    // 2. API Test
    try {
      const apiRes = await fetch("http://localhost:3000/api/lessons");
      const apiData = await apiRes.json();
      results.push({
        test: "API Test (/api/lessons)",
        success: apiRes.ok,
        status: apiRes.status,
        dataReceived: !!apiData
      });
    } catch (error) {
      results.push({
        test: "API Test",
        success: false,
        error: error.message
      });
    }

    // 3. Database Connectivity
    try {
      const dbRes = await fetch("http://localhost:3000/api/health/db");
      results.push({
        test: "Database Connectivity",
        success: dbRes.ok,
        status: dbRes.status
      });
    } catch (error) {
      results.push({
        test: "Database Connectivity",
        success: false,
        error: "Database check endpoint not available"
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            timestamp: new Date().toISOString(),
            results: results,
            summary: {
              total: results.length,
              passed: results.filter(r => r.success).length,
              failed: results.filter(r => !r.success).length
            }
          }, null, 2)
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Test Server started successfully");
}

main().catch(console.error);