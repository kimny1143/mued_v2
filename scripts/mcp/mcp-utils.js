#!/usr/bin/env node
/**
 * MCP Server Shared Utilities
 *
 * Common utilities for all MUED MCP servers.
 * Extracted to reduce code duplication and ensure consistency.
 *
 * @module scripts/mcp/mcp-utils
 */

const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs").promises;
const path = require("path");

const execAsync = promisify(exec);

// ========================================
// Constants
// ========================================

/**
 * Project root directory (two levels up from /scripts/mcp/)
 */
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Default buffer size for exec commands (10MB)
 */
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Default timeout for commands (3 minutes)
 */
const DEFAULT_TIMEOUT = 180000;

// ========================================
// Timestamp & Directory Utilities
// ========================================

/**
 * Generate ISO timestamp for report filenames
 * Format: YYYY-MM-DDTHH-MM-SS (safe for filenames)
 *
 * @returns {string} Timestamp string
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

/**
 * Ensure the reports directory exists
 * Creates /tests/reports if it doesn't exist
 *
 * @returns {Promise<string>} Path to reports directory
 */
async function ensureReportsDir() {
  const reportsDir = path.join(PROJECT_ROOT, 'tests', 'reports');
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    console.error(`Failed to create reports directory: ${error.message}`);
  }
  return reportsDir;
}

// ========================================
// Command Execution Utilities
// ========================================

/**
 * Execute a shell command with proper error handling
 *
 * @param {string} command - Command to execute
 * @param {Object} options - Execution options
 * @param {string} [options.cwd] - Working directory (default: PROJECT_ROOT)
 * @param {Object} [options.env] - Environment variables
 * @param {number} [options.maxBuffer] - Max buffer size (default: 10MB)
 * @param {number} [options.timeout] - Timeout in ms (default: 180000)
 * @returns {Promise<{stdout: string, stderr: string, success: boolean}>}
 */
async function executeCommand(command, options = {}) {
  const execOptions = {
    cwd: options.cwd || PROJECT_ROOT,
    env: { ...process.env, ...options.env },
    maxBuffer: options.maxBuffer || DEFAULT_MAX_BUFFER,
    timeout: options.timeout || DEFAULT_TIMEOUT
  };

  try {
    const { stdout, stderr } = await execAsync(command, execOptions);
    return {
      stdout: stdout || '',
      stderr: stderr || '',
      success: true
    };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      success: false,
      error: error.message
    };
  }
}

// ========================================
// MCP Server Utilities
// ========================================

/**
 * Create and configure an MCP server
 *
 * @param {string} name - Server name
 * @param {string} [version='1.0.0'] - Server version
 * @returns {McpServer} Configured MCP server instance
 */
function createMcpServer(name, version = '1.0.0') {
  return new McpServer({ name, version });
}

/**
 * Start an MCP server with stdio transport
 *
 * @param {McpServer} server - MCP server instance
 * @param {string} [serverName] - Optional name for logging
 * @returns {Promise<void>}
 */
async function startMcpServer(server, serverName = 'MCP Server') {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${serverName} started successfully`);
}

// ========================================
// Markdown Report Utilities
// ========================================

/**
 * Create a markdown table from data
 *
 * @param {string[]} headers - Table headers
 * @param {string[][]} rows - Table rows
 * @returns {string} Markdown table string
 */
function createMarkdownTable(headers, rows) {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `|${headers.map(() => '------').join('|')}|`;
  const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');

  return `${headerRow}\n${separatorRow}\n${dataRows}`;
}

/**
 * Format duration from milliseconds to readable string
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "2.50s")
 */
function formatDuration(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Create a formatted MCP text response
 *
 * @param {string} text - Response text (markdown)
 * @returns {Object} MCP content response object
 */
function createTextResponse(text) {
  return {
    content: [
      {
        type: "text",
        text
      }
    ]
  };
}

/**
 * Write a markdown report to file
 *
 * @param {string} markdown - Markdown content
 * @param {string} filename - Filename (without path)
 * @returns {Promise<string|null>} Full path to written file, or null on error
 */
async function writeMarkdownReport(markdown, filename) {
  const reportsDir = await ensureReportsDir();
  const reportPath = path.join(reportsDir, filename);

  try {
    await fs.writeFile(reportPath, markdown, 'utf-8');
    return reportPath;
  } catch (error) {
    console.error(`Failed to write markdown report: ${error.message}`);
    return null;
  }
}

// ========================================
// Environment Utilities
// ========================================

/**
 * Load environment variables without breaking MCP JSON protocol
 * Suppresses dotenv console output that can corrupt JSON-RPC
 *
 * @param {string} envPath - Path to .env file
 */
function loadEnvSilently(envPath) {
  const originalStderrWrite = process.stderr.write;
  const originalStdoutWrite = process.stdout.write;

  process.stderr.write = () => {};
  process.stdout.write = (chunk, encoding, callback) => {
    // Only allow MCP JSON messages through
    if (typeof chunk === 'string' && chunk.startsWith('{"jsonrpc":')) {
      return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
    }
    return true;
  };

  try {
    require("dotenv").config({ path: envPath });
  } finally {
    process.stderr.write = originalStderrWrite;
    process.stdout.write = originalStdoutWrite;
  }
}

// ========================================
// Exports
// ========================================

module.exports = {
  // Constants
  PROJECT_ROOT,
  DEFAULT_MAX_BUFFER,
  DEFAULT_TIMEOUT,

  // Timestamp & Directory
  getTimestamp,
  ensureReportsDir,

  // Command Execution
  executeCommand,
  execAsync,

  // MCP Server
  createMcpServer,
  startMcpServer,

  // Markdown Report
  createMarkdownTable,
  formatDuration,
  createTextResponse,
  writeMarkdownReport,

  // Environment
  loadEnvSilently,

  // Re-export for convenience
  fs,
  path
};
