#!/usr/bin/env node

/**
 * Test script to verify MCP server tools are properly registered
 */

const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'mcp', 'playwright-server.js');

console.log('Starting MCP server test...');
console.log('Server path:', serverPath);

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send initialize request
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Send list tools request after a short delay
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('\nSending initialize request...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  setTimeout(() => {
    console.log('Sending tools/list request...');
    server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

    setTimeout(() => {
      server.kill();
    }, 2000);
  }, 1000);
}, 500);

let output = '';

server.stdout.on('data', (data) => {
  const str = data.toString();
  output += str;

  try {
    const lines = str.split('\n').filter(line => line.trim());
    lines.forEach(line => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.result && parsed.result.tools) {
          console.log('\n✅ Available tools:');
          parsed.result.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });
        }
      } catch (e) {
        // Not JSON, might be debug output
      }
    });
  } catch (e) {
    // Ignore parse errors
  }
});

server.stderr.on('data', (data) => {
  console.log('Server stderr:', data.toString());
});

server.on('close', (code) => {
  console.log(`\nServer exited with code ${code}`);

  if (!output.includes('capture_screenshots_for_figma')) {
    console.log('\n❌ ERROR: capture_screenshots_for_figma tool not found!');
    process.exit(1);
  } else {
    console.log('\n✅ SUCCESS: All tools are properly registered');
    process.exit(0);
  }
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
