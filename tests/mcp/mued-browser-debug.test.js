#!/usr/bin/env node
/**
 * Test suite for mued-browser-debug MCP server
 *
 * Tests the browser debugging and error detection capabilities
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const MCP_SERVER_PATH = path.join(PROJECT_ROOT, 'scripts/mcp/mued-browser-debug.js');

// Test server to simulate various error conditions
class TestServer {
  constructor(port = 3999) {
    this.port = port;
    this.server = null;
  }

  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        const url = req.url;

        // CORS headers for API testing
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Test routes
        if (url === '/normal') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Normal Page</title></head>
              <body>
                <h1>Normal Page</h1>
                <script>
                  console.log('Page loaded successfully');
                </script>
              </body>
            </html>
          `);
        } else if (url === '/console-error') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Console Error Page</title></head>
              <body>
                <h1>Console Error Test</h1>
                <script>
                  console.error('This is a test error');
                  console.warn('This is a warning');
                  console.log('Normal log message');
                </script>
              </body>
            </html>
          `);
        } else if (url === '/runtime-error') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Runtime Error Page</title></head>
              <body>
                <h1>Runtime Error Test</h1>
                <script>
                  const obj = undefined;
                  // This will throw: Cannot read properties of undefined
                  const value = obj.property.length;
                </script>
              </body>
            </html>
          `);
        } else if (url === '/network-error') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Network Error Page</title></head>
              <body>
                <h1>Network Error Test</h1>
                <script>
                  fetch('http://localhost:9999/nonexistent-api')
                    .then(res => res.json())
                    .catch(err => console.error('Network error:', err));
                </script>
              </body>
            </html>
          `);
        } else if (url === '/api/test') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Test API response',
            timestamp: new Date().toISOString()
          }));
        } else if (url === '/api-test') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>API Test Page</title></head>
              <body>
                <h1>API Test</h1>
                <script>
                  fetch('/api/test')
                    .then(res => res.json())
                    .then(data => console.log('API response:', data));
                </script>
              </body>
            </html>
          `);
        } else if (url === '/timeout') {
          // Simulate a slow page that causes timeout
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end('<html><body>Timeout test</body></html>');
          }, 35000); // Longer than typical timeout
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html' });
          res.end('<html><body>404 Not Found</body></html>');
        }
      });

      this.server.listen(this.port, () => {
        console.log(`Test server listening on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Test server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// MCP Client for testing
class MCPTestClient {
  constructor() {
    this.process = null;
    this.messageId = 0;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', [MCP_SERVER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Wait for server to be ready
      this.process.stderr.once('data', (data) => {
        const message = data.toString();
        if (message.includes('started successfully')) {
          resolve();
        }
      });

      this.process.on('error', reject);

      // Capture stdout for responses
      this.process.stdout.on('data', (data) => {
        try {
          const lines = data.toString().split('\n').filter(line => line.trim());
          lines.forEach(line => {
            if (line.startsWith('{')) {
              const response = JSON.parse(line);
              if (this.responseHandler) {
                this.responseHandler(response);
              }
            }
          });
        } catch (error) {
          console.error('Failed to parse response:', error);
        }
      });
    });
  }

  async stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  async callTool(toolName, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const request = {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: toolName,
          arguments: params
        },
        id
      };

      this.responseHandler = (response) => {
        if (response.id === id) {
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
          this.responseHandler = null;
        }
      };

      this.process.stdin.write(JSON.stringify(request) + '\n');

      // Timeout after 35 seconds
      setTimeout(() => {
        if (this.responseHandler) {
          this.responseHandler = null;
          reject(new Error('Request timeout'));
        }
      }, 35000);
    });
  }
}

// Test runner
async function runTests() {
  const testServer = new TestServer();
  const mcpClient = new MCPTestClient();
  let testsPassed = 0;
  let testsFailed = 0;

  console.log('\n🧪 Starting mued-browser-debug MCP server tests...\n');

  try {
    // Start test server
    await testServer.start();

    // Start MCP server
    console.log('Starting MCP server...');
    await mcpClient.start();
    console.log('MCP server started successfully\n');

    // Test 1: Normal page (no errors)
    console.log('Test 1: Normal page (no errors)');
    try {
      const result = await mcpClient.callTool('debug_page', {
        url: 'http://localhost:3999',
        path: '/normal'
      });
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.success && parsed.errors.length === 0) {
        console.log('✅ Test 1 passed: No errors detected on normal page\n');
        testsPassed++;
      } else {
        console.log('❌ Test 1 failed: Expected no errors\n');
        testsFailed++;
      }
    } catch (error) {
      console.log(`❌ Test 1 failed: ${error.message}\n`);
      testsFailed++;
    }

    // Test 2: Console error page
    console.log('Test 2: Console error detection');
    try {
      const result = await mcpClient.callTool('debug_page', {
        url: 'http://localhost:3999',
        path: '/console-error'
      });
      const parsed = JSON.parse(result.content[0].text);
      if (!parsed.success && parsed.errors.length > 0) {
        console.log('✅ Test 2 passed: Console errors detected\n');
        testsPassed++;
      } else {
        console.log('❌ Test 2 failed: Expected console errors\n');
        testsFailed++;
      }
    } catch (error) {
      console.log(`❌ Test 2 failed: ${error.message}\n`);
      testsFailed++;
    }

    // Test 3: Runtime error page
    console.log('Test 3: Runtime error detection');
    try {
      const result = await mcpClient.callTool('debug_page', {
        url: 'http://localhost:3999',
        path: '/runtime-error'
      });
      const parsed = JSON.parse(result.content[0].text);
      const hasRuntimeError = parsed.errors.some(e =>
        e.message.includes('Cannot read properties of undefined')
      );
      if (!parsed.success && hasRuntimeError) {
        console.log('✅ Test 3 passed: Runtime error detected\n');
        testsPassed++;
      } else {
        console.log('❌ Test 3 failed: Expected runtime error\n');
        testsFailed++;
      }
    } catch (error) {
      console.log(`❌ Test 3 failed: ${error.message}\n`);
      testsFailed++;
    }

    // Test 4: API response capture
    console.log('Test 4: API response capture');
    try {
      const result = await mcpClient.callTool('capture_api_response', {
        url: 'http://localhost:3999/api-test',
        apiPattern: '**/api/**'
      });
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.capturedCount > 0 && parsed.requests[0].responseBody.success) {
        console.log('✅ Test 4 passed: API response captured\n');
        testsPassed++;
      } else {
        console.log('❌ Test 4 failed: Expected API response capture\n');
        testsFailed++;
      }
    } catch (error) {
      console.log(`❌ Test 4 failed: ${error.message}\n`);
      testsFailed++;
    }

    // Test 5: Console error check only
    console.log('Test 5: Console error check only');
    try {
      const result = await mcpClient.callTool('check_console_errors', {
        url: 'http://localhost:3999/console-error'
      });
      const parsed = JSON.parse(result.content[0].text);
      if (parsed.hasErrors && parsed.errorCount > 0 && parsed.warningCount > 0) {
        console.log('✅ Test 5 passed: Console errors and warnings detected\n');
        testsPassed++;
      } else {
        console.log('❌ Test 5 failed: Expected console errors and warnings\n');
        testsFailed++;
      }
    } catch (error) {
      console.log(`❌ Test 5 failed: ${error.message}\n`);
      testsFailed++;
    }

    // Test 6: 404 page
    console.log('Test 6: 404 error page');
    try {
      const result = await mcpClient.callTool('debug_page', {
        url: 'http://localhost:3999',
        path: '/nonexistent'
      });
      const parsed = JSON.parse(result.content[0].text);
      // 404 page loads successfully but might have network request marked as 404
      const has404 = parsed.networkRequests.some(r => r.status === 404);
      if (has404 || parsed.success) {
        console.log('✅ Test 6 passed: 404 page handled\n');
        testsPassed++;
      } else {
        console.log('❌ Test 6 failed: Expected 404 handling\n');
        testsFailed++;
      }
    } catch (error) {
      console.log(`❌ Test 6 failed: ${error.message}\n`);
      testsFailed++;
    }

  } catch (error) {
    console.error('Test setup failed:', error);
  } finally {
    // Cleanup
    await mcpClient.stop();
    await testServer.stop();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Total: ${testsPassed + testsFailed}`);
    console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50) + '\n');

    // Exit with appropriate code
    process.exit(testsFailed > 0 ? 1 : 0);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };