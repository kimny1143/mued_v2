#!/usr/bin/env node

/**
 * Test script to verify MCP server functionality
 * Run this to ensure the MCP server is working with the refactored components
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing MCP Playwright Server v2.0...\n');

// Path to the MCP server
const serverPath = path.join(__dirname, 'mcp', 'playwright-server.js');

// Spawn the MCP server process
const mcpServer = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let outputBuffer = '';

// Handle server output
mcpServer.stdout.on('data', (data) => {
  outputBuffer += data.toString();
  console.log('📤 Server Output:', data.toString());
});

mcpServer.stderr.on('data', (data) => {
  console.log('ℹ️  Server Info:', data.toString());
});

mcpServer.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

mcpServer.on('close', (code) => {
  console.log(`\n✅ MCP Server test completed with code ${code}`);
  process.exit(code);
});

// Send a simple initialization request to test the connection
setTimeout(() => {
  console.log('\n📨 Sending initialization request...');

  const initRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {}
    },
    id: 1
  }) + '\n';

  mcpServer.stdin.write(initRequest);

  // Give server time to respond then close
  setTimeout(() => {
    console.log('\n🔌 Closing test connection...');
    mcpServer.stdin.end();
  }, 2000);
}, 1000);

console.log(`
📋 MCP Server Test Information:
--------------------------------
Server Path: ${serverPath}
Version: 2.0.0
Features:
  ✓ test_user_flow - Complete user flow testing
  ✓ test_refactored_components - Test new component structure
  ✓ capture_screenshots_for_figma - Capture UI for design docs
  ✓ run_e2e_test - Run specific E2E tests

🚀 To use in Claude Desktop:
1. Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "mued-playwright": {
      "command": "node",
      "args": ["${serverPath.replace(/\\/g, '/')}"]
    }
  }
}

2. Restart Claude Desktop
3. Use commands like:
   - "Run the user flow test"
   - "Test the refactored components"
   - "Capture screenshots for Figma"
`);